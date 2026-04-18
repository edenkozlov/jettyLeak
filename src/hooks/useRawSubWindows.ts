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
  '1m': { count: 1, durationMs: 60_000 },
  '5m': { count: 1, durationMs: 5 * 60_000 },
  '15m': { count: 3, durationMs: 5 * 60_000 },
  '1h': { count: 12, durationMs: 5 * 60_000 },
  '6h': { count: 24, durationMs: 15 * 60_000 },
  '12h': { count: 48, durationMs: 15 * 60_000 },
  '24h': { count: 96, durationMs: 15 * 60_000 },
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
  const prevBaseKeyRef = useRef('')

  const config = enabled ? getSubWindowConfig(timeRange) : null

  const baseKey = useMemo(() => {
    if (!config || sensorId === null || magSensorIds.length === 0) return ''
    const ids = [...magSensorIds].sort((a, b) => a - b)
    return `${sensorId}-${ids.join(',')}-${timeRange}-${periodOffset}`
  }, [config, sensorId, magSensorIds, timeRange, periodOffset])

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
    }
  }, [config, sensorId, magSensorIds, timeRange, periodOffset, refetchKey])

  useEffect(() => {
    if (!windowSpec) {
      setSubWindows([])
      setLoading(false)
      prevBaseKeyRef.current = ''
      return
    }

    const isFullRefresh = baseKey !== prevBaseKeyRef.current
    prevBaseKeyRef.current = baseKey

    const expectedIds = new Set(windowSpec.ids)

    function buildWindow(
      r: { index: number; sinceMs: number; untilMs: number },
      rows: unknown[],
    ): RawSubWindow {
      const filtered = (rows as MagReport[])
        .filter((row) => row.sensor_id != null && expectedIds.has(Number(row.sensor_id)))
        .map(magReportToPoint)
        .sort((a, b) => a.timestamp - b.timestamp)
      return { index: r.index, sinceMs: r.sinceMs, untilMs: r.untilMs, points: filtered }
    }

    if (isFullRefresh) {
      const seq = ++fetchSeqRef.current
      setLoading(true)

      const ranges: { index: number; sinceMs: number; untilMs: number }[] = []
      for (let i = 0; i < windowSpec.count; i++) {
        const sinceMs = windowSpec.sinceMs + i * windowSpec.durationMs
        const untilMs = sinceMs + windowSpec.durationMs
        ranges.push({ index: i, sinceMs, untilMs })
      }

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
          const built = results.map((r) => buildWindow(r, r.rows as unknown[]))
          setSubWindows(built.reverse())
          setLoading(false)
        })
        .catch((err) => {
          if (seq !== fetchSeqRef.current) return
          console.warn('[useRawSubWindows] fetch failed', err)
          setSubWindows([])
          setLoading(false)
        })
    } else {
      // Poll: only refetch the most recent sub-window (last index, first after reverse)
      const latestIndex = windowSpec.count - 1
      const sinceMs = windowSpec.sinceMs + latestIndex * windowSpec.durationMs
      const untilMs = sinceMs + windowSpec.durationMs

      GET_MAG_DOWNSAMPLED({
        sensorIds: windowSpec.ids,
        since: new Date(sinceMs).toISOString(),
        until: new Date(untilMs).toISOString(),
        maxPoints: 1000,
      })
        .then((res) => {
          const updated = buildWindow(
            { index: latestIndex, sinceMs, untilMs },
            res.mag_report as unknown[],
          )
          setSubWindows((prev) => {
            if (prev.length === 0) return prev
            // Most recent is first after reverse
            const next = [...prev]
            next[0] = updated
            return next
          })
        })
        .catch((err) => {
          console.warn('[useRawSubWindows] poll failed', err)
        })
    }
  }, [windowSpec, baseKey])

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

  // Dedicated polling interval for the most recent window (every 5s when live)
  useEffect(() => {
    if (!config || !enabled || periodOffset !== 0) return
    if (magSensorIds.length === 0 || sensorId === null) return

    const ids = [...magSensorIds].sort((a, b) => a - b)
    const expectedIds = new Set(ids)
    const durationMs = config.durationMs
    const count = config.count

    const interval = setInterval(() => {
      const totalMs = count * durationMs
      const untilMs = Date.now()
      const sinceMs = untilMs - totalMs
      const latestSinceMs = sinceMs + (count - 1) * durationMs
      const latestUntilMs = latestSinceMs + durationMs

      GET_MAG_DOWNSAMPLED({
        sensorIds: ids,
        since: new Date(latestSinceMs).toISOString(),
        until: new Date(latestUntilMs).toISOString(),
        maxPoints: 1000,
      })
        .then((res) => {
          const points = (res.mag_report as unknown as MagReport[])
            .filter((r) => r.sensor_id != null && expectedIds.has(Number(r.sensor_id)))
            .map(magReportToPoint)
            .sort((a, b) => a.timestamp - b.timestamp)
          const updated: RawSubWindow = {
            index: count - 1,
            sinceMs: latestSinceMs,
            untilMs: latestUntilMs,
            points,
          }
          setSubWindows((prev) => {
            if (prev.length === 0) return prev
            const next = [...prev]
            next[0] = updated
            return next
          })
        })
        .catch(() => {})
    }, 5_000)

    return () => clearInterval(interval)
  }, [config, enabled, periodOffset, magSensorIds, sensorId])

  return { subWindows, sharedYDomains, loading }
}

export default useRawSubWindows
