import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import useAuth from '@/hooks/auth/useAuth'
import { useGraphQL } from '@/hooks/useGraphQL'
import { useSubscription } from '@/hooks/useSubscription'
import { GET_SENSORS, GET_SENSORS_BY_CLIENT_ID } from '@/queries/getSensors'
import {
  GET_MAG_DOWNSAMPLED,
  GET_FLOW_ANALYTICS,
  type FlowHourlyRow,
} from '@/queries/getFlowAnalytics'
import { GET_REPORT_DOWNSAMPLED } from '@/queries/getReportDownsampled'
import { GET_SIGNAL_DOWNSAMPLED } from '@/queries/getSignalSummary'
import {
  GET_MAG_SENSORS_BY_BUILDING_ID,
} from '@/queries/getMagDataByBuildingId'
import { UPDATE_SENSOR_MAPPINGS } from '@/mutations/sensorMutations'
import { LATEST_REPORT_SUBSCRIPTION } from '@/queries/reportSubscription'

import type { MagReport, Report, Sensor, Signal, SensorMappings } from '@/types'
import { parseSignalValue } from '@/types'

/**
 * Server-side downsampled fetch for report + signal data.
 * Returns ~1500 report points + up to 500 signal intervals via RPCs,
 * instead of fetching 100K+ raw rows and downsampling client-side.
 */
async function fetchSensorDataOptimized(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId as number
  const since = variables?.since as string
  const until = variables?.until as string

  const [reportResult, signalResult] = await Promise.all([
    GET_REPORT_DOWNSAMPLED({ sensorId, since, until, maxPoints: 1000 }),
    GET_SIGNAL_DOWNSAMPLED({ sensorId, since, until, maxRows: 500 }),
  ])

  return {
    report: reportResult.report as unknown as Report[],
    signal: signalResult.signal as unknown as Signal[],
    mag_report: [] as MagReport[],
  }
}

/**
 * Server-side downsampled fetch for mag data.
 * Returns ~1500 evenly-spaced points via NTILE bucketing on the database,
 * instead of fetching all raw mag_report rows.
 */
async function fetchMagOptimized(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const since = variables?.since as string
  const until = variables?.until as string
  if (!sensorIds || sensorIds.length === 0) return { mag_report: [] as MagReport[] }
  const result = await GET_MAG_DOWNSAMPLED({ sensorIds, since, until, maxPoints: 1000 })
  return { mag_report: result.mag_report as unknown as MagReport[] }
}

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
  '#0ea5e9', // sky
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

const MAG_ANOMALY_THRESHOLD = 500

/** Remove isolated spike points where the value jumps far from both neighbours. */
function filterMagAnomalies(points: MagChartPoint[]): MagChartPoint[] {
  if (points.length < 3) return points
  const result: MagChartPoint[] = [points[0]!]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const next = points[i + 1]!
    let isAnomaly = false
    for (const key of ['x', 'y', 'z', 'total'] as const) {
      const pv = prev[key]
      const cv = curr[key]
      const nv = next[key]
      if (pv == null || cv == null || nv == null) continue
      if (
        Math.abs(cv - pv) > MAG_ANOMALY_THRESHOLD &&
        Math.abs(cv - nv) > MAG_ANOMALY_THRESHOLD
      ) {
        isAnomaly = true
        break
      }
    }
    if (!isAnomaly) result.push(curr)
  }
  result.push(points[points.length - 1]!)
  return result
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

