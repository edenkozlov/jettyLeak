import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { useSubscription } from '@/hooks/useSubscription'
import { GET_SENSORS } from '@/queries/getSensors'
import { GET_REPORTS_BY_SENSOR_ID } from '@/queries/getReportsBySensorId'
import { GET_SIGNALS_BY_SENSOR_ID } from '@/queries/getSignalsBySensorId'
import {
  GET_MAG_SENSORS_BY_BUILDING_ID,
  GET_MAG_REPORTS_BY_SENSOR_IDS,
} from '@/queries/getMagDataByBuildingId'
import { UPDATE_SENSOR_MAPPINGS } from '@/mutations/sensorMutations'
import { LATEST_REPORT_SUBSCRIPTION } from '@/queries/reportSubscription'
import { LATEST_MAG_REPORT_SUBSCRIPTION } from '@/queries/magReportSubscription'

import type { MagReport, Report, Sensor, Signal, SensorMappings } from '@/types'
import { parseSignalValue } from '@/types'

interface SensorsResponse {
  sensor: Sensor[]
}

interface ReportsResponse {
  report: Report[]
}

interface SignalsResponse {
  signal: Signal[]
}

interface SubscriptionResponse {
  report: Report[]
}

interface MagSensorsResponse {
  mag_to_building: { mag_id: number }[]
}

interface MagReportsResponse {
  mag_report: MagReport[]
}

interface MagSubscriptionResponse {
  mag_report: MagReport[]
}

export interface MagChartPoint {
  timestamp: number
  x: number | null
  y: number | null
  z: number | null
  total: number | null
}

export const SIGNAL_COLORS = [
  '#4457c2', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
] as const

export function getSignalColorByType(signalType: number): string {
  return SIGNAL_COLORS[signalType % SIGNAL_COLORS.length]!
}

export function getSignalLabel(
  signalType: number,
  mappings: SensorMappings | null,
): string {
  return mappings?.[String(signalType)] ?? `Type ${signalType}`
}

export interface ParsedSignal extends Signal {
  signalType: number
  confidence: number
  readings: number
  status: string
}

export interface ChartPoint {
  timestamp: number
  flowValue: number | null
}

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '6h' | '24h' | 'all'

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1 min' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
  { value: 'all', label: 'All' },
]

export const RANGE_MS: Record<TimeRange, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  all: 0,
}

export const TICK_INTERVAL_MS: Record<TimeRange, number> = {
  '1m': 10_000,
  '5m': 60_000,
  '15m': 5 * 60_000,
  '1h': 10 * 60_000,
  '6h': 60 * 60_000,
  '24h': 3 * 60 * 60_000,
  all: 6 * 60 * 60_000,
}

const FETCH_BUFFER = 2
const MAX_CHART_POINTS = 1500
const FLUSH_INTERVAL_MS = 500

function computeTimeWindow(
  range: TimeRange,
  offset: number,
): { since: string; until: string } {
  if (range === 'all') {
    return {
      since: '1970-01-01T00:00:00Z',
      until: new Date(Date.now() + 86_400_000).toISOString(),
    }
  }
  const rangeMs = RANGE_MS[range]
  const now = Date.now()
  const untilMs = now - rangeMs * offset
  const sinceMs = untilMs - rangeMs
  return {
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
  }
}

function reportToPoint(r: Report, multiplier: number): ChartPoint {
  return {
    timestamp: new Date(r.created_at).getTime(),
    flowValue: r.flow_value != null ? -r.flow_value * multiplier : r.flow_value,
  }
}

function trimToWindow(points: ChartPoint[], range: TimeRange): ChartPoint[] {
  if (range === 'all') return points
  const cutoff = Date.now() - RANGE_MS[range] * FETCH_BUFFER
  return points.filter((p) => p.timestamp >= cutoff)
}

function downsample(points: ChartPoint[], maxPoints: number): ChartPoint[] {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const result: ChartPoint[] = []
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]!)
  }
  return result
}

