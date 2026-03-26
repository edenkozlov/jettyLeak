import { useCallback, useEffect, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import { computeFlowFromPeaks, type MagDataPoint } from '@/utils/flowComputation'
import { graphqlFetch, GraphqlError } from '@/utils/graphqlFetch'
import type { MagReport, Sensor } from '@/types'

export type FlowStatus =
  | 'loading'
  | 'idle'
  | 'flowing'
  | 'no-sensor'
  | 'needs-cal'
  | 'error'
  | 'stale'

const BASE_POLL_MS = 5_000
const MAX_POLL_MS = 30_000
const LOOKBACK_MS = 30_000
const STALE_THRESHOLD_MS = 25_000
const MAX_INIT_RETRIES = 3

export interface UseLiveFlowOptions {
  fallbackMagSensorId?: number | null
}

interface SensorInfo {
  magIds: number[]
  multiplier: number
}

export function useLiveFlow(
  buildingId: number | null | undefined,
  options?: UseLiveFlowOptions,
) {
  const token = useAppSelector((state) => state.login.token)
  const [flowRate, setFlowRate] = useState<number | null>(null)
  const [status, setStatus] = useState<FlowStatus>('loading')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const tokenRef = useRef(token)
  tokenRef.current = token
  const fallbackRef = useRef(options?.fallbackMagSensorId ?? null)
  fallbackRef.current = options?.fallbackMagSensorId ?? null

  const consecutiveErrorsRef = useRef(0)
  const sensorInfoRef = useRef<SensorInfo | null>(null)
  const lastUpdatedRef = useRef<number | null>(null)

  const pollFlow = useCallback(async (): Promise<boolean> => {
    const info = sensorInfoRef.current
    if (!info) return false

    const now = Date.now()
    const result = await graphqlFetch<{ mag_report: MagReport[] }>(
      GET_MAG_REPORTS,
      {
        sensorIds: info.magIds,
        since: new Date(now - LOOKBACK_MS).toISOString(),
        until: new Date(now).toISOString(),
      },
      tokenRef.current,
    )

    const reports = result?.mag_report ?? []
    if (reports.length < 5) {
      setFlowRate(0)
      setStatus('idle')
      const ts = Date.now()
      setLastUpdated(ts)
      lastUpdatedRef.current = ts
      return true
    }

    const magData: MagDataPoint[] = reports
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((r) => ({
        timestamp: new Date(r.created_at).getTime(),
        x: r.x_axis_reading,
        total: r.total_magnitude,
        bandEnergy10s: r.band_energy_10s,
        bandEnergy60s: r.band_energy_60s,
      }))

    const flowPoints = computeFlowFromPeaks(magData, info.multiplier, LOOKBACK_MS)

    if (flowPoints.length === 0) {
      setFlowRate(0)
      setStatus('idle')
    } else {
      const lastRate = flowPoints[flowPoints.length - 1]!.flowRateLph
      setFlowRate(Math.round(lastRate * 10) / 10)
      setStatus(lastRate > 0 ? 'flowing' : 'idle')
    }
    const ts = Date.now()
    setLastUpdated(ts)
    lastUpdatedRef.current = ts
    return true
  }, [])

  const initSensors = useCallback(
    async (bid: number): Promise<SensorInfo | 'no-sensor' | 'needs-cal'> => {
      const magResult = await graphqlFetch<{
        mag_to_building: { mag_id: number }[]
      }>(GET_MAG_SENSORS_BY_BUILDING_ID, { buildingId: bid }, tokenRef.current)

      const fromBuilding =
        magResult?.mag_to_building?.map((m) => m.mag_id) ?? []
      const fb = fallbackRef.current
      const magIds =
        fb != null
          ? [...new Set([...fromBuilding, fb])]
          : fromBuilding
      if (magIds.length === 0) return 'no-sensor'

      const sensorResult = await graphqlFetch<{ sensor: Sensor[] }>(
        GET_SENSORS_BY_BUILDING_ID,
        { buildingId: bid },
        tokenRef.current,
      )

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

      if (multiplier === null || multiplier <= 0) return 'needs-cal'
      return { magIds, multiplier }
    },
    [],
  )

  useEffect(() => {
    if (buildingId == null) {
      setStatus('no-sensor')
      setFlowRate(null)
      setLastUpdated(null)
      sensorInfoRef.current = null
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    consecutiveErrorsRef.current = 0
    sensorInfoRef.current = null
    setStatus('loading')
    setFlowRate(null)
    setLastUpdated(null)
    lastUpdatedRef.current = null

    const scheduleNext = () => {
      if (cancelled) return
      const backoff = Math.min(
        BASE_POLL_MS * 2 ** consecutiveErrorsRef.current,
        MAX_POLL_MS,
      )
      timeoutId = setTimeout(tick, backoff)
    }

    const tick = async () => {
      if (cancelled) return

      if (document.hidden) {
        scheduleNext()
        return
      }

      if (!sensorInfoRef.current) {
        let retries = 0
        while (!cancelled && retries < MAX_INIT_RETRIES) {
          try {
            const result = await initSensors(buildingId)
            if (cancelled) return
            if (result === 'no-sensor') {
              setStatus('no-sensor')
              return
            }
            if (result === 'needs-cal') {
              setStatus('needs-cal')
              return
            }
            sensorInfoRef.current = result
            break
          } catch (err) {
            retries++
            if (retries >= MAX_INIT_RETRIES) {
              if (!cancelled) setStatus('error')
              scheduleNext()
              return
            }
            const isTransient =
              err instanceof GraphqlError ? err.transient : true
            if (!isTransient) {
              if (!cancelled) setStatus('error')
              scheduleNext()
              return
            }
            await new Promise((r) =>
              setTimeout(r, Math.min(2000 * 2 ** retries, 10_000)),
            )
          }
        }
      }

      if (cancelled || !sensorInfoRef.current) return

      try {
        await pollFlow()
        if (cancelled) return
        consecutiveErrorsRef.current = 0
      } catch (err) {
        if (cancelled) return
        consecutiveErrorsRef.current++
        const isTransient =
          err instanceof GraphqlError ? err.transient : true
        if (consecutiveErrorsRef.current >= 3 && !isTransient) {
          setStatus('error')
        } else if (
          lastUpdatedRef.current != null &&
          Date.now() - lastUpdatedRef.current > STALE_THRESHOLD_MS
        ) {
          setStatus('stale')
        }
      }

      scheduleNext()
    }

    tick()

    const onVisibilityChange = () => {
      if (!document.hidden && !cancelled) {
        if (timeoutId) clearTimeout(timeoutId)
        consecutiveErrorsRef.current = 0
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, token])

  return { flowRate, status, lastUpdated }
}
