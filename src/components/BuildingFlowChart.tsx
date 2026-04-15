import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  GET_FLOW_ANALYTICS,
  GET_MAG_DOWNSAMPLED,
  type DownsampledMagRow,
  type FlowHourlyRow,
} from '@/queries/getFlowAnalytics'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'

// ─────────────────────────────────────────────────────────────────────────────
// Unified flow/usage chart
//
// One chart, two modes (Flow rate / Usage) + time-interval selector.
// Two data sources, automatically picked by interval:
//
//   • 1m / 5m intervals  → mag_report.dominant_freq_hz (instantaneous cycles)
//                          L/min = dominant_freq_hz × 60 / sensor.multiplier
//
//   • 15m / 1h intervals → flow_hourly (pre-aggregated hourly volumes, reliable)
//                          L/min = volume_litres / 60 per hour row, split into buckets
//
// If the sub-hour source (dominant_freq_hz) is unavailable we auto-fall back to
// the hourly rollup and disable 1m/5m with a visible hint — the chart is never
// silently blank.
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'rate' | 'usage'
type Range = '1h' | '24h' | '7d'
type Interval = '1m' | '5m' | '15m' | '1h'

const RANGE_MS: Record<Range, number> = {
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
}

const INTERVAL_MS: Record<Interval, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
}

const DEFAULT_INTERVAL: Record<Range, Interval> = {
  '1h': '5m',
  '24h': '15m',
  '7d': '1h',
}

const ALLOWED_INTERVALS: Record<Range, Interval[]> = {
  '1h': ['1m', '5m'],
  '24h': ['1m', '5m', '15m', '1h'],
  '7d': ['15m', '1h'],
}

interface Bucket {
  timestamp: number
  lpm: number         // mean L/min in bucket
  volumeL: number     // total litres in bucket
  partial: boolean
}

interface Props {
  buildingId: number
}

