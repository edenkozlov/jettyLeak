import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { useSubscription } from '@/hooks/useSubscription'
import { GET_SENSORS } from '@/queries/getSensors'
import { GET_SENSOR_DATA } from '@/queries/getSensorData'
import {
  GET_MAG_SENSORS_BY_BUILDING_ID,
} from '@/queries/getMagDataByBuildingId'
import { UPDATE_SENSOR_MAPPINGS } from '@/mutations/sensorMutations'
import { LATEST_REPORT_SUBSCRIPTION } from '@/queries/reportSubscription'
import { LATEST_MAG_REPORT_SUBSCRIPTION } from '@/queries/magReportSubscription'

import type { MagReport, Report, Sensor, Signal, SensorMappings } from '@/types'
import { parseSignalValue } from '@/types'

interface SensorsResponse {
  sensor: Sensor[]
}

interface SensorDataResponse {
  report: Report[]
  signal: Signal[]
  mag_report: MagReport[]
}

interface SubscriptionResponse {
  report: Report[]
}

interface MagSensorsResponse {
  mag_to_building: { mag_id: number }[]
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
  angle: number | null
  bandEnergy10s: number | null
  bandEnergy60s: number | null
  bandEnergy5m: number | null
  dominantFreqHz: number | null
  vibrationRpm: number | null
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

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '6h' | '12h' | '24h' | 'all' | 'custom'

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1 min' },
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
  { value: 'all', label: 'All' },
]

export const RANGE_MS: Record<TimeRange, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  all: 0,
  custom: 0,
}

export const TICK_INTERVAL_MS: Record<TimeRange, number> = {
  '1m': 10_000,
  '5m': 60_000,
  '15m': 5 * 60_000,
  '1h': 10 * 60_000,
  '6h': 60 * 60_000,
  '12h': 2 * 60 * 60_000,
  '24h': 3 * 60 * 60_000,
  all: 6 * 60 * 60_000,
  custom: 0, // computed dynamically
}

function pickTickInterval(rangeMs: number): number {
  if (rangeMs <= 60_000) return 10_000
  if (rangeMs <= 5 * 60_000) return 60_000
  if (rangeMs <= 15 * 60_000) return 5 * 60_000
  if (rangeMs <= 60 * 60_000) return 10 * 60_000
  if (rangeMs <= 6 * 60 * 60_000) return 60 * 60_000
  if (rangeMs <= 12 * 60 * 60_000) return 2 * 60 * 60_000
  if (rangeMs <= 24 * 60 * 60_000) return 3 * 60 * 60_000
  return 6 * 60 * 60_000
}

const MAX_CHART_POINTS = 1500
const FLUSH_INTERVAL_MS = 500


