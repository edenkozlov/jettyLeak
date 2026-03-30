import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import {
  getFlowPeakTimestamps,
  litresPerCycleFromMultiplier,
  volumeFromFullCyclesInWindow,
  type MagDataPoint,
} from '@/utils/flowComputation'

interface MagReportRow {
  id: number
  created_at: string
  x_axis_reading: number | null
  y_axis_reading: number | null
  z_axis_reading: number | null
  total_magnitude: number | null
  sensor_id: number
  band_energy_10s: number | null
  band_energy_60s: number | null
  band_energy_5m: number | null
  dominant_freq_hz: number | null
  vibration_rpm: number | null
}

interface MagReportsResponse {
  mag_report: MagReportRow[]
}

export interface VolumeBucket {
  label: string
  volumeL: number
  cycles: number
}

const WINDOWS: { label: string; ms: number | 'today' }[] = [
  { label: '15 min', ms: 15 * 60_000 },
  { label: '1 hr', ms: 60 * 60_000 },
  { label: '12 hr', ms: 12 * 60 * 60_000 },
  { label: '24 hr', ms: 24 * 60 * 60_000 },
  { label: 'Today', ms: 'today' },
]

function toMagDataPoint(r: MagReportRow): MagDataPoint {
  return {
    timestamp: new Date(r.created_at).getTime(),
    x: r.x_axis_reading,
    total: r.total_magnitude,
    bandEnergy10s: r.band_energy_10s,
    bandEnergy60s: r.band_energy_60s,
  }
}

function startOfDayMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function useVolumeSummary(
  magSensorIds: number[],
  sensorMultiplier: number | null,
) {
  const { executeQuery } = useGraphQL<MagReportsResponse>(GET_MAG_REPORTS)
  const [magData, setMagData] = useState<MagDataPoint[]>([])
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    if (magSensorIds.length === 0) return
    const now = new Date()
    const since = new Date(now.getTime() - 24 * 60 * 60_000)
    const result = await executeQuery({
      sensorIds: magSensorIds,
      since: since.toISOString(),
      until: now.toISOString(),
    })
    if (!mountedRef.current) return
    if (!result?.mag_report) {
      setMagData([])
      return
    }
    const expectedIds = new Set(magSensorIds)
    const filtered = result.mag_report.filter((r) =>
      expectedIds.has(Number(r.sensor_id)),
    )
    const points = filtered
      .map(toMagDataPoint)
      .sort((a, b) => a.timestamp - b.timestamp)
    setMagData(points)
  }, [magSensorIds, executeQuery])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => {
      mountedRef.current = false
    }
  }, [fetchData])

  const buckets = useMemo<VolumeBucket[]>(() => {
    const m = sensorMultiplier ?? 0
    if (m <= 0 || magData.length < 5) {
      return WINDOWS.map((w) => ({ label: w.label, volumeL: 0, cycles: 0 }))
    }
    const litresPerCycle = litresPerCycleFromMultiplier(m)
    const peaks = getFlowPeakTimestamps(magData)
    const now = Date.now()

    return WINDOWS.map((w) => {
      const windowStart = w.ms === 'today' ? startOfDayMs() : now - w.ms
      const { fullCycles, volumeL } = volumeFromFullCyclesInWindow(
        peaks,
        windowStart,
        now,
        litresPerCycle,
      )
      return { label: w.label, volumeL, cycles: fullCycles }
    })
  }, [magData, sensorMultiplier])

  return { buckets, hasSensor: magSensorIds.length > 0, hasMultiplier: (sensorMultiplier ?? 0) > 0 }
}
