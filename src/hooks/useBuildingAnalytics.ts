import { useEffect, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import {
  GET_FLOW_ANALYTICS,
  GET_MAG_DOWNSAMPLED,
  type FlowHourlyRow,
} from '@/queries/getFlowAnalytics'
import {
  computeBuildingHealth,
  type BuildingHealth,
} from '@/utils/buildingHealth'
import { UPDATE_BUILDING_BHI } from '@/mutations/buildingMutations'
import type { Sensor } from '@/types'
import type { BucketedFlowPoint, FlowPoint } from '@/utils/flowComputation'

export type { BuildingHealth, BucketedFlowPoint, FlowHourlyRow }

export interface MagChartPoint {
  timestamp: number
  total: number | null
  x: number | null
  y: number | null
  z: number | null
}

export interface AnalyticsData {
  today: number
  thisWeek: number
  thisMonth: number
  yesterday: number
  lastWeek: number
  dayChangePercent: number | null
  weekChangePercent: number | null

  activeFlowMs: number
  idleMs: number
  sessionCount: number
  activePercent: number

  todayProjected: number
  weekProjected: number
  monthProjected: number

  peakHours: number[]
}

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// Aggregate helpers — work on pre-computed hourly rows instead of raw data
// ---------------------------------------------------------------------------

function sumVolumeInRange(rows: FlowHourlyRow[], sinceMs: number, untilMs: number): number {
  let total = 0
  for (const r of rows) {
    const hourMs = new Date(r.hour_start).getTime()
    // Include hours that overlap with the range
    if (hourMs >= sinceMs && hourMs < untilMs) {
      total += r.volume_litres
    }
  }
  return Math.round(total * 10) / 10
}

function sumActiveSecondsInRange(rows: FlowHourlyRow[], sinceMs: number, untilMs: number): number {
  let total = 0
  for (const r of rows) {
    const hourMs = new Date(r.hour_start).getTime()
    if (hourMs >= sinceMs && hourMs < untilMs) {
      total += r.active_seconds
    }
  }
  return total
}

function sumSessionsInRange(rows: FlowHourlyRow[], sinceMs: number, untilMs: number): number {
  let total = 0
  for (const r of rows) {
    const hourMs = new Date(r.hour_start).getTime()
    if (hourMs >= sinceMs && hourMs < untilMs) {
      total += r.session_count
    }
  }
  return total
}

function computeHourlyUsageFromRows(rows: FlowHourlyRow[], sinceMs: number, untilMs: number): number[] {
  const hourly = new Array(24).fill(0) as number[]
  for (const r of rows) {
    const hourMs = new Date(r.hour_start).getTime()
    if (hourMs >= sinceMs && hourMs < untilMs) {
      const hour = new Date(r.hour_start).getHours()
      hourly[hour] = (hourly[hour] ?? 0) + r.volume_litres
    }
  }
  return hourly.map((v) => Math.round(v * 10) / 10)
}

/** Build simplified flow points from hourly data for health computation. */
function flowPointsFromHourly(rows: FlowHourlyRow[], sinceMs: number, untilMs: number): FlowPoint[] {
  const points: FlowPoint[] = []
  let accumulated = 0
  for (const r of rows) {
    const hourMs = new Date(r.hour_start).getTime()
    if (hourMs < sinceMs || hourMs >= untilMs) continue
    if (r.volume_litres > 0) {
      accumulated += r.volume_litres
      const rateLph = r.volume_litres // volume per hour = L/h
      points.push({
        timestamp: hourMs + 1800_000, // midpoint of hour
        flowRateLph: rateLph,
        accumulatedL: accumulated,
      })
    }
  }
  return points
}

/** Build bucketed flow from hourly data for the bar chart. */
function bucketedFlowFromHourly(rows: FlowHourlyRow[], todayStartMs: number, nowMs: number): BucketedFlowPoint[] {
  const BUCKET_MS = 15 * 60_000
  const numBuckets = Math.max(1, Math.ceil((nowMs - todayStartMs) / BUCKET_MS))
  const buckets: BucketedFlowPoint[] = []

  for (let i = 0; i < numBuckets; i++) {
    const bucketStart = todayStartMs + i * BUCKET_MS
    const bucketEnd = bucketStart + BUCKET_MS
    const mid = bucketStart + BUCKET_MS / 2
    const isPartial = bucketEnd > nowMs

    // Sum volume from hourly rows that overlap this bucket
    let volumeL = 0
    for (const r of rows) {
      const hourMs = new Date(r.hour_start).getTime()
      const hourEnd = hourMs + 3600_000
      // Check overlap between [hourMs, hourEnd) and [bucketStart, bucketEnd)
      const overlapStart = Math.max(hourMs, bucketStart)
      const overlapEnd = Math.min(hourEnd, bucketEnd)
      if (overlapEnd > overlapStart && r.volume_litres > 0) {
        const fraction = (overlapEnd - overlapStart) / 3600_000
        volumeL += r.volume_litres * fraction
      }
    }

    const effectiveDurationH = (isPartial ? Math.min(nowMs - bucketStart, BUCKET_MS) : BUCKET_MS) / 3_600_000
    const rateLph = effectiveDurationH > 0 ? volumeL / effectiveDurationH : 0

    buckets.push({
      timestamp: mid,
      flowRateLph: Math.round(rateLph * 10) / 10,
      flowRateBarVisual: rateLph > 0 ? Math.round(rateLph * 10) / 10 : 2,
      partial: isPartial,
      bucketVolumeL: Math.round(volumeL * 100) / 100,
    })
  }

  return buckets
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBuildingAnalytics(buildingId: number | null | undefined) {
  const token = useAppSelector((state) => state.login.token)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [health, setHealth] = useState<BuildingHealth | null>(null)
  const [bucketedFlow, setBucketedFlow] = useState<BucketedFlowPoint[]>([])
  const [magChart, setMagChart] = useState<MagChartPoint[]>([])
  const [flowHourlyRows, setFlowHourlyRows] = useState<FlowHourlyRow[]>([])
  const [sensorMultiplier, setSensorMultiplier] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  useEffect(() => {
    if (buildingId == null) {
      setLoading(false)
      setData(null)
      setHealth(null)
      setBucketedFlow([])
      setMagChart([])
      setFlowHourlyRows([])
      setSensorMultiplier(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        // Step 1: Resolve sensors + multiplier.
        // Primary source = the `sensor` table filtered by `building_id` (this
        // is what the flow chart uses). The older `mag_to_building` linkage
        // table is only consulted as a supplement — many buildings have real
        // sensor rows without any `mag_to_building` entries.
        const [magResult, sensorResult] = await Promise.all([
          GET_MAG_SENSORS_BY_BUILDING_ID({ buildingId }).catch(() => null),
          GET_SENSORS_BY_BUILDING_ID({ buildingId }),
        ])
        if (cancelled) return

        const sensors = (sensorResult?.sensor as Sensor[]) ?? []
        const directIds = sensors.map((s) => s.id)
        const linkageIds =
          ((magResult?.mag_to_building as { mag_id: number }[] | undefined) ?? []).map(
            (m) => m.mag_id,
          )
        // Union: any sensor on this building OR any mag_to_building linkage
        const magIds = Array.from(new Set<number>([...directIds, ...linkageIds]))
        if (magIds.length === 0) {
          setData(null)
          setHealth(null)
          setLoading(false)
          return
        }

        // Pick the first sensor with a valid multiplier (any sensor on the
        // building will do — flow analytics are building-aggregated downstream).
        let multiplier: number | null = null
        for (const id of magIds) {
          const match = sensors.find((s) => s.id === id)
          if (match?.multiplier != null && Number(match.multiplier) > 0) {
            multiplier = Number(match.multiplier)
            break
          }
        }
        if (multiplier === null) {
          const withMul = sensors.find(
            (s) => s.multiplier != null && Number(s.multiplier) > 0,
          )
          if (withMul?.multiplier != null) multiplier = Number(withMul.multiplier)
        }
        if (multiplier === null || multiplier <= 0) {
          setData(null)
          setHealth(null)
          setLoading(false)
          return
        }

        // Step 2: Fetch pre-aggregated hourly data + downsampled chart data
        // This is 2 requests total instead of thousands.
        const now = new Date()
        const nowMs = now.getTime()
        const todayStart = getStartOfDay(now)
        const yesterdayStart = new Date(todayStart)
        yesterdayStart.setDate(yesterdayStart.getDate() - 1)
        const thisWeekStart = getStartOfWeek(now)
        const lastWeekStart = new Date(thisWeekStart)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)
        const thisMonthStart = getStartOfMonth(now)
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)
        const twentyEightDaysAgo = new Date(now)
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)
        twentyEightDaysAgo.setHours(0, 0, 0, 0)

        const fetchSince = new Date(
          Math.min(
            twentyEightDaysAgo.getTime(),
            sevenDaysAgo.getTime(),
            lastWeekStart.getTime(),
            thisMonthStart.getTime(),
            yesterdayStart.getTime(),
          ),
        )

        const last24h = new Date(nowMs - 24 * 3_600_000)

        // Decouple: analytics is critical, mag chart is nice-to-have.
        // If mag times out, stats still load.
        const [analyticsResult, chartResult] = await Promise.all([
          GET_FLOW_ANALYTICS({
            sensorIds: magIds,
            since: fetchSince.toISOString(),
            until: now.toISOString(),
          }),
          GET_MAG_DOWNSAMPLED({
            sensorIds: magIds,
            since: last24h.toISOString(),
            until: now.toISOString(),
            maxPoints: 1500,
          }).catch(() => ({ mag_report: [] as any[] })),
        ])
        if (cancelled) return

        const hourlyRows = analyticsResult.rows

        // Step 3: Compute all analytics from the hourly aggregates
        const todayLitres = sumVolumeInRange(hourlyRows, todayStart.getTime(), nowMs)
        const yesterdayLitres = sumVolumeInRange(hourlyRows, yesterdayStart.getTime(), todayStart.getTime())
        const thisWeekLitres = sumVolumeInRange(hourlyRows, thisWeekStart.getTime(), nowMs)
        const lastWeekLitres = sumVolumeInRange(hourlyRows, lastWeekStart.getTime(), thisWeekStart.getTime())
        const thisMonthLitres = sumVolumeInRange(hourlyRows, thisMonthStart.getTime(), nowMs)

        const todayActiveSec = sumActiveSecondsInRange(hourlyRows, todayStart.getTime(), nowMs)
        const activeFlowMs = todayActiveSec * 1000
        const todaySessionCount = sumSessionsInRange(hourlyRows, todayStart.getTime(), nowMs)
        const elapsedTodayMs = nowMs - todayStart.getTime()
        const idleMs = Math.max(0, elapsedTodayMs - activeFlowMs)
        const activePercent = elapsedTodayMs > 0 ? (activeFlowMs / elapsedTodayMs) * 100 : 0

        const dayChangePercent = yesterdayLitres > 0
          ? Math.round(((todayLitres - yesterdayLitres) / yesterdayLitres) * 100)
          : null
        const weekChangePercent = lastWeekLitres > 0
          ? Math.round(((thisWeekLitres - lastWeekLitres) / lastWeekLitres) * 100)
          : null

        const hoursElapsedToday = (nowMs - todayStart.getTime()) / 3_600_000
        const todayProjected = hoursElapsedToday > 0.5
          ? Math.round((todayLitres / hoursElapsedToday) * 24 * 10) / 10
          : 0

        const daysElapsedThisWeek = (nowMs - thisWeekStart.getTime()) / 86_400_000
        const weekProjected = daysElapsedThisWeek > 0.5
          ? Math.round((thisWeekLitres / daysElapsedThisWeek) * 7 * 10) / 10
          : 0

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const daysElapsedThisMonth = (nowMs - thisMonthStart.getTime()) / 86_400_000
        const monthProjected = daysElapsedThisMonth > 0.5
          ? Math.round((thisMonthLitres / daysElapsedThisMonth) * daysInMonth * 10) / 10
          : 0

        const peakHours = computeHourlyUsageFromRows(
          hourlyRows,
          sevenDaysAgo.getTime(),
          nowMs,
        )

        const todayBucketed = bucketedFlowFromHourly(hourlyRows, todayStart.getTime(), nowMs)

        // Build chart data from downsampled result
        const chartReports = chartResult.mag_report ?? []
        const recentMagChart: MagChartPoint[] = chartReports.map((r) => ({
          timestamp: new Date(r.created_at).getTime(),
          total: r.total_magnitude,
          x: r.x_axis_reading,
          y: r.y_axis_reading,
          z: r.z_axis_reading,
        }))

        // Build flow points from hourly data for health computation
        const todayFlowPoints = flowPointsFromHourly(hourlyRows, todayStart.getTime(), nowMs)
        const historyFlowPoints = flowPointsFromHourly(hourlyRows, fetchSince.getTime(), nowMs)

        // Construct MagDataPoint-like data from hourly stats for health
        const allMagData = hourlyRows.map((r) => ({
          timestamp: new Date(r.hour_start).getTime(),
          x: r.avg_x,
          total: r.avg_total,
          bandEnergy10s: r.stddev_total, // stddev as activity proxy
          bandEnergy60s: null,
        }))

        const analyticsPayload: AnalyticsData = {
          today: todayLitres,
          thisWeek: thisWeekLitres,
          thisMonth: thisMonthLitres,
          yesterday: yesterdayLitres,
          lastWeek: lastWeekLitres,
          dayChangePercent,
          weekChangePercent,
          activeFlowMs,
          idleMs,
          sessionCount: todaySessionCount,
          activePercent,
          todayProjected,
          weekProjected,
          monthProjected,
          peakHours,
        }

        const healthPayload = computeBuildingHealth({
          allMagData,
          historyFlowPoints,
          todayFlowPoints,
          todayStartMs: todayStart.getTime(),
          nowMs,
          todayLitres,
          yesterdayLitres,
          multiplier,
        })

        if (cancelled) return

        setHealth(healthPayload)
        setData(analyticsPayload)
        setBucketedFlow(todayBucketed)
        setMagChart(recentMagChart)
        setFlowHourlyRows(hourlyRows)
        setSensorMultiplier(multiplier)

        // Persist BHI to DB
        UPDATE_BUILDING_BHI({
          id: buildingId,
          bhi: healthPayload.bhi,
          bhi_label: healthPayload.label,
          bhi_updated_at: new Date().toISOString(),
        }).catch(() => {})
      } catch (err) {
        if (!cancelled) {
          setHealth(null)
          setError(
            err instanceof Error ? err.message : 'Failed to load analytics',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [buildingId, token])

  return {
    data,
    health,
    bucketedFlow,
    magChart,
    flowHourlyRows,
    sensorMultiplier,
    loading,
    error,
  }
}