export function useReportsPage(initialSensorId?: number | null, initialTimeRange?: TimeRange) {
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const sensorsQuery = isClient ? GET_SENSORS_BY_CLIENT_ID : GET_SENSORS

  const {
    data: sensorsData,
    loading: sensorsLoading,
    executeQuery: fetchSensors,
  } = useGraphQL<SensorsResponse>(sensorsQuery)

  const {
    data: sensorData,
    loading: sensorDataLoading,
    error: sensorDataError,
    executeQuery: fetchSensorData,
  } = useGraphQL<SensorDataResponse>(fetchSensorDataOptimized)

  // Separate hook for mag data — server-side downsampled via get_mag_downsampled RPC
  const { data: magSupplementData, loading: magSupplementLoading, executeQuery: fetchMagSupplement } =
    useGraphQL<{ mag_report: MagReport[] }>(fetchMagOptimized)

  const { executeQuery: fetchMagSensors } =
    useGraphQL<MagSensorsResponse>(GET_MAG_SENSORS_BY_BUILDING_ID)

  const { executeQuery: executeMappingsUpdate } = useGraphQL<{
    update_sensor_by_pk: { id: number; mappings: SensorMappings }
  }>(UPDATE_SENSOR_MAPPINGS)

  // Stable refs for all fetch functions — NEVER put these in dependency arrays
  const fetchSensorsRef = useRef(fetchSensors)
  fetchSensorsRef.current = fetchSensors
  const fetchSensorDataRef = useRef(fetchSensorData)
  fetchSensorDataRef.current = fetchSensorData
  const fetchMagSupplementRef = useRef(fetchMagSupplement)
  fetchMagSupplementRef.current = fetchMagSupplement
  const fetchMagSensorsRef = useRef(fetchMagSensors)
  fetchMagSensorsRef.current = fetchMagSensors
  const executeMappingsUpdateRef = useRef(executeMappingsUpdate)
  executeMappingsUpdateRef.current = executeMappingsUpdate

  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(
    initialSensorId ?? null,
  )
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange ?? '15m')
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
      setMagSensorIds([])
      setMagSensorIdsResolved(false)
      setMagFetchWindow(null)
    }
  }, [initialSensorId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialTimeRange != null && initialTimeRange !== timeRange) {
      setTimeRange(initialTimeRange)
      setPeriodOffset(0)
      bufferRef.current = []
      lastSeenIdRef.current = null
    }
  }, [initialTimeRange]) // eslint-disable-line react-hooks/exhaustive-deps

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
    'report',
    'sensor_id',
    selectedSensorId ?? undefined,
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
    if (isClient) {
      fetchSensorsRef.current({ clientId: client_id })
    } else {
      fetchSensorsRef.current()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, client_id])

  useEffect(() => {
    if (sensorsData?.sensor?.length && selectedSensorId === null) {
      setSelectedSensorId(sensorsData.sensor[sensorsData.sensor.length - 1]!.id)
    }
  }, [sensorsData, selectedSensorId])

  // --- Mag sensor IDs (lightweight lookup, cached in state) ---

  const [magSensorIds, setMagSensorIds] = useState<number[]>([])
  const [magSensorIdsResolved, setMagSensorIdsResolved] = useState(false)
  const [magFetchWindow, setMagFetchWindow] = useState<{ since: string; until: string } | null>(null)
  const [flowHourlyRows, setFlowHourlyRows] = useState<FlowHourlyRow[]>([])

  // mag_report rows use sensor_id → sensor(id). Data may be stored under the same id as the
  // selected flow sensor even when mag_to_building only lists other mag hardware for the building.
  // Wait until the building lookup completes before populating — prevents a premature fetch
  // with just [selectedSensorId] followed by a second fetch with the resolved IDs.
  const magSensorIdsForQuery = useMemo(() => {
    if (selectedSensorId === null) return []
    if (!magSensorIdsResolved) return []
    return [...new Set([...magSensorIds, selectedSensorId])]
  }, [magSensorIds, selectedSensorId, magSensorIdsResolved])

  const sensorsLoaded = !!sensorsData?.sensor?.length

  const selectedBuildingId = useMemo(() => {
    if (selectedSensorId === null || !sensorsData?.sensor) return null
    const sensor = sensorsData.sensor.find((s) => s.id === selectedSensorId)
    return sensor?.building_id ?? null
  }, [selectedSensorId, sensorsData])

  useEffect(() => {
    if (!sensorsLoaded) return
    setMagSensorIds([])
    setMagSensorIdsResolved(false)
    setMagFetchWindow(null)
    if (selectedBuildingId === null) {
      setMagSensorIdsResolved(true)
      return
    }
    fetchMagSensorsRef.current({ buildingId: selectedBuildingId }).then((result) => {
      const ids = result?.mag_to_building?.length
        ? result.mag_to_building.map((m) => m.mag_id)
        : []
      setMagSensorIds(ids)
      setMagSensorIdsResolved(true)
    })
  }, [selectedBuildingId, sensorsLoaded])

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

    const { since, until } = computeTimeWindow(timeRange, periodOffset, customWindow ?? undefined)
    fetchSensorDataRef.current({
      sensorId: selectedSensorId,
      since,
      until,
      magSensorIds: [],
    })
  }, [selectedSensorId, timeRange, periodOffset, customWindow])

  // --- Mag historical fetch (separate hook) ---

  const prevMagFetchKeyRef = useRef('')

  useEffect(() => {
    if (selectedSensorId === null) return
    if (magSensorIdsForQuery.length === 0) return
    if (timeRange === 'custom' && !customWindow) return

    const magKey = `${magSensorIdsForQuery.join(',')}-${timeRange}-${periodOffset}-${customWindow?.since}-${customWindow?.until}`
    if (magKey === prevMagFetchKeyRef.current) return
    prevMagFetchKeyRef.current = magKey

    const window = computeTimeWindow(timeRange, periodOffset, customWindow ?? undefined)
    setMagFetchWindow(window)
    fetchMagSupplementRef.current({
      sensorIds: magSensorIdsForQuery,
      since: window.since,
      until: window.until,
    })

    // For 6h+ ranges, also fetch pre-computed flow_hourly data
    const rangeMs = RANGE_MS[timeRange]
    if (rangeMs >= 6 * 60 * 60_000 || timeRange === 'all') {
      GET_FLOW_ANALYTICS({
        sensorIds: magSensorIdsForQuery,
        since: window.since,
        until: window.until,
      }).then((result) => setFlowHourlyRows(result.rows))
        .catch(() => setFlowHourlyRows([]))
    } else {
      setFlowHourlyRows([])
    }
  }, [selectedSensorId, timeRange, periodOffset, magSensorIdsForQuery, customWindow])

  // Mag data — historical only, no live subscription.
  // Refetched periodically at slot boundaries by the Reports page via refetchMag().
  const magChartData = useMemo<MagChartPoint[]>(() => {
    if (magSensorIdsForQuery.length === 0) return []
    const magReports = magSupplementData?.mag_report ?? []
    if (magReports.length === 0) return []
    // Discard stale data from a previous sensor/building
    const expectedIds = new Set(magSensorIdsForQuery)
    const matching = magReports.filter((r) => expectedIds.has(Number(r.sensor_id)))
    if (matching.length === 0) return []
    const sorted = [...matching]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(magToPoint)
    const base = filterMagAnomalies(sorted)
    if (timeRange === 'all') return base
    if (magFetchWindow) {
      const sinceMs = new Date(magFetchWindow.since).getTime()
      const untilMs = new Date(magFetchWindow.until).getTime()
      return base.filter((p) => p.timestamp >= sinceMs && p.timestamp <= untilMs)
    }
    return base
  }, [timeRange, magFetchWindow, magSensorIdsForQuery, magSupplementData])

  const downsampledMagChartData = useMemo(
    () => downsample(magChartData, MAX_CHART_POINTS),
    [magChartData],
  )

  const refetchMag = useCallback(async () => {
    if (selectedSensorId === null) return
    if (magSensorIdsForQuery.length === 0) return
    if (timeRange === 'custom' && !customWindow) return
    const window = computeTimeWindow(timeRange, periodOffset, customWindow ?? undefined)
    setMagFetchWindow(window)
    // Refetch mag data + report/signal data in parallel so detector predictions
    // (signals) stay live alongside the mag/flow charts.
    await Promise.all([
      fetchMagSupplementRef.current({
        sensorIds: magSensorIdsForQuery,
        since: window.since,
        until: window.until,
      }),
      fetchSensorDataRef.current({
        sensorId: selectedSensorId,
        since: window.since,
        until: window.until,
        magSensorIds: [],
      }),
    ])
    const rangeMs = RANGE_MS[timeRange]
    if (rangeMs >= 6 * 60 * 60_000 || timeRange === 'all') {
      GET_FLOW_ANALYTICS({
        sensorIds: magSensorIdsForQuery,
        since: window.since,
        until: window.until,
      }).then((result) => setFlowHourlyRows(result.rows))
        .catch(() => setFlowHourlyRows([]))
    }
  }, [selectedSensorId, magSensorIdsForQuery, timeRange, periodOffset, customWindow])

  // --- Computed ---

  const sensors = useMemo(() => {
    const all = sensorsData?.sensor ?? []
    if (isClient) {
      return all.filter((s) => s.building?.client_id === client_id)
    }
    return all
  }, [sensorsData, isClient, client_id])

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
    console.log(`[PARSED SIGNALS] raw count=${raw.length}`)
    const result: ParsedSignal[] = []
    for (const s of raw) {
      const parsed = parseSignalValue(s.value)
      if (parsed) {
        result.push({
          ...s,
          signalType: typeof parsed.signal_type === 'number' ? parsed.signal_type : 0,
          confidence: parsed.confidence ?? 0,
          readings: parsed.readings,
          status: parsed.status ?? '',
        })
      }
    }
    console.log(`[PARSED SIGNALS] parsed count=${result.length}`)
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
      setMagSensorIds([])
      setMagSensorIdsResolved(false)
      setMagFetchWindow(null)
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
      await executeMappingsUpdateRef.current({ id: selectedSensorId, mappings: updated })
      await (isClient ? fetchSensorsRef.current({ clientId: client_id }) : fetchSensorsRef.current())
    },
    [selectedSensorId, sensorMappings, isClient, client_id],
  )

  return {
    sensors,
    selectedSensorId,
    selectedSensorName,
    sensorMultiplier,
    chartData,
    rawChartData,
    xTicks,
    timeRange,
    periodOffset,
    isLive,
    connected,
    sensorsLoading,
    reportsLoading: sensorDataLoading,
    magLoading: magSupplementLoading,
    reportsError: sensorDataError,
    magChartData: downsampledMagChartData,
    magChartDataFull: magChartData,
    magSensorIdsForQuery,
    magFetchWindow,
    flowHourlyRows,
    refetchMag,
    parsedSignals,
    rawSignals: sensorData?.signal ?? [],
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
