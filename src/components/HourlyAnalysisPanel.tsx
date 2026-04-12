import { useEffect, useMemo, useState } from 'react'

import {
  getHourlyAnalysesBySensor,
  type HourlyAnalysis,
} from '@/queries/getHourlyAnalyses'

interface HourlyAnalysisPanelProps {
  sensorId: number | null
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  const diffMs = Date.now() - ts
  if (diffMs < 60_000) return 'just now'
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function HourlyAnalysisPanel({ sensorId }: HourlyAnalysisPanelProps) {
  const [items, setItems] = useState<HourlyAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (sensorId == null) {
      setItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getHourlyAnalysesBySensor(sensorId)
      .then((rows) => {
        if (cancelled) return
        setItems(rows)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[HourlyAnalysisPanel] fetch failed', err)
        setError('Failed to load analyses')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sensorId])

  const latest = items[0] ?? null
  const isLatestAlert = latest?.is_alert === true

  const cardCount = useMemo(
    () => items.filter((i) => i.description || i.is_alert).length,
    [items],
  )

  if (sensorId == null) return null

  if (loading && items.length === 0) {
    return (
      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        Loading analysis…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-[11px] text-red-500 dark:text-red-400">{error}</div>
    )
  }

  if (!latest) {
    return (
      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        No analysis yet
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group flex max-w-sm items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
          isLatestAlert
            ? 'border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30'
            : 'border-gray-200 bg-white hover:border-indigo-400 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-indigo-500'
        }`}
        title="View analysis history"
      >
        <span
          className={`mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full ${
            isLatestAlert ? 'bg-red-500' : 'bg-emerald-500'
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                isLatestAlert
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {isLatestAlert ? 'Alert' : 'Latest analysis'}
            </p>
            <p className="whitespace-nowrap text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
              {formatRelative(latest.created_at)}
            </p>
          </div>
          {latest.description ? (
            <p
              className={`mt-0.5 line-clamp-2 text-xs ${
                isLatestAlert
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {latest.description}
            </p>
          ) : (
            <p className="mt-0.5 text-xs italic text-gray-400 dark:text-gray-500">
              No description
            </p>
          )}
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full max-h-[min(94vh,100dvh)] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                  Hourly analysis history
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {items.length} entr{items.length === 1 ? 'y' : 'ies'}
                  {cardCount !== items.length ? ` · ${cardCount} with content` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  No analyses recorded for this sensor yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {items.map((entry) => {
                    const isAlert = entry.is_alert === true
                    return (
                      <li
                        key={entry.id}
                        className={`rounded-xl border p-4 transition-shadow ${
                          isAlert
                            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {isAlert && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                                </span>
                                Alert
                              </span>
                            )}
                            <p
                              className={`text-xs font-medium ${
                                isAlert
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {formatAbsolute(entry.created_at)}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                            {formatRelative(entry.created_at)}
                          </p>
                        </div>
                        {entry.description ? (
                          <p
                            className={`whitespace-pre-wrap text-sm leading-relaxed ${
                              isAlert
                                ? 'text-red-900 dark:text-red-100'
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {entry.description}
                          </p>
                        ) : (
                          <p className="text-sm italic text-gray-400 dark:text-gray-500">
                            No description
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
