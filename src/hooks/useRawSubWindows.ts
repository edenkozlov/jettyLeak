import { useEffect, useMemo, useRef, useState } from 'react'

import { GET_MAG_DOWNSAMPLED } from '@/queries/getFlowAnalytics'
import type { MagReport } from '@/types'
import type { TimeRange } from '@/hooks/useReportsPage'

export interface SubWindowMagPoint {
  timestamp: number
  x: number | null
  y: number | null
  z: number | null
  total: number | null
  bandEnergy10s: number | null
  bandEnergy60s: number | null
  bandEnergy5m: number | null
}

export interface RawSubWindow {
  index: number
  sinceMs: number
  untilMs: number
  points: SubWindowMagPoint[]
}

export interface SharedYDomains {
  total: [number, number]
  x: [number, number]
  y: [number, number]
  z: [number, number]
  bandEnergy: [number, number]
}

interface UseRawSubWindowsParams {
  sensorId: number | null
  magSensorIds: number[]
  timeRange: TimeRange
  periodOffset: number
  enabled: boolean
  refetchKey: number
}

interface SubWindowConfig {
  count: number
  durationMs: number
}

const SUB_WINDOW_CONFIG: Partial<Record<TimeRange, SubWindowConfig>> = {
  '15m': { count: 3, durationMs: 5 * 60_000 },
  '1h': { count: 12, durationMs: 5 * 60_000 },
  '6h': { count: 6, durationMs: 60 * 60_000 },
  '12h': { count: 12, durationMs: 60 * 60_000 },
  '24h': { count: 24, durationMs: 60 * 60_000 },
}

export function getSubWindowConfig(range: TimeRange): SubWindowConfig | null {
  return SUB_WINDOW_CONFIG[range] ?? null
}

function magReportToPoint(r: MagReport): SubWindowMagPoint {
  return {
    timestamp: new Date(r.created_at).getTime(),
    x: r.x_axis_reading,
    y: r.y_axis_reading,
    z: r.z_axis_reading,
    total: r.total_magnitude,
    bandEnergy10s: r.band_energy_10s,
    bandEnergy60s: r.band_energy_60s,
    bandEnergy5m: r.band_energy_5m,
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]!
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]!
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo)
}

/**
 * Robust domain that ignores extreme outliers (single spikes from sensor errors).
 * Uses 1st/99th percentile instead of min/max so one huge value doesn't compress
 * the rest of the chart.
 */
function paddedDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1]
  if (values.length < 20) {
    let min = values[0]!
    let max = values[0]!
    for (const v of values) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const pad = Math.max((max - min) * 0.15, 0.05)
    return [min - pad, max + pad]
  }
  const sorted = [...values].sort((a, b) => a - b)
  const lo = quantile(sorted, 0.01)
  const hi = quantile(sorted, 0.99)
  const pad = Math.max((hi - lo) * 0.15, 0.05)
  return [lo - pad, hi + pad]
}

/**
 * Splits the active time window into N consecutive 5-min sub-windows
 * and fetches each in parallel at full per-window resolution.
 *
 * Used by the Reports raw-data view so 15m / 1h ranges can be analyzed
 * tile-by-tile at the same fidelity as the standalone 5m view.
 */
export function useRawSubWindows({
  sensorId,
  magSensorIds,
  timeRange,
  periodOffset,
  enabled,
  refetchKey,
}: UseRawSubWindowsParams) {
  const [subWindows, setSubWindows] = useState<RawSubWindow[]>([])
  const [loading, setLoading] = useState(false)
  const fetchSeqRef = useRef(0)

  const config = enabled ? getSubWindowConfig(timeRange) : null

  const windowSpec = useMemo(() => {
    if (!config || sensorId === null) return null
    if (magSensorIds.length === 0) return null
    const totalMs = config.count * config.durationMs
    const untilMs = Date.now() - totalMs * periodOffset
    const sinceMs = untilMs - totalMs
    const ids = [...magSensorIds].sort((a, b) => a - b)
    return {
      sinceMs,
      untilMs,
      ids,
      durationMs: config.durationMs,
      count: config.count,
      key: `${sensorId}-${ids.join(',')}-${timeRange}-${periodOffset}-${refetchKey}`,
    }
  }, [config, sensorId, magSensorIds, timeRange, periodOffset, refetchKey])

  useEffect(() => {
    if (!windowSpec) {
      setSubWindows([])
      setLoading(false)
      return
    }

    const seq = ++fetchSeqRef.current
    setLoading(true)

    const ranges: { index: number; sinceMs: number; untilMs: number }[] = []
    for (let i = 0; i < windowSpec.count; i++) {
      const sinceMs = windowSpec.sinceMs + i * windowSpec.durationMs
      const untilMs = sinceMs + windowSpec.durationMs
      ranges.push({ index: i, sinceMs, untilMs })
    }

    const expectedIds = new Set(windowSpec.ids)

    Promise.all(
      ranges.map((r) =>
        GET_MAG_DOWNSAMPLED({
          sensorIds: windowSpec.ids,
          since: new Date(r.sinceMs).toISOString(),
          until: new Date(r.untilMs).toISOString(),
          maxPoints: 1000,
        }).then((res) => ({ ...r, rows: res.mag_report })),
      ),
    )
      .then((results) => {
        if (seq !== fetchSeqRef.current) return
        const built: RawSubWindow[] = results.map((r) => {
          const filtered = (r.rows as unknown as MagReport[])
            .filter((row) => row.sensor_id != null && expectedIds.has(Number(row.sensor_id)))
            .map(magReportToPoint)
            .sort((a, b) => a.timestamp - b.timestamp)
          return {
            index: r.index,
            sinceMs: r.sinceMs,
            untilMs: r.untilMs,
            points: filtered,
          }
        })
        setSubWindows(built)
        setLoading(false)
      })
      .catch((err) => {
        if (seq !== fetchSeqRef.current) return
        console.warn('[useRawSubWindows] fetch failed', err)
        setSubWindows([])
        setLoading(false)
      })
  }, [windowSpec])

  const sharedYDomains = useMemo<SharedYDomains>(() => {
    if (subWindows.length === 0) {
      return {
        total: [0, 1],
        x: [0, 1],
        y: [0, 1],
        z: [0, 1],
        bandEnergy: [0, 1],
      }
    }
    const totals: number[] = []
    const xs: number[] = []
    const ys: number[] = []
    const zs: number[] = []
    const bands: number[] = []
    for (const w of subWindows) {
      for (const p of w.points) {
        if (p.total != null) totals.push(p.total)
        if (p.x != null) xs.push(p.x)
        if (p.y != null) ys.push(p.y)
        if (p.z != null) zs.push(p.z)
        if (p.bandEnergy10s != null) bands.push(p.bandEnergy10s)
        if (p.bandEnergy60s != null) bands.push(p.bandEnergy60s)
        if (p.bandEnergy5m != null) bands.push(p.bandEnergy5m)
      }
    }
    return {
      total: paddedDomain(totals),
      x: paddedDomain(xs),
      y: paddedDomain(ys),
      z: paddedDomain(zs),
      bandEnergy: paddedDomain(bands),
    }
  }, [subWindows])

  return { subWindows, sharedYDomains, loading }
}

export default useRawSubWindows