function computeTimeWindow(
  range: TimeRange,
  offset: number,
  customWindow?: { since: string; until: string },
): { since: string; until: string } {
  if (range === 'custom' && customWindow) {
    return customWindow
  }
  if (range === 'all' || range === 'custom') {
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

function magToPoint(r: MagReport): MagChartPoint {
  return {
    timestamp: new Date(r.created_at).getTime(),
    x: r.x_axis_reading,
    y: r.y_axis_reading,
    z: r.z_axis_reading,
    total: r.total_magnitude,
    angle:
      r.x_axis_reading != null && r.y_axis_reading != null
        ? (Math.atan2(r.y_axis_reading, r.x_axis_reading) * 180) / Math.PI
        : null,
    bandEnergy10s: r.band_energy_10s,
    bandEnergy60s: r.band_energy_60s,
    bandEnergy5m: r.band_energy_5m,
    dominantFreqHz: r.dominant_freq_hz,
    vibrationRpm: r.vibration_rpm,
  }
}

function filterPointsToWindow<T extends { timestamp: number }>(
  points: T[],
  range: TimeRange,
  offset: number,
  customWindow?: { since: string; until: string },
): T[] {
  if (range === 'all') return points

  const { since, until } = computeTimeWindow(range, offset, customWindow)
  const sinceMs = new Date(since).getTime()
  const untilMs = new Date(until).getTime()

  return points.filter((point) => point.timestamp >= sinceMs && point.timestamp <= untilMs)
}

function downsample<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const result: T[] = []
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
  const step = range === 'custom'
    ? pickTickInterval(dataMax - dataMin)
    : TICK_INTERVAL_MS[range]
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
    data: sensorData,
    loading: sensorDataLoading,
    error: sensorDataError,
    executeQuery: fetchSensorData,
  } = useGraphQL<SensorDataResponse>(GET_SENSOR_DATA)

  // Separate hook for mag-data supplement so its requestIdRef
  // can never discard the primary report/signal fetch.
  const { data: magSupplementData, executeQuery: fetchMagSupplement } =
    useGraphQL<SensorDataResponse>(GET_SENSOR_DATA)

  const { executeQuery: fetchMagSensors } =
    useGraphQL<MagSensorsResponse>(GET_MAG_SENSORS_BY_BUILDING_ID)

  const { executeQuery: executeMappingsUpdate } = useGraphQL<{
    update_sensor_by_pk: { id: number; mappings: SensorMappings }
  }>(UPDATE_SENSOR_MAPPINGS)

  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(
    initialSensorId ?? null,
  )
  const [timeRange, setTimeRange] = useState<TimeRange>('15m')
  const [customWindow, setCustomWindow] = useState<{ since: string; until: string } | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [liveBuffer, setLiveBuffer] = useState<ChartPoint[]>([])
  const [periodOffset, setPeriodOffset] = useState(0)

  const bufferRef = useRef<ChartPoint[]>([])
  const lastSeenIdRef = useRef<number | null>(null)
  const timeRangeRef = useRef(timeRange)
  timeRangeRef.current = timeRange
  const multiplierRef = useRef(1)

  useEffect(() => {
    if (initialSensorId != null && initialSensorId !== selectedSensorId) {
      setSelectedSensorId(initialSensorId)
      setPeriodOffset(0)
      setLiveBuffer([])
      bufferRef.current = []
      lastSeenIdRef.current = null
      setLiveMagData([])
      magBufferRef.current = []
      lastMagIdRef.current = null
    }
  }, [initialSensorId]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Subscription ---

  const subscriptionVars = useMemo(
    () =>
      selectedSensorId !== null ? { sensorId: selectedSensorId } : undefined,
    [selectedSensorId],
  )

  const { data: subData, connected } = useSubscription<SubscriptionResponse>(
    LATEST_REPORT_SUBSCRIPTION,
    subscriptionVars,
    isLive && selectedSensorId !== null && timeRange !== 'all' && timeRange !== 'custom' && periodOffset === 0,
  )

  useEffect(() => {
    if (!subData?.report?.length) return
    const report = subData.report[0]!
    if (
      report.sensor_id != null &&
      selectedSensorId != null &&
      Number(report.sensor_id) !== selectedSensorId
    ) {
      return
    }
    if (report.id === lastSeenIdRef.current) return
    lastSeenIdRef.current = report.id
    // Only buffer points within the current time window (ignore stale subscription data)
    const range = timeRangeRef.current
    if (range !== 'all' && range !== 'custom') {
      const cutoff = Date.now() - RANGE_MS[range] * 2
      if (new Date(report.created_at).getTime() < cutoff) return
    }
    bufferRef.current.push(reportToPoint(report, multiplierRef.current))
  }, [subData, selectedSensorId])

  useEffect(() => {
    if (!isLive || timeRange === 'all' || timeRange === 'custom') return

    const interval = setInterval(() => {
      const pending = bufferRef.current
      if (pending.length === 0) return
      bufferRef.current = []

      setLiveBuffer((prev) => [...prev, ...pending])
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

  // --- Mag sensor IDs (lightweight lookup, cached in state) ---

  const [magSensorIds, setMagSensorIds] = useState<number[]>([])
  const [liveMagData, setLiveMagData] = useState<MagChartPoint[]>([])
  const magBufferRef = useRef<MagChartPoint[]>([])
  const lastMagIdRef = useRef<number | null>(null)

  const sensorsLoaded = !!sensorsData?.sensor?.length

  const selectedBuildingId = useMemo(() => {
    if (selectedSensorId === null || !sensorsData?.sensor) return null
    const sensor = sensorsData.sensor.find((s) => s.id === selectedSensorId)
    return sensor?.building_id ?? null
  }, [selectedSensorId, sensorsData])

  useEffect(() => {
    // Don't resolve yet if sensors haven't loaded — we can't know the building ID
    if (!sensorsLoaded) return
    if (selectedBuildingId === null) {
      setMagSensorIds([])
      return
    }
    fetchMagSensors({ buildingId: selectedBuildingId }).then((result) => {
      if (!result?.mag_to_building?.length) {
        setMagSensorIds([])
      } else {
        setMagSensorIds(result.mag_to_building.map((m) => m.mag_id))
      }
    })
  }, [selectedBuildingId, sensorsLoaded, fetchMagSensors])

  // --- Historical fetch (reports + signals) ---

  const prevFetchKeyRef = useRef('')

  useEffect(() => {
    if (selectedSensorId === null) return
    if (timeRange === 'custom' && !customWindow) return

    const fetchKey = `${selectedSensorId}-${timeRange}-${periodOffset}-${customWindow?.since}-${customWindow?.until}`
    if (fetchKey === prevFetchKeyRef.current) return
    prevFetchKeyRef.current = fetchKey

    setLiveBuffer([])
    bufferRef.current = []
    lastSeenIdRef.current = null
    setLiveMagData([])
    magBufferRef.current = []
    lastMagIdRef.current = null

    const { since, until } = computeTimeWindow(timeRange, periodOffset, customWindow ?? undefined)
    fetchSensorData({
      sensorId: selectedSensorId,
      since,
      until,
      magSensorIds: [],
    })
  }, [selectedSensorId, timeRange, periodOffset, customWindow, fetchSensorData])

  // --- Mag historical fetch (separate hook, can never discard the report fetch) ---

  useEffect(() => {
    if (selectedSensorId === null) return
    if (magSensorIds.length === 0) return
    if (timeRange === 'custom' && !customWindow) return

    const { since, until } = computeTimeWindow(timeRange, periodOffset, customWindow ?? undefined)
    fetchMagSupplement({
      sensorId: selectedSensorId,
      since,
      until,
      magSensorIds,
    })
  }, [selectedSensorId, timeRange, periodOffset, magSensorIds, customWindow, fetchMagSupplement])

  // Mag subscription
  const magSubVars = useMemo(
    () => (magSensorIds.length > 0 ? { sensorIds: magSensorIds } : undefined),
    [magSensorIds],
  )

  const { data: magSubData } = useSubscription<MagSubscriptionResponse>(
    LATEST_MAG_REPORT_SUBSCRIPTION,
    magSubVars,
    isLive && magSensorIds.length > 0 && timeRange !== 'all' && timeRange !== 'custom' && periodOffset === 0,
  )

  useEffect(() => {
    if (!magSubData?.mag_report?.length) return
    const report = magSubData.mag_report[0]!
    if (
      report.sensor_id != null &&
      magSensorIds.length > 0 &&
      !magSensorIds.includes(Number(report.sensor_id))
    ) {
      return
    }
    if (report.id === lastMagIdRef.current) return
    lastMagIdRef.current = report.id
    const range = timeRangeRef.current
    if (range !== 'all' && range !== 'custom') {
      const cutoff = Date.now() - RANGE_MS[range] * 2
      if (new Date(report.created_at).getTime() < cutoff) return
    }
    magBufferRef.current.push(magToPoint(report))
  }, [magSubData, magSensorIds])

  // Flush mag buffer on interval (same as flow)
  useEffect(() => {
    if (!isLive || timeRange === 'all' || timeRange === 'custom') return

    const interval = setInterval(() => {
      const pending = magBufferRef.current
      if (pending.length === 0) return
      magBufferRef.current = []

      setLiveMagData((prev) => [...prev, ...pending])
    }, FLUSH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isLive, timeRange])

  const magChartData = useMemo<MagChartPoint[]>(() => {
    const magReports = magSupplementData?.mag_report ?? []
    const base: MagChartPoint[] = magReports.length
      ? [...magReports]
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
          .map(magToPoint)
      : []
    if (!isLive || timeRange === 'all' || timeRange === 'custom' || periodOffset > 0 || liveMagData.length === 0) {
      return filterPointsToWindow(base, timeRange, periodOffset, customWindow ?? undefined)
    }
    const lastBaseTs = base.length > 0 ? base[base.length - 1]!.timestamp : 0
    const newPoints = liveMagData.filter((p) => p.timestamp > lastBaseTs)
    const merged = newPoints.length === 0 ? base : [...base, ...newPoints]
    return filterPointsToWindow(merged, timeRange, periodOffset, customWindow ?? undefined)
  }, [isLive, timeRange, periodOffset, customWindow, magSupplementData, liveMagData])

  const downsampledMagChartData = useMemo(
    () => downsample(magChartData, MAX_CHART_POINTS),
    [magChartData],
  )

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
    const allReports = sensorData?.report ?? []
    const filtered = allReports.filter((r) => r.sensor_id == null || Number(r.sensor_id) === selectedSensorId)
    console.log('[rawChartData]', {
      allReports: allReports.length,
      filtered: filtered.length,
      sensorDataRef: sensorData,
      liveBuffer: liveBuffer.length,
      selectedSensorId,
      sensorMultiplier,
      isLive,
    })
    const base: ChartPoint[] = filtered.length
      ? [...filtered]
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
          .map((r) => reportToPoint(r, sensorMultiplier))
      : []
    if (!isLive || timeRange === 'all' || timeRange === 'custom' || periodOffset > 0 || liveBuffer.length === 0) {
      return filterPointsToWindow(base, timeRange, periodOffset, customWindow ?? undefined)
    }
    // In live mode, append subscription points that are newer than the fetched data
    const lastBaseTs = base.length > 0 ? base[base.length - 1]!.timestamp : 0
    const newPoints = liveBuffer.filter((p) => p.timestamp > lastBaseTs)
    const merged = newPoints.length === 0 ? base : [...base, ...newPoints]
    return filterPointsToWindow(merged, timeRange, periodOffset, customWindow ?? undefined)
  }, [isLive, timeRange, periodOffset, customWindow, sensorData, liveBuffer, sensorMultiplier, selectedSensorId])

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
    const raw = sensorData?.signal ?? []
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
  }, [sensorData])

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
    (sensorId: number) => {
      setSelectedSensorId(sensorId)
      setPeriodOffset(0)
      setLiveBuffer([])
      bufferRef.current = []
      lastSeenIdRef.current = null
      setLiveMagData([])
      magBufferRef.current = []
      lastMagIdRef.current = null
    },
    [],
  )

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
    if (range !== 'custom') setCustomWindow(null)
    setPeriodOffset(0)
    bufferRef.current = []
    lastSeenIdRef.current = null
  }, [])

  const handleCustomRange = useCallback((since: string, until: string) => {
    setTimeRange('custom')
    setCustomWindow({ since, until })
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
    reportsLoading: sensorDataLoading,
    reportsError: sensorDataError,
    magChartData: downsampledMagChartData,
    parsedSignals,
    signalTypeIds,
    sensorMappings,
    updateMapping,
    handleSensorChange,
    customWindow,
    handleTimeRangeChange,
    handleCustomRange,
    handleToggleLive,
    handlePreviousPeriod,
    handleNextPeriod,
  }
}

export default useReportsPage