export default function BuildingFlowChart({ buildingId }: Props) {
  const [mode, setMode] = useState<Mode>('rate')
  const [range, setRange] = useState<Range>('24h')
  const [interval, setInterval] = useState<Interval>(DEFAULT_INTERVAL['24h'])

  const [sensors, setSensors] = useState<Array<{ id: number; multiplier: number }>>([])

  // Two parallel data sources
  const [hourlyRows, setHourlyRows] = useState<FlowHourlyRow[]>([])
  const [magRows, setMagRows] = useState<DownsampledMagRow[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freqAvailable, setFreqAvailable] = useState(true)

  const useSubHour = interval === '1m' || interval === '5m'

  // Keep interval legal when range changes
  useEffect(() => {
    if (!ALLOWED_INTERVALS[range].includes(interval)) {
      setInterval(DEFAULT_INTERVAL[range])
    }
  }, [range, interval])

  // Fetch sensors (+ multipliers)
  useEffect(() => {
    let cancelled = false
    GET_SENSORS_BY_BUILDING_ID({ buildingId })
      .then((res: any) => {
        if (cancelled) return
        const withMult = ((res?.sensor ?? []) as Array<{ id: number; multiplier: number | string | null }>)
          .map((s) => ({
            id: s.id,
            multiplier: s.multiplier != null ? Number(s.multiplier) : 0,
          }))
          .filter((s) => s.multiplier > 0)
        setSensors(withMult)
      })
      .catch(() => {
        if (!cancelled) setSensors([])
      })
    return () => { cancelled = true }
  }, [buildingId])

  // Fetch data whenever sensors or range change. Always fetch hourly rows (the
  // reliable source); fetch mag rows too so we can serve sub-hour intervals if
  // dominant_freq_hz is available.
  useEffect(() => {
    if (sensors.length === 0) {
      setHourlyRows([])
      setMagRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    const rangeMs = RANGE_MS[range]
    const now = Date.now()
    const since = new Date(now - rangeMs).toISOString()
    const until = new Date(now).toISOString()
    const sensorIds = sensors.map((s) => s.id)

    Promise.all([
      GET_FLOW_ANALYTICS({ sensorIds, since, until }).catch(() => ({ rows: [] as FlowHourlyRow[] })),
      GET_MAG_DOWNSAMPLED({
        sensorIds,
        since,
        until,
        maxPoints: 1500,
      }).catch(() => ({ mag_report: [] as DownsampledMagRow[] })),
    ])
      .then(([hourlyRes, magRes]) => {
        if (cancelled) return
        const hRows = (hourlyRes?.rows ?? []) as FlowHourlyRow[]
        const mRows = (magRes?.mag_report ?? []) as DownsampledMagRow[]
        setHourlyRows(hRows)
        setMagRows(mRows)
        // Check if any mag row has a usable dominant_freq_hz
        const anyFreq = mRows.some(
          (r) => r.dominant_freq_hz != null && Number.isFinite(r.dominant_freq_hz) && r.dominant_freq_hz > 0,
        )
        setFreqAvailable(anyFreq)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [sensors, range])

  // If user is on 1m/5m but freq isn't available, auto-bump to 15m.
  useEffect(() => {
    if (!freqAvailable && useSubHour) setInterval('15m')
  }, [freqAvailable, useSubHour])

  // ───────────────────────────────────────────────────────────────────────
  // Bucket building
  // ───────────────────────────────────────────────────────────────────────

  const buckets = useMemo<Bucket[]>(() => {
    const bucketMs = INTERVAL_MS[interval]
    const nowMs = Date.now()
    const startMs = nowMs - RANGE_MS[range]
    const numBuckets = Math.max(1, Math.ceil((nowMs - startMs) / bucketMs))

    const bucketVolL = new Array<number>(numBuckets).fill(0)
    const bucketDtS = new Array<number>(numBuckets).fill(0)
    const bucketWeightedLpm = new Array<number>(numBuckets).fill(0)

    if (useSubHour && freqAvailable && magRows.length > 0) {
      // Source: dominant_freq_hz per sample
      const multiplierById = new Map(sensors.map((s) => [s.id, s.multiplier]))
      const samples: Array<{ t: number; lpm: number }> = []
      for (const r of magRows) {
        if (r.dominant_freq_hz == null) continue
        const mult = multiplierById.get(r.sensor_id)
        if (!mult) continue
        const t = new Date(r.created_at).getTime()
        if (t < startMs || t > nowMs) continue
        const lpm = (r.dominant_freq_hz * 60) / mult
        if (!Number.isFinite(lpm) || lpm < 0) continue
        samples.push({ t, lpm })
      }
      samples.sort((a, b) => a.t - b.t)

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i]!
        const next = samples[i + 1]
        const rawDt = next ? (next.t - s.t) / 1000 : 0
        const dt = Math.max(0, Math.min(rawDt, 120))
        if (dt <= 0) continue
        const vol = (s.lpm / 60) * dt
        const idx = Math.floor((s.t - startMs) / bucketMs)
        if (idx < 0 || idx >= numBuckets) continue
        bucketVolL[idx]! += vol
        bucketDtS[idx]! += dt
        bucketWeightedLpm[idx]! += s.lpm * dt
      }
    } else {
      // Source: flow_hourly — split each hour row proportionally across the buckets it overlaps
      for (const r of hourlyRows) {
        if (r.volume_litres <= 0) continue
        const hStart = new Date(r.hour_start).getTime()
        const hEnd = hStart + 3_600_000
        // Clip to visible range
        const clipStart = Math.max(hStart, startMs)
        const clipEnd = Math.min(hEnd, nowMs)
        if (clipEnd <= clipStart) continue

        // How much volume falls in the clipped portion of this hour row?
        const clipFrac = (clipEnd - clipStart) / 3_600_000
        const clipVol = r.volume_litres * clipFrac

        // Distribute clipVol over buckets in [clipStart, clipEnd]
        let cursor = clipStart
        while (cursor < clipEnd) {
          const bIdx = Math.floor((cursor - startMs) / bucketMs)
          if (bIdx < 0 || bIdx >= numBuckets) {
            cursor += bucketMs
            continue
          }
          const bStart = startMs + bIdx * bucketMs
          const bEnd = bStart + bucketMs
          const overlap = Math.max(0, Math.min(clipEnd, bEnd) - cursor)
          if (overlap <= 0) break
          const bucketShare = overlap / (clipEnd - clipStart)
          const addVol = clipVol * bucketShare
          bucketVolL[bIdx]! += addVol
          bucketDtS[bIdx]! += overlap / 1000
          cursor += overlap
        }
      }
      // For hourly-sourced buckets, compute L/min from the bucket's total volume over its duration
      for (let i = 0; i < numBuckets; i++) {
        const dt = bucketDtS[i]!
        if (dt > 0) {
          const lpm = (bucketVolL[i]! / dt) * 60
          bucketWeightedLpm[i] = lpm * dt
        }
      }
    }

    const out: Bucket[] = []
    for (let i = 0; i < numBuckets; i++) {
      const bStart = startMs + i * bucketMs
      const isPartial = bStart + bucketMs > nowMs
      const dt = bucketDtS[i]!
      const lpm = dt > 0 ? bucketWeightedLpm[i]! / dt : 0
      out.push({
        timestamp: bStart + bucketMs / 2,
        lpm: Math.round(lpm * 100) / 100,
        volumeL: Math.round(bucketVolL[i]! * 100) / 100,
        partial: isPartial,
      })
    }
    return out
  }, [hourlyRows, magRows, sensors, range, interval, useSubHour, freqAvailable])

  // Summary stats
  const totalL = useMemo(() => buckets.reduce((a, b) => a + b.volumeL, 0), [buckets])
  const peakLpm = useMemo(() => {
    let m = 0
    for (const b of buckets) if (b.lpm > m) m = b.lpm
    return m
  }, [buckets])

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────

  const isUsage = mode === 'usage'
  const dataKey: keyof Bucket = isUsage ? 'volumeL' : 'lpm'
  const yLabel = isUsage ? 'L' : 'L/min'
  const barColor = isUsage ? '#6366f1' : '#3b82f6'

  const hasAnyData = buckets.some((b) => b.volumeL > 0 || b.lpm > 0)
  const noSensorsConfigured = sensors.length === 0 && !loading

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isUsage ? 'Usage' : 'Flow rate'}
          </h2>
          <p className="mt-0.5 text-sm text-gray-400">
            {isUsage
              ? `${totalL.toFixed(1)} L across ${range} · ${interval} buckets · ${useSubHour && freqAvailable ? 'instantaneous' : 'hourly rollup'}`
              : `Peak ${peakLpm.toFixed(1)} L/min across ${range} · ${interval} buckets · ${useSubHour && freqAvailable ? 'instantaneous' : 'hourly rollup'}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-900">
            {(['rate', 'usage'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  mode === m
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {m === 'rate' ? 'Flow rate' : 'Usage'}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-900">
            {(['1h', '24h', '7d'] as Range[]).map((r) => (
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
                {r}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-900">
            {(['1m', '5m', '15m', '1h'] as Interval[]).map((iv) => {
              const allowed = ALLOWED_INTERVALS[range].includes(iv)
              const subHour = iv === '1m' || iv === '5m'
              const blockedByFreq = subHour && !freqAvailable
              const usable = allowed && !blockedByFreq
              return (
                <button
                  key={iv}
                  type="button"
                  disabled={!usable}
                  onClick={() => setInterval(iv)}
                  title={blockedByFreq ? 'Needs dominant_freq_hz on mag_report — not reporting yet' : undefined}
                  className={`rounded-md px-2.5 py-1.5 transition-colors ${
                    interval === iv
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                      : usable
                        ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        : 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {iv}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="h-[280px] w-full">
        {loading && buckets.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading…
          </div>
        ) : noSensorsConfigured ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
            <div>
              <p>No sensors with a calibrated multiplier for this building.</p>
              <p className="mt-1 text-sm">
                Configure <span className="font-mono">sensor.multiplier</span> (cycles per litre) to see flow data.
              </p>
            </div>
          </div>
        ) : !hasAnyData ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No flow recorded in this window.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-100 dark:text-gray-700/50"
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTick(range)}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={48}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => (v === 0 ? '' : v.toFixed(v < 10 ? 1 : 0))}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: '#6b7280' },
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]?.payload as Bucket | undefined
                  if (!p) return null
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">{formatTooltipTime(p.timestamp)}</p>
                      <p className="mt-1 font-semibold tabular-nums" style={{ color: barColor }}>
                        {isUsage ? `${p.volumeL.toFixed(2)} L` : `${p.lpm.toFixed(2)} L/min`}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-gray-400">
                        {isUsage ? `${p.lpm.toFixed(2)} L/min avg` : `${p.volumeL.toFixed(2)} L in bucket`}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey={dataKey as string} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {buckets.map((b, i) => (
                  <Cell
                    key={i}
                    fill={barColor}
                    fillOpacity={b.partial ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!freqAvailable && hasAnyData && (
        <p className="mt-2 text-[11px] text-gray-400">
          1m and 5m buckets are disabled because <span className="font-mono">dominant_freq_hz</span> isn't reporting on this building's sensors — showing hourly rollups instead.
        </p>
      )}
    </div>
  )
}

function formatTick(range: Range) {
  return (ts: number) => {
    const d = new Date(ts)
    if (range === '7d') {
      return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.getDate()
    }
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'p' : 'a'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
  }
}

function formatTooltipTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
