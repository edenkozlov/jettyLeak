import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { useSubscription } from '@/hooks/useSubscription'
import { GET_SENSORS } from '@/queries/getSensors'
import { GET_REPORTS_BY_SENSOR_ID } from '@/queries/getReportsBySensorId'
import { GET_SIGNALS_BY_SENSOR_ID } from '@/queries/getSignalsBySensorId'
import { UPDATE_SENSOR_MAPPINGS } from '@/mutations/sensorMutations'
import { LATEST_REPORT_SUBSCRIPTION } from '@/queries/reportSubscription'

import type { Report, Sensor, Signal, SensorMappings } from '@/types'
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

export const SIGNAL_COLORS = [
  '#6366f1', // indigo
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

const QUERY_LIMITS: Record<TimeRange, number> = {
  '1m': 1000,
  '5m': 5000,
  '15m': 10000,
  '1h': 36000,
  '6h': 10000,
  '24h': 10000,
  all: 10000,
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

const FETCH_BUFFER = 3
const MAX_CHART_POINTS = 1500
const FLUSH_INTERVAL_MS = 500

function fetchSinceTimestamp(range: TimeRange): string {
  if (range === 'all') return '1970-01-01T00:00:00Z'
  return new Date(Date.now() - RANGE_MS[range] * FETCH_BUFFER).toISOString()
}

function reportToPoint(r: Report): ChartPoint {
  return {
    timestamp: new Date(r.created_at).getTime(),
    flowValue: r.flow_value,
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

export function useReportsPage() {
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

  const { executeQuery: executeMappingsUpdate } = useGraphQL<{
    update_sensor_by_pk: { id: number; mappings: SensorMappings }
  }>(UPDATE_SENSOR_MAPPINGS)

  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('1m')
  const [isLive, setIsLive] = useState(true)
  const [liveChartData, setLiveChartData] = useState<ChartPoint[]>([])

  const bufferRef = useRef<ChartPoint[]>([])
  const lastSeenIdRef = useRef<number | null>(null)
  const timeRangeRef = useRef(timeRange)
  timeRangeRef.current = timeRange

  // --- Subscription ---

  const subscriptionVars = useMemo(
    () =>
      selectedSensorId !== null ? { sensorId: selectedSensorId } : undefined,
    [selectedSensorId],
  )

  const { data: subData, connected } = useSubscription<SubscriptionResponse>(
    LATEST_REPORT_SUBSCRIPTION,
    subscriptionVars,
    isLive && selectedSensorId !== null && timeRange !== 'all',
  )

  useEffect(() => {
    if (!subData?.report?.length) return
    const report = subData.report[0]!
    if (report.id === lastSeenIdRef.current) return
    lastSeenIdRef.current = report.id
    bufferRef.current.push(reportToPoint(report))
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
      setSelectedSensorId(sensorsData.sensor[0]!.id)
    }
  }, [sensorsData, selectedSensorId])

  // --- Historical fetch ---

  useEffect(() => {
    if (selectedSensorId !== null) {
      fetchReports({
        sensorId: selectedSensorId,
        since: fetchSinceTimestamp(timeRange),
        limit:
          timeRange === 'all'
            ? QUERY_LIMITS[timeRange]
            : QUERY_LIMITS[timeRange] * FETCH_BUFFER,
      })
      fetchSignals({
        sensorId: selectedSensorId,
        since: fetchSinceTimestamp(timeRange),
      })
    }
  }, [selectedSensorId, timeRange, fetchReports, fetchSignals])

  useEffect(() => {
    if (!reportsData?.report) return
    const points = [...reportsData.report]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map(reportToPoint)
    setLiveChartData(points)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [reportsData])

  // --- Computed ---

  const sensors = useMemo(() => sensorsData?.sensor ?? [], [sensorsData])

  const chartData = useMemo(() => {
    let points: ChartPoint[]

    if (!isLive || timeRange === 'all') {
      if (!reportsData?.report?.length) return []
      points = [...reportsData.report]
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        )
        .map(reportToPoint)
    } else {
      points = liveChartData
    }

    return downsample(points, MAX_CHART_POINTS)
  }, [isLive, timeRange, reportsData, liveChartData])

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

  const selectedSensor = useMemo(
    () => sensors.find((s) => s.id === selectedSensorId) ?? null,
    [sensors, selectedSensorId],
  )

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
      bufferRef.current = []
      lastSeenIdRef.current = null
    },
    [],
  )

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [])

  const handleToggleLive = useCallback(() => {
    setIsLive((prev) => !prev)
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
    xTicks,
    timeRange,
    isLive,
    connected,
    sensorsLoading,
    reportsLoading,
    reportsError,
    parsedSignals,
    signalTypeIds,
    sensorMappings,
    updateMapping,
    handleSensorChange,
    handleTimeRangeChange,
    handleToggleLive,
  }
}

export default useReportsPage
