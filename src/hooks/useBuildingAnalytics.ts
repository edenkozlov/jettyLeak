import { useEffect, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import {
  computeFlowFromPeaks,
  type FlowPoint,
  type MagDataPoint,
} from '@/utils/flowComputation'
import { graphqlFetch } from '@/utils/graphqlFetch'
import type { MagReport, Sensor } from '@/types'

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
const DAY_MS = 24 * 60 * 60 * 1000

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

function computeFlowData(
  allMagData: MagDataPoint[],
  since: number,
  until: number,
  multiplier: number,
): { litres: number; flowPoints: FlowPoint[] } {
  const rangeData = allMagData.filter(
    (d) => d.timestamp >= since && d.timestamp <= until,
  )
  if (rangeData.length < 5) return { litres: 0, flowPoints: [] }
  const flowPoints = computeFlowFromPeaks(rangeData, multiplier, until - since)
  const litres =
    flowPoints.length > 0
      ? Math.round(flowPoints[flowPoints.length - 1]!.accumulatedL * 10) / 10
      : 0
  return { litres, flowPoints }
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  useEffect(() => {
    if (buildingId == null) {
      setLoading(false)
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const magResult = await graphqlFetch<{
          mag_to_building: { mag_id: number }[]
        }>(GET_MAG_SENSORS_BY_BUILDING_ID, { buildingId }, tokenRef.current)
        if (cancelled) return

        const magIds =
          magResult?.mag_to_building?.map((m) => m.mag_id) ?? []
        if (magIds.length === 0) {
          setData(null)
          setLoading(false)
          return
        }

        const sensorResult = await graphqlFetch<{ sensor: Sensor[] }>(
          GET_SENSORS_BY_BUILDING_ID,
          { buildingId },
          tokenRef.current,
        )
        if (cancelled) return

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

        const fetchSince = new Date(
          Math.min(
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
        const allMagData: MagDataPoint[] = reports
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
          .map((r) => ({
            timestamp: new Date(r.created_at).getTime(),
            x: r.x_axis_reading,
            total: r.total_magnitude,
            bandEnergy10s: r.band_energy_10s,
            bandEnergy60s: r.band_energy_60s,
          }))

        const todayResult = computeFlowData(
          allMagData,
          todayStart.getTime(),
          nowMs,
          multiplier,
        )
        const yesterdayResult = computeFlowData(
          allMagData,
          yesterdayStart.getTime(),
          todayStart.getTime(),
          multiplier,
        )
        const thisWeekResult = computeFlowData(
          allMagData,
          thisWeekStart.getTime(),
          nowMs,
          multiplier,
        )
        const lastWeekResult = computeFlowData(
          allMagData,
          lastWeekStart.getTime(),
          thisWeekStart.getTime(),
          multiplier,
        )
        const thisMonthResult = computeFlowData(
          allMagData,
          thisMonthStart.getTime(),
          nowMs,
          multiplier,
        )
        const sevenDayResult = computeFlowData(
          allMagData,
          sevenDaysAgo.getTime(),
          nowMs,
          multiplier,
        )

        if (cancelled) return

        // Active flow today
        const { activeFlowMs, sessionCount } = computeActiveFlow(
          todayResult.flowPoints,
        )
        const idleMs = DAY_MS - activeFlowMs
        const activePercent = (activeFlowMs / DAY_MS) * 100

        // Trends
        const dayChangePercent =
          yesterdayResult.litres > 0
            ? Math.round(
                ((todayResult.litres - yesterdayResult.litres) /
                  yesterdayResult.litres) *
                  100,
              )
            : null
        const weekChangePercent =
          lastWeekResult.litres > 0
            ? Math.round(
                ((thisWeekResult.litres - lastWeekResult.litres) /
                  lastWeekResult.litres) *
                  100,
              )
            : null

        // Projected usage (require at least 30 min elapsed to avoid wild extrapolations)
        const hoursElapsedToday =
          (nowMs - todayStart.getTime()) / 3_600_000
        const todayProjected =
          hoursElapsedToday > 0.5
            ? Math.round(
                (todayResult.litres / hoursElapsedToday) * 24 * 10,
              ) / 10
            : 0

        const daysElapsedThisWeek =
          (nowMs - thisWeekStart.getTime()) / 86_400_000
        const weekProjected =
          daysElapsedThisWeek > 0.5
            ? Math.round(
                (thisWeekResult.litres / daysElapsedThisWeek) * 7 * 10,
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
                (thisMonthResult.litres / daysElapsedThisMonth) *
                  daysInMonth *
                  10,
              ) / 10
            : 0

        // Peak hours
        const peakHours = computeHourlyUsage(sevenDayResult.flowPoints)

        setData({
          today: todayResult.litres,
          thisWeek: thisWeekResult.litres,
          thisMonth: thisMonthResult.litres,
          yesterday: yesterdayResult.litres,
          lastWeek: lastWeekResult.litres,
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
        })
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load analytics',
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [buildingId, token])

  return { data, loading, error }
}
