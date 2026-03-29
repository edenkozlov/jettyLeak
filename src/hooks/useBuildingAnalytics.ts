import { useEffect, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import {
  computeBucketedFlow,
  computeFlowFromPeaks,
  getFlowPeakTimestamps,
  litresPerCycleFromMultiplier,
  volumeFromFullCyclesInWindow,
  type BucketedFlowPoint,
  type FlowPoint,
  type MagDataPoint,
} from '@/utils/flowComputation'
import {
  computeBuildingHealth,
  type BuildingHealth,
} from '@/utils/buildingHealth'
import { graphqlFetch, cachedGraphqlFetch } from '@/utils/graphqlFetch'
import { UPDATE_BUILDING_BHI } from '@/mutations/buildingMutations'
import type { MagReport, Sensor } from '@/types'

export type { BuildingHealth, BucketedFlowPoint }

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

const SESSION_GAP_MS = 120_000

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

function computeVolumeForRange(
  allMagData: MagDataPoint[],
  since: number,
  until: number,
  multiplier: number,
): number {
  const rangeData = allMagData.filter(
    (d) => d.timestamp >= since && d.timestamp <= until,
  )
  if (rangeData.length < 5) return 0
  const peaks = getFlowPeakTimestamps(rangeData)
  const litresPerCycle = litresPerCycleFromMultiplier(multiplier)
  return Math.round(
    volumeFromFullCyclesInWindow(peaks, since, until, litresPerCycle).volumeL * 10,
  ) / 10
}

function computeFlowPointsForRange(
  allMagData: MagDataPoint[],
  since: number,
  until: number,
  multiplier: number,
): FlowPoint[] {
  const rangeData = allMagData.filter(
    (d) => d.timestamp >= since && d.timestamp <= until,
  )
  if (rangeData.length < 5) return []
  return computeFlowFromPeaks(rangeData, multiplier)
}

function computeActiveFlow(flowPoints: FlowPoint[]): {
  activeFlowMs: number
  sessionCount: number
} {
  const active = flowPoints.filter((p) => p.flowRateLph > 0)
  if (active.length === 0) return { activeFlowMs: 0, sessionCount: 0 }

  let activeFlowMs = 0
  let sessionCount = 1

  for (let i = 1; i < active.length; i++) {
    const gap = active[i]!.timestamp - active[i - 1]!.timestamp
    if (gap > SESSION_GAP_MS) {
      sessionCount++
    } else {
      activeFlowMs += gap
    }
  }

  return { activeFlowMs, sessionCount }
}

function computeHourlyUsage(flowPoints: FlowPoint[]): number[] {
  const hourly = new Array(24).fill(0) as number[]
  for (let i = 1; i < flowPoints.length; i++) {
    const curr = flowPoints[i]!
    const prev = flowPoints[i - 1]!
    const deltaL = curr.accumulatedL - prev.accumulatedL
    if (deltaL <= 0) continue
    const hour = new Date(curr.timestamp).getHours()
    hourly[hour] = (hourly[hour] ?? 0) + deltaL
  }
  return hourly.map((v) => Math.round(v * 10) / 10)
}

export function useBuildingAnalytics(buildingId: number | null | undefined) {
  const token = useAppSelector((state) => state.login.token)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [health, setHealth] = useState<BuildingHealth | null>(null)
  const [bucketedFlow, setBucketedFlow] = useState<BucketedFlowPoint[]>([])
  const [magChart, setMagChart] = useState<MagChartPoint[]>([])
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
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const [magResult, sensorResult] = await Promise.all([
          cachedGraphqlFetch<{
            mag_to_building: { mag_id: number }[]
          }>(GET_MAG_SENSORS_BY_BUILDING_ID, { buildingId }, tokenRef.current),
          cachedGraphqlFetch<{ sensor: Sensor[] }>(
            GET_SENSORS_BY_BUILDING_ID,
            { buildingId },
            tokenRef.current,
          ),
        ])
        if (cancelled) return

        const magIds =
          magResult?.mag_to_building?.map((m) => m.mag_id) ?? []
        if (magIds.length === 0) {
          setData(null)
          setHealth(null)
          setLoading(false)
          return
        }

        const sensors = sensorResult?.sensor ?? []
        let multiplier: number | null = null
        for (const magId of magIds) {
          const match = sensors.find((s) => s.id === magId)
          if (match?.multiplier != null) {
            multiplier = match.multiplier
            break
          }
        }
        if (multiplier === null) {
          const withMul = sensors.find((s) => s.multiplier != null)
          if (withMul?.multiplier != null) multiplier = withMul.multiplier
        }
        if (multiplier === null || multiplier <= 0) {
          setData(null)
          setHealth(null)
          setLoading(false)
          return
        }

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

        const magReports = await graphqlFetch<{
          mag_report: MagReport[]
        }>(
          GET_MAG_REPORTS,
          {
            sensorIds: magIds,
            since: fetchSince.toISOString(),
            until: now.toISOString(),
          },
          tokenRef.current,
        )
        if (cancelled) return

        const reports = magReports?.mag_report ?? []
        const sorted = reports.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        )
        const allMagData: MagDataPoint[] = sorted.map((r) => ({
          timestamp: new Date(r.created_at).getTime(),
          x: r.x_axis_reading,
          total: r.total_magnitude,
          bandEnergy10s: r.band_energy_10s,
          bandEnergy60s: r.band_energy_60s,
        }))
        const allMagChart: MagChartPoint[] = sorted.map((r) => ({
          timestamp: new Date(r.created_at).getTime(),
          total: r.total_magnitude,
          x: r.x_axis_reading,
          y: r.y_axis_reading,
          z: r.z_axis_reading,
        }))

        // Detect peaks per-window (same approach as useVolumeSummary in
        // Reports): filter mag data to the window, detect peaks on just that
        // slice, then count cycles.  This keeps peak-detection context
        // consistent with Reports so the numbers match.
        const todayLitres = computeVolumeForRange(allMagData, todayStart.getTime(), nowMs, multiplier)
        const yesterdayLitres = computeVolumeForRange(allMagData, yesterdayStart.getTime(), todayStart.getTime(), multiplier)
        const thisWeekLitres = computeVolumeForRange(allMagData, thisWeekStart.getTime(), nowMs, multiplier)
        const lastWeekLitres = computeVolumeForRange(allMagData, lastWeekStart.getTime(), thisWeekStart.getTime(), multiplier)
        const thisMonthLitres = computeVolumeForRange(allMagData, thisMonthStart.getTime(), nowMs, multiplier)

        if (cancelled) return

        // Active flow today — needs flow points for session detection
        const todayFlowPoints = computeFlowPointsForRange(
          allMagData,
          todayStart.getTime(),
          nowMs,
          multiplier,
        )
        const { activeFlowMs, sessionCount } = computeActiveFlow(
          todayFlowPoints,
        )
        const elapsedTodayMs = nowMs - todayStart.getTime()
        const idleMs = Math.max(0, elapsedTodayMs - activeFlowMs)
        const activePercent =
          elapsedTodayMs > 0 ? (activeFlowMs / elapsedTodayMs) * 100 : 0

        // Trends
        const dayChangePercent =
          yesterdayLitres > 0
            ? Math.round(
                ((todayLitres - yesterdayLitres) /
                  yesterdayLitres) *
                  100,
              )
            : null
        const weekChangePercent =
          lastWeekLitres > 0
            ? Math.round(
                ((thisWeekLitres - lastWeekLitres) /
                  lastWeekLitres) *
                  100,
              )
            : null

        // Projected usage (require at least 30 min elapsed to avoid wild extrapolations)
        const hoursElapsedToday =
          (nowMs - todayStart.getTime()) / 3_600_000
        const todayProjected =
          hoursElapsedToday > 0.5
            ? Math.round(
                (todayLitres / hoursElapsedToday) * 24 * 10,
              ) / 10
            : 0

        const daysElapsedThisWeek =
          (nowMs - thisWeekStart.getTime()) / 86_400_000
        const weekProjected =
          daysElapsedThisWeek > 0.5
            ? Math.round(
                (thisWeekLitres / daysElapsedThisWeek) * 7 * 10,
              ) / 10
            : 0

        const daysInMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate()
        const daysElapsedThisMonth =
          (nowMs - thisMonthStart.getTime()) / 86_400_000
        const monthProjected =
          daysElapsedThisMonth > 0.5
            ? Math.round(
                (thisMonthLitres / daysElapsedThisMonth) *
                  daysInMonth *
                  10,
              ) / 10
            : 0

        // Peak hours — needs flow points for hourly distribution
        const sevenDayFlowPoints = computeFlowPointsForRange(
          allMagData,
          sevenDaysAgo.getTime(),
          nowMs,
          multiplier,
        )
        const peakHours = computeHourlyUsage(sevenDayFlowPoints)

        const historyFlowPoints = computeFlowPointsForRange(
          allMagData,
          fetchSince.getTime(),
          nowMs,
          multiplier,
        )

        // Bucketed flow for the bar chart (today's window, 15-min buckets)
        const todayMagData = allMagData.filter(
          (d) => d.timestamp >= todayStart.getTime() && d.timestamp <= nowMs,
        )
        const BUCKET_MS = 15 * 60_000
        const numBuckets = Math.max(
          1,
          Math.ceil((nowMs - todayStart.getTime()) / BUCKET_MS),
        )
        const litresPerCycle = litresPerCycleFromMultiplier(multiplier)
        const todayPeaks = getFlowPeakTimestamps(todayMagData)
        const todayBucketed = computeBucketedFlow(
          todayMagData,
          todayFlowPoints,
          todayPeaks,
          litresPerCycle,
          BUCKET_MS,
          todayStart.getTime(),
          numBuckets,
        )

        // Last 24h of mag chart data for the raw signal viewer
        const last24h = nowMs - 24 * 3_600_000
        const recentMagChart = allMagChart.filter(
          (d) => d.timestamp >= last24h,
        )

        const analyticsPayload = {
          today: todayLitres,
          thisWeek: thisWeekLitres,
          thisMonth: thisMonthLitres,
          yesterday: yesterdayLitres,
          lastWeek: lastWeekLitres,
          dayChangePercent,
          weekChangePercent,
          activeFlowMs,
          idleMs,
          sessionCount,
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

        // Persist BHI to DB so the buildings list can show it without re-computing
        graphqlFetch(
          UPDATE_BUILDING_BHI,
          {
            id: buildingId,
            bhi: healthPayload.bhi,
            bhi_label: healthPayload.label,
            bhi_updated_at: new Date().toISOString(),
          },
          tokenRef.current,
        ).catch(() => {})
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

  return { data, health, bucketedFlow, magChart, loading, error }
}
