import { useCallback, useEffect, useState } from 'react'

import {
  getFixturesByBuilding,
  type Fixture,
} from '@/queries/getFixturesByBuilding'
import { createCalibrationLabels } from '@/queries/createCalibrationLabel'

interface Signal {
  startMs: number
  endMs: number
  label: string
  color: string
}

const DETECTOR_URL =
  import.meta.env.VITE_DETECTOR_ENDPOINT || 'http://localhost:8000'

interface CalibrationLabelModalProps {
  signal: Signal
  buildingId: number
  onClose: () => void
  onSaved?: () => void
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function fixtureLabel(f: Fixture): string {
  const parts: string[] = []
  if (f.name) parts.push(f.name)
  if (f.type) parts.push(f.type)
  if (f.floor_number != null) parts.push(`Floor ${f.floor_number}`)
  return parts.length > 0 ? parts.join(' · ') : `Fixture #${f.id}`
}

export default function CalibrationLabelModal({
  signal,
  buildingId,
  onClose,
  onSaved,
}: CalibrationLabelModalProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFixturesByBuilding(buildingId)
      .then((rows) => {
        if (cancelled) return
        setFixtures(rows)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[CalibrationLabelModal] fetch fixtures failed', err)
        setError('Failed to load fixtures')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [buildingId])

  const toggleFixture = useCallback((id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index === 0) return
    setSelected((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
      return next
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setSelected((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
      return next
    })
  }, [])

  const removeAt = useCallback((index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = async () => {
    if (selected.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await createCalibrationLabels({
        startTime: new Date(signal.startMs).toISOString(),
        endTime: new Date(signal.endMs).toISOString(),
        fixtures: selected.map((fixtureId, i) => ({
          fixtureId,
          ordering: i + 1,
        })),
      })
      // Trigger detector to reload calibration signals + rebuild embeddings
      fetch(`${DETECTOR_URL}/admin/reload-calibration`, {
        method: 'POST',
      }).catch((err) => console.warn('[CalibrationLabel] detector reload failed', err))
      setSaved(true)
      onSaved?.()
    } catch (err) {
      console.warn('[CalibrationLabelModal] save failed', err)
      setError('Failed to save labels')
    } finally {
      setSaving(false)
    }
  }

  const durationSec = ((signal.endMs - signal.startMs) / 1000).toFixed(1)
  const fixtureMap = new Map(fixtures.map((f) => [f.id, f]))
  const unselected = fixtures.filter((f) => !selected.includes(f.id))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(94vh,100dvh)] w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Label this signal
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Assign one or more fixtures in order
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Signal info */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: signal.color }}
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Detected signal
              </span>
            </div>
            <p className="whitespace-pre-line text-xs text-gray-600 dark:text-gray-300">
              {signal.label}
            </p>
            <div className="mt-2 flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span>{formatTime(signal.startMs)}</span>
              <span>→</span>
              <span>{formatTime(signal.endMs)}</span>
              <span className="text-gray-400">({durationSec}s)</span>
            </div>
          </div>

          {saved ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <span className="text-2xl">✓</span>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {selected.length} calibration label{selected.length !== 1 ? 's' : ''} saved
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-gray-400 dark:text-gray-500">
                Loading fixtures…
              </span>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No fixtures found for this building.
              </p>
            </div>
          ) : (
            <>
              {/* Selected fixtures (ordered) */}
              {selected.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Selected order ({selected.length})
                  </p>
                  <div className="space-y-1.5">
                    {selected.map((id, i) => {
                      const f = fixtureMap.get(id)
                      if (!f) return null
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50/60 px-3 py-2 dark:border-indigo-700 dark:bg-indigo-900/20"
                        >
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                            {fixtureLabel(f)}
                          </span>
                          <div className="flex flex-shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveUp(i)}
                              disabled={i === 0}
                              className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                              title="Move up"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDown(i)}
                              disabled={i === selected.length - 1}
                              className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                              title="Move down"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAt(i)}
                              className="ml-1 rounded p-0.5 text-gray-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                              title="Remove"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available fixtures */}
              {unselected.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {selected.length > 0 ? 'Add more fixtures' : 'Choose fixtures'}
                  </p>
                  <div className="max-h-[200px] space-y-1 overflow-y-auto">
                    {unselected.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFixture(f.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/10"
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300 text-[10px] text-gray-400 dark:border-gray-600">
                          +
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-gray-900 dark:text-white">
                            {fixtureLabel(f)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {!saved && fixtures.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selected.length === 0
                  ? 'Click fixtures to add them'
                  : `${selected.length} fixture${selected.length !== 1 ? 's' : ''} selected`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={selected.length === 0 || saving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : `Save ${selected.length > 0 ? selected.length : ''} label${selected.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
