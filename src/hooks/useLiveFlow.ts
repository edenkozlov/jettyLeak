import { useEffect, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import { computeFlowFromPeaks, type MagDataPoint } from '@/utils/flowComputation'
import { graphqlFetch } from '@/utils/graphqlFetch'
import type { MagReport, Sensor } from '@/types'

export type FlowStatus =
  | 'loading'
  | 'idle'
  | 'flowing'
  | 'no-sensor'
  | 'needs-cal'
  | 'error'

const POLL_INTERVAL_MS = 5_000
const LOOKBACK_MS = 30_000

export interface UseLiveFlowOptions {
  /**
   * When `mag_to_building` has no rows (or omits a sensor), still include this
   * sensor id in mag_report queries — same idea as Reports `magSensorIdsForQuery`.
   */
  fallbackMagSensorId?: number | null
}

export function useLiveFlow(
  buildingId: number | null | undefined,
  options?: UseLiveFlowOptions,
) {
  const token = useAppSelector((state) => state.login.token)
  const [flowRate, setFlowRate] = useState<number | null>(null)
  const [status, setStatus] = useState<FlowStatus>('loading')
  const tokenRef = useRef(token)
  tokenRef.current = token

  const fallbackMagSensorId = options?.fallbackMagSensorId ?? null

  useEffect(() => {
    if (buildingId == null) {
      setStatus('no-sensor')
      setFlowRate(null)
      return
    }

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null
    let sensorInfo: { magIds: number[]; multiplier: number } | null = null

    const pollFlow = async () => {
      if (cancelled || !sensorInfo) return

      try {
        const now = Date.now()
        const result = await graphqlFetch<{ mag_report: MagReport[] }>(
          GET_MAG_REPORTS,
          {
            sensorIds: sensorInfo.magIds,
            since: new Date(now - LOOKBACK_MS).toISOString(),
            until: new Date(now).toISOString(),
          },
          tokenRef.current,
        )
        if (cancelled) return

        const reports = result?.mag_report ?? []
        if (reports.length < 5) {
          setFlowRate(0)
          setStatus('idle')
          return
        }

        const magData: MagDataPoint[] = reports
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

        const flowPoints = computeFlowFromPeaks(
          magData,
          sensorInfo.multiplier,
          LOOKBACK_MS,
        )

        if (cancelled) return

        if (flowPoints.length === 0) {
          setFlowRate(0)
          setStatus('idle')
          return
        }

        const lastRate = flowPoints[flowPoints.length - 1]!.flowRateLph
        setFlowRate(Math.round(lastRate * 10) / 10)
        setStatus(lastRate > 0 ? 'flowing' : 'idle')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    setStatus('loading')
    ;(async () => {
      try {
        const magResult = await graphqlFetch<{
          mag_to_building: { mag_id: number }[]
        }>(GET_MAG_SENSORS_BY_BUILDING_ID, { buildingId }, tokenRef.current)
        if (cancelled) return

        const fromBuilding =
          magResult?.mag_to_building?.map((m) => m.mag_id) ?? []
        const magIds =
          fallbackMagSensorId != null
            ? [...new Set([...fromBuilding, fallbackMagSensorId])]
            : fromBuilding
        if (magIds.length === 0) {
          setStatus('no-sensor')
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
          setStatus('needs-cal')
          return
        }

        sensorInfo = { magIds, multiplier }

        await pollFlow()
        if (!cancelled) {
          intervalId = setInterval(pollFlow, POLL_INTERVAL_MS)
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [buildingId, token, fallbackMagSensorId])

  return { flowRate, status }
}
