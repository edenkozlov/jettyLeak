import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import useAuth from '@/hooks/auth/useAuth'
import {
  GET_SENSORS,
  GET_SENSORS_BY_CLIENT_ID,
} from '@/queries/getSensors'
import BetaPill from '@/components/BetaPill'
import { getSignalsForSensors, type SignalRow } from '@/queries/getSignalsForSensors'
import { parseSignalValue, type SignalValue } from '@/types/signal'
import { displayFixtureType } from '@/hooks/useBuildingFixtures'
import { formatRelative } from '@/utils/formatVolume'

// ─────────────────────────────────────────────────────────────────────────────
// Shape of a normalized activity event
// ─────────────────────────────────────────────────────────────────────────────

interface SensorRow {
  id: number
  name: string | null
  building_id: number | null
  building?: {
    id: number
    name: string | null
    full_address: string | null
    client_id: string | null
  } | null
}

interface ActivityEvent {
  id: number
  sensorId: number
  sensorName: string | null
  buildingId: number | null
  buildingName: string
  /** Display label from signal.signal_type — always β (classifier-derived). */
  type: string
  startIso: string
  durationS: number
  readings: number
  /** Cosine distance from the classifier: lower = more confident. */
  confidence: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function confidenceBucket(d: number | null): 'high' | 'medium' | 'low' | 'unknown' {
  if (d == null || !Number.isFinite(d)) return 'unknown'
  if (d < 0.08) return 'high'
  if (d < 0.15) return 'medium'
  return 'low'
}

function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return '—'
  if (totalSec < 60) return `${totalSec.toFixed(0)}s`
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

const CONF_PILL: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  unknown: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const TYPE_DOT: Record<string, string> = {
  Toilet: 'bg-sky-500',
  Sink: 'bg-teal-500',
  Urinal: 'bg-indigo-500',
  Shower: 'bg-cyan-500',
  Dishwasher: 'bg-emerald-500',
  Washer: 'bg-purple-500',
  Faucet: 'bg-amber-500',
  'Main line': 'bg-rose-500',
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

type Range = '24h' | '7d' | '30d'

const RANGE_MS: Record<Range, number> = {
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
}

export default function Activity() {
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const [sensors, setSensors] = useState<SensorRow[]>([])
  const [signals, setSignals] = useState<SignalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [range, setRange] = useState<Range>('7d')
  const [buildingFilter, setBuildingFilter] = useState<number | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Fetch sensors (scoped to client when applicable)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const loader = isClient
      ? GET_SENSORS_BY_CLIENT_ID({ clientId: client_id })
      : GET_SENSORS()

    loader
      .then((res: any) => {
        if (cancelled) return
        setSensors((res?.sensor ?? []) as SensorRow[])
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [isClient, client_id])

  // Fetch signals whenever the sensor set or range changes
  useEffect(() => {
    if (sensors.length === 0) {
      setSignals([])
      return
    }
    let cancelled = false
    const sensorIds = sensors.map((s) => s.id)
    const sinceMs = Date.now() - RANGE_MS[range]
    getSignalsForSensors(sensorIds, sinceMs, 3000)
      .then((rows) => {
        if (!cancelled) setSignals(rows)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? String(e))
      })
    return () => { cancelled = true }
  }, [sensors, range])

  const sensorById = useMemo(() => {
    const m = new Map<number, SensorRow>()
    for (const s of sensors) m.set(s.id, s)
    return m
  }, [sensors])

  const events = useMemo<ActivityEvent[]>(() => {
    const out: ActivityEvent[] = []
    for (const sig of signals) {
      const sensor = sensorById.get(sig.sensor_id)
      const parsed: SignalValue | null = parseSignalValue(sig.value)
      const type = displayFixtureType(parsed?.signal_type?.toString() ?? null)
      out.push({
        id: sig.id,
        sensorId: sig.sensor_id,
        sensorName: sensor?.name ?? null,
        buildingId: sensor?.building?.id ?? sensor?.building_id ?? null,
        buildingName:
          sensor?.building?.name ||
          sensor?.building?.full_address ||
          (sensor?.building?.id ? `Building #${sensor.building.id}` : '—'),
        type,
        startIso: sig.start_time ?? sig.created_at,
        durationS: Number(parsed?.duration_s ?? 0),
        readings: Number(parsed?.readings ?? 0),
        confidence: typeof parsed?.cosine_distance === 'number'
          ? parsed.cosine_distance
          : null,
      })
    }
    out.sort((a, b) => Date.parse(b.startIso) - Date.parse(a.startIso))
    return out
  }, [signals, sensorById])

  const buildingsInData = useMemo(() => {
    const m = new Map<number, string>()
    for (const e of events) {
      if (e.buildingId != null && !m.has(e.buildingId)) {
        m.set(e.buildingId, e.buildingName)
      }
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [events])

  const typesInData = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) s.add(e.type)
    return Array.from(s).sort()
  }, [events])

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (buildingFilter !== 'all' && e.buildingId !== buildingFilter) return false
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      return true
    })
  }, [events, buildingFilter, typeFilter])

  // Quick counts for the top strip
  const totals = useMemo(() => {
    let totalDuration = 0
    let highConf = 0
    for (const e of filtered) {
      totalDuration += e.durationS
      if (confidenceBucket(e.confidence) === 'high') highConf++
    }
    return {
      count: filtered.length,
      durationS: totalDuration,
      highConfPct: filtered.length > 0 ? Math.round((highConf / filtered.length) * 100) : 0,
    }
  }, [filtered])

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Activity
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Every classified fixture use across your portfolio, newest first.
          </p>
        </div>

        {/* Range picker */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900">
          {(['24h', '7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                range === r
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Last {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Top stats strip */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Events in range
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {totals.count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Total active time
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {formatDuration(totals.durationS)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            High-confidence classifications
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {totals.highConfPct}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={buildingFilter}
          onChange={(e) =>
            setBuildingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All buildings</option>
          {buildingsInData.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All types</option>
          {typesInData.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Event list */}
      {loading && filtered.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-16 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          No activity in this range.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filtered.slice(0, 250).map((e) => {
              const bucket = confidenceBucket(e.confidence)
              const dot = TYPE_DOT[e.type] ?? 'bg-gray-400'
              return (
                <li key={e.id}>
                  <Link
                    to={`/dashboard/reports/${e.sensorId}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                        {e.type}
                        <BetaPill title="Type inferred by the ML classifier from the signal waveform — experimental." />
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {e.buildingName} · {e.sensorName ?? `Sensor #${e.sensorId}`}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right text-xs text-gray-500 dark:text-gray-400 sm:block">
                      <p className="tabular-nums text-gray-700 dark:text-gray-300">
                        {formatDuration(e.durationS)}
                      </p>
                      <p>{e.readings.toLocaleString()} readings</p>
                    </div>
                    <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase sm:inline ${CONF_PILL[bucket]}`}>
                      {bucket}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-gray-400 tabular-nums">
                      {formatRelative(e.startIso)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {filtered.length > 250 && (
            <div className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400 dark:border-gray-700/50">
              Showing the 250 most recent events. Narrow the range or filters to see more.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