function generateTicks(
  range: TimeRange,
  dataMin: number,
  dataMax: number,
): number[] {
  const step = TICK_INTERVAL_MS[range]
  const start = Math.ceil(dataMin / step) * step
  const ticks: number[] = []
  for (let t = start; t <= dataMax; t += step) {
    ticks.push(t)
  }
  return ticks
}

export function useReportsPage(initialSensorId?: number | null) {
  const {
    data: sensorsData,
    loading: sensorsLoading,
    executeQuery: fetchSensors,
  } = useGraphQL<SensorsResponse>(GET_SENSORS)

  const {
    data: reportsData,
    loading: reportsLoading,
    error: reportsError,
    executeQuery: fetchReports,
  } = useGraphQL<ReportsResponse>(GET_REPORTS_BY_SENSOR_ID)

  const { data: signalsData, executeQuery: fetchSignals } =
    useGraphQL<SignalsResponse>(GET_SIGNALS_BY_SENSOR_ID)

  const { executeQuery: fetchMagSensors } =
    useGraphQL<MagSensorsResponse>(GET_MAG_SENSORS_BY_BUILDING_ID)

  const { data: magReportsData, executeQuery: fetchMagReports } =
    useGraphQL<MagReportsResponse>(GET_MAG_REPORTS_BY_SENSOR_IDS)

  const { executeQuery: executeMappingsUpdate } = useGraphQL<{
    update_sensor_by_pk: { id: number; mappings: SensorMappings }
  }>(UPDATE_SENSOR_MAPPINGS)

  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(
    initialSensorId ?? null,
  )
  const [timeRange, setTimeRange] = useState<TimeRange>('15m')
  const [isLive, setIsLive] = useState(true)
  const [liveChartData, setLiveChartData] = useState<ChartPoint[]>([])
  const [periodOffset, setPeriodOffset] = useState(0)

  const bufferRef = useRef<ChartPoint[]>([])
  const lastSeenIdRef = useRef<number | null>(null)
  const timeRangeRef = useRef(timeRange)
  timeRangeRef.current = timeRange
  const multiplierRef = useRef(1)

  // --- Subscription ---

  const subscriptionVars = useMemo(
    () =>
      selectedSensorId !== null ? { sensorId: selectedSensorId } : undefined,
    [selectedSensorId],
  )

  const { data: subData, connected } = useSubscription<SubscriptionResponse>(
    LATEST_REPORT_SUBSCRIPTION,
    subscriptionVars,
    isLive && selectedSensorId !== null && timeRange !== 'all' && periodOffset === 0,
  )

  useEffect(() => {
    if (!subData?.report?.length) return
    const report = subData.report[0]!
    if (report.id === lastSeenIdRef.current) return
    lastSeenIdRef.current = report.id
    bufferRef.current.push(reportToPoint(report, multiplierRef.current))
  }, [subData])

  useEffect(() => {
    if (!isLive || timeRange === 'all') return

    const interval = setInterval(() => {
      const pending = bufferRef.current
      if (pending.length === 0) return
      bufferRef.current = []

      setLiveChartData((prev) => {
        const merged = [...prev, ...pending]
        return trimToWindow(merged, timeRangeRef.current)
      })
    }, FLUSH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isLive, timeRange])

  // --- Sensors ---

  useEffect(() => {
    fetchSensors()
  }, [fetchSensors])

  useEffect(() => {
    if (sensorsData?.sensor?.length && selectedSensorId === null) {
      setSelectedSensorId(sensorsData.sensor[sensorsData.sensor.length - 1]!.id)
    }
  }, [sensorsData, selectedSensorId])

  // --- Historical fetch ---

  useEffect(() => {
    if (selectedSensorId !== null) {
      const { since, until } = computeTimeWindow(timeRange, periodOffset)
      fetchReports({
        sensorId: selectedSensorId,
        since,
        until,
      })
      fetchSignals({
        sensorId: selectedSensorId,
        since,
        until,
      })
    }
  }, [selectedSensorId, timeRange, periodOffset, fetchReports, fetchSignals])

  useEffect(() => {
    if (!reportsData?.report) return
    const m = multiplierRef.current
    const points = [...reportsData.report]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((r) => reportToPoint(r, m))
    setLiveChartData(points)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [reportsData])

  // --- Mag data fetch + subscription ---

  const [magSensorIds, setMagSensorIds] = useState<number[]>([])
  const [liveMagData, setLiveMagData] = useState<MagChartPoint[]>([])
  const magBufferRef = useRef<MagChartPoint[]>([])
  const lastMagIdRef = useRef<number | null>(null)

  const selectedBuildingId = useMemo(() => {
    if (selectedSensorId === null || !sensorsData?.sensor) return null
    const sensor = sensorsData.sensor.find((s) => s.id === selectedSensorId)
    return sensor?.building_id ?? null
  }, [selectedSensorId, sensorsData])

  useEffect(() => {
    if (selectedBuildingId === null) {
      setMagSensorIds([])
      return
    }
    fetchMagSensors({ buildingId: selectedBuildingId }).then((result) => {
      if (!result?.mag_to_building?.length) {
        setMagSensorIds([])
        return
      }
      setMagSensorIds(result.mag_to_building.map((m) => m.mag_id))
    })
  }, [selectedBuildingId, fetchMagSensors])

  useEffect(() => {
    if (magSensorIds.length === 0) return
    const { since, until } = computeTimeWindow(timeRange, periodOffset)
    fetchMagReports({ sensorIds: magSensorIds, since, until })
  }, [magSensorIds, timeRange, periodOffset, fetchMagReports])

  // Seed live mag data from historical fetch
  useEffect(() => {
    if (!magReportsData?.mag_report) return
    const points = [...magReportsData.mag_report]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((r) => ({
        timestamp: new Date(r.created_at).getTime(),
        x: r.x_axis_reading,
        y: r.y_axis_reading,
        z: r.z_axis_reading,
        total: r.total_magnitude,
      }))
    setLiveMagData(points)
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [magReportsData])

  // Mag subscription
  const magSubVars = useMemo(
    () => (magSensorIds.length > 0 ? { sensorIds: magSensorIds } : undefined),
    [magSensorIds],
  )

  const { data: magSubData } = useSubscription<MagSubscriptionResponse>(
    LATEST_MAG_REPORT_SUBSCRIPTION,
    magSubVars,
    isLive && magSensorIds.length > 0 && timeRange !== 'all' && periodOffset === 0,
  )

  useEffect(() => {
    if (!magSubData?.mag_report?.length) return
    const report = magSubData.mag_report[0]!
    if (report.id === lastMagIdRef.current) return
    lastMagIdRef.current = report.id
    magBufferRef.current.push({
      timestamp: new Date(report.created_at).getTime(),
      x: report.x_axis_reading,
      y: report.y_axis_reading,
      z: report.z_axis_reading,
      total: report.total_magnitude,
    })
  }, [magSubData])

  // Flush mag buffer on interval (same as flow)
  useEffect(() => {
    if (!isLive || timeRange === 'all') return

    const interval = setInterval(() => {
      const pending = magBufferRef.current
      if (pending.length === 0) return
      magBufferRef.current = []

      setLiveMagData((prev) => {
        const merged = [...prev, ...pending]
        if (timeRangeRef.current === 'all') return merged
        const cutoff = Date.now() - RANGE_MS[timeRangeRef.current] * FETCH_BUFFER
        return merged.filter((p) => p.timestamp >= cutoff)
      })
    }, FLUSH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isLive, timeRange])

  const magChartData = useMemo<MagChartPoint[]>(() => {
    if (!isLive || timeRange === 'all' || periodOffset > 0) {
      if (!magReportsData?.mag_report?.length) return []
      return [...magReportsData.mag_report]
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .map((r) => ({
          timestamp: new Date(r.created_at).getTime(),
          x: r.x_axis_reading,
          y: r.y_axis_reading,
          z: r.z_axis_reading,
          total: r.total_magnitude,
        }))
    }
    return liveMagData
  }, [isLive, timeRange, periodOffset, magReportsData, liveMagData])

  // --- Computed ---

  const sensors = useMemo(() => sensorsData?.sensor ?? [], [sensorsData])

  const selectedSensor = useMemo(
    () => sensors.find((s) => s.id === selectedSensorId) ?? null,
    [sensors, selectedSensorId],
  )

  const sensorMultiplier = useMemo(
    () => selectedSensor?.multiplier ?? 1,
    [selectedSensor],
  )
  multiplierRef.current = sensorMultiplier

  const rawChartData = useMemo(() => {
    if (!isLive || timeRange === 'all' || periodOffset > 0) {
      if (!reportsData?.report?.length) return []
      return [...reportsData.report]
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        )
        .map((r) => reportToPoint(r, sensorMultiplier))
    }
    return liveChartData
  }, [isLive, timeRange, periodOffset, reportsData, liveChartData, sensorMultiplier])

  const chartData = useMemo(
    () => downsample(rawChartData, MAX_CHART_POINTS),
    [rawChartData],
  )

  const xTicks = useMemo(() => {
    if (chartData.length < 2) return []
    const min = chartData[0]!.timestamp
    const max = chartData[chartData.length - 1]!.timestamp
    return generateTicks(timeRange, min, max)
  }, [chartData, timeRange])

  const parsedSignals = useMemo<ParsedSignal[]>(() => {
    const raw = signalsData?.signal ?? []
    const result: ParsedSignal[] = []
    for (const s of raw) {
      const parsed = parseSignalValue(s.value)
      if (parsed) {
        result.push({
          ...s,
          signalType: parsed.signal_type,
          confidence: parsed.confidence,
          readings: parsed.readings,
          status: parsed.status,
        })
      }
    }
    return result
  }, [signalsData])

  const signalTypeIds = useMemo(() => {
    const unique = [...new Set(parsedSignals.map((s) => s.signalType))]
    unique.sort((a, b) => a - b)
    return unique
  }, [parsedSignals])

  const sensorMappings = useMemo(
    () => selectedSensor?.mappings ?? null,
    [selectedSensor],
  )

  const selectedSensorName = useMemo(
    () => selectedSensor?.name ?? null,
    [selectedSensor],
  )

  // --- Handlers ---

  const handleSensorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedSensorId(Number(e.target.value))
      setPeriodOffset(0)
      bufferRef.current = []
      lastSeenIdRef.current = null
    },
    [],
  )

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
    setPeriodOffset(0)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [])

  const handleToggleLive = useCallback(() => {
    setIsLive((prev) => !prev)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [])

  const handlePreviousPeriod = useCallback(() => {
    setPeriodOffset((prev) => prev + 1)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [])

  const handleNextPeriod = useCallback(() => {
    setPeriodOffset((prev) => Math.max(0, prev - 1))
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [])

  const updateMapping = useCallback(
    async (signalType: number, label: string) => {
      if (selectedSensorId === null) return
      const updated = { ...sensorMappings, [String(signalType)]: label }
      await executeMappingsUpdate({ id: selectedSensorId, mappings: updated })
      await fetchSensors()
    },
    [selectedSensorId, sensorMappings, executeMappingsUpdate, fetchSensors],
  )

  return {
    sensors,
    selectedSensorId,
    selectedSensorName,
    chartData,
    rawChartData,
    xTicks,
    timeRange,
    periodOffset,
    isLive,
    connected,
    sensorsLoading,
    reportsLoading,
    reportsError,
    magChartData,
    parsedSignals,
    signalTypeIds,
    sensorMappings,
    updateMapping,
    handleSensorChange,
    handleTimeRangeChange,
    handleToggleLive,
    handlePreviousPeriod,
    handleNextPeriod,
  }
}

export default useReportsPage
