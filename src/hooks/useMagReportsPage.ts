import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_BUILDINGS } from '@/queries/getBuildings'
import { GET_MAG_SENSORS_BY_BUILDING_ID } from '@/queries/getMagDataByBuildingId'
import { GET_MAG_DOWNSAMPLED } from '@/queries/getFlowAnalytics'
import { GET_RANGE_LABELS_BY_SENSOR_ID } from '@/queries/getRangeLabelsBySensorId'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import { INSERT_RANGE_LABEL, DELETE_RANGE_LABEL } from '@/mutations/rangeLabelMutations'
import { GET_SIGNALS_BY_SENSOR_ID } from '@/queries/getSignalsBySensorId'

import type { Building, MagReport, RangeLabel, Sensor } from '@/types'
import type { Signal } from '@/types/signal'

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

interface BuildingsResponse {
  building: Building[]
}

interface MagSensorsResponse {
  mag_to_building: { mag_id: number }[]
}

interface MagReportsResponse {
  mag_report: MagReport[]
}

/** Server-side downsampled mag fetch — returns ~1500 points via RPC */
async function fetchMagOptimized(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const since = variables?.since as string
  const until = variables?.until as string
  if (!sensorIds || sensorIds.length === 0) return { mag_report: [] as MagReport[] }
  const result = await GET_MAG_DOWNSAMPLED({ sensorIds, since, until, maxPoints: 1500 })
  return { mag_report: result.mag_report as unknown as MagReport[] }
}

interface MagSubscriptionResponse {
  mag_report: MagReport[]
}

interface SensorsResponse {
  sensor: Sensor[]
}

interface RangeLabelsResponse {
  range_label: RangeLabel[]
}

interface SignalsResponse {
  signal: Signal[]
}

interface InsertRangeLabelResponse {
  insert_range_label_one: RangeLabel
}

interface DeleteRangeLabelResponse {
  delete_range_label_by_pk: { id: number }
}

const MAX_CHART_POINTS = 1500

function computeTimeWindow(
  range: TimeRange,
  offset: number,
  customWindow?: { since: string; until: string },
): { since: string; until: string } {
  if (range === 'custom' && customWindow) return customWindow
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
  return points.filter((p) => p.timestamp >= sinceMs && p.timestamp <= untilMs)
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

export function useMagReportsPage(initialBuildingId?: number | null) {
  const { data: buildingsData, loading: buildingsLoading, executeQuery: fetchBuildings } =
    useGraphQL<BuildingsResponse>(GET_BUILDINGS)
  const fetchBuildingsRef = useRef(fetchBuildings)
  fetchBuildingsRef.current = fetchBuildings

  const { executeQuery: fetchMagSensors } =
    useGraphQL<MagSensorsResponse>(GET_MAG_SENSORS_BY_BUILDING_ID)
  const fetchMagSensorsRef = useRef(fetchMagSensors)
  fetchMagSensorsRef.current = fetchMagSensors

  const { data: magData, loading: magLoading, error: magError, executeQuery: fetchMagReports } =
    useGraphQL<MagReportsResponse>(fetchMagOptimized)
  const fetchMagReportsRef = useRef(fetchMagReports)
  fetchMagReportsRef.current = fetchMagReports

  const { data: rangeLabelsData, executeQuery: fetchRangeLabels } =
    useGraphQL<RangeLabelsResponse>(GET_RANGE_LABELS_BY_SENSOR_ID)
  const fetchRangeLabelsRef = useRef(fetchRangeLabels)
  fetchRangeLabelsRef.current = fetchRangeLabels

  const { executeQuery: insertRangeLabel } =
    useGraphQL<InsertRangeLabelResponse>(INSERT_RANGE_LABEL)
  const insertRangeLabelRef = useRef(insertRangeLabel)
  insertRangeLabelRef.current = insertRangeLabel

  const { executeQuery: deleteRangeLabelMutation } =
    useGraphQL<DeleteRangeLabelResponse>(DELETE_RANGE_LABEL)
  const deleteRangeLabelMutationRef = useRef(deleteRangeLabelMutation)
  deleteRangeLabelMutationRef.current = deleteRangeLabelMutation

  const { data: sensorsData, executeQuery: fetchSensors } =
    useGraphQL<SensorsResponse>(GET_SENSORS_BY_BUILDING_ID)
  const fetchSensorsRef = useRef(fetchSensors)
  fetchSensorsRef.current = fetchSensors

  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
    initialBuildingId ?? null,
  )
  const [magSensorIds, setMagSensorIds] = useState<number[]>([])
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('1m')
  const [customWindow, setCustomWindow] = useState<{ since: string; until: string } | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [periodOffset, setPeriodOffset] = useState(0)
  const [liveMagData, setLiveMagData] = useState<MagChartPoint[]>([])
  const [signals, setSignals] = useState<Signal[]>([])

  const magBufferRef = useRef<MagChartPoint[]>([])
  const lastMagIdRef = useRef<number | null>(null)
  const timeRangeRef = useRef(timeRange)
  timeRangeRef.current = timeRange

  useEffect(() => {
    fetchBuildingsRef.current()
  }, [])

  useEffect(() => {
    if (buildingsData?.building?.length && selectedBuildingId === null) {
      setSelectedBuildingId(buildingsData.building[0]!.id)
    }
  }, [buildingsData, selectedBuildingId])

  useEffect(() => {
    if (selectedBuildingId === null) {
      setMagSensorIds([])
      setSelectedSensorId(null)
      return
    }
    fetchMagSensorsRef.current({ buildingId: selectedBuildingId }).then((result) => {
      if (!result?.mag_to_building?.length) {
        setMagSensorIds([])
        setSelectedSensorId(null)
      } else {
        const ids = result.mag_to_building.map((m) => m.mag_id)
        setMagSensorIds(ids)
        setSelectedSensorId(ids[0] ?? null)
      }
    })
  }, [selectedBuildingId])

  // Fetch sensors (for multiplier) when building changes
  useEffect(() => {
    if (selectedBuildingId === null) return
    fetchSensorsRef.current({ buildingId: selectedBuildingId })
  }, [selectedBuildingId])

  // Derive the sensor multiplier for the selected mag sensor
  const sensorMultiplier = useMemo<number | null>(() => {
    if (!sensorsData?.sensor?.length || selectedSensorId === null) return null
    // Try to match mag sensor ID to sensor table ID
    const match = sensorsData.sensor.find((s) => s.id === selectedSensorId)
    if (match?.multiplier != null) return match.multiplier
    // Fallback: use first sensor with a multiplier for this building
    const withMultiplier = sensorsData.sensor.find((s) => s.multiplier != null)
    return withMultiplier?.multiplier ?? null
  }, [sensorsData, selectedSensorId])

  const prevFetchKeyRef = useRef('')

  useEffect(() => {
    if (selectedSensorId === null) return
    if (timeRange === 'custom' && !customWindow) return

    const fetchKey = `${selectedSensorId}-${timeRange}-${periodOffset}-${customWindow?.since}-${customWindow?.until}`
    if (fetchKey === prevFetchKeyRef.current) return
    prevFetchKeyRef.current = fetchKey

    setLiveMagData([])
    magBufferRef.current = []
    lastMagIdRef.current = null

    const { since, until } = computeTimeWindow(timeRange, periodOffset, customWindow ?? undefined)
    fetchMagReportsRef.current({ sensorIds: [selectedSensorId], since, until })
  }, [selectedSensorId, timeRange, periodOffset, customWindow])

  useEffect(() => {
    if (selectedSensorId === null) return
    fetchRangeLabelsRef.current({ sensorId: selectedSensorId })
  }, [selectedSensorId])

  // Fetch signals for the current time window
  const { executeQuery: fetchSignals } = useGraphQL<SignalsResponse>(GET_SIGNALS_BY_SENSOR_ID)
  const fetchSignalsRef = useRef(fetchSignals)
  fetchSignalsRef.current = fetchSignals

  // Fetch signals on load + poll every 10s
  useEffect(() => {
    if (selectedSensorId === null) return

    const fetchSigs = () => {
      console.log(`[SIGNALS] polling for sensor=${selectedSensorId}`)
      fetchSignalsRef.current({ sensorId: selectedSensorId }).then((result) => {
        const sigs = result?.signal ?? []
        console.log(`[SIGNALS] got ${sigs.length} signals`)
        setSignals(sigs)
      }).catch((err) => {
        console.error(`[SIGNALS] fetch error:`, err)
      })
    }

    fetchSigs()
    const interval = setInterval(fetchSigs, 10_000)
    return () => clearInterval(interval)
  }, [selectedSensorId])

  const rangeLabels = useMemo<RangeLabel[]>(
    () => rangeLabelsData?.range_label ?? [],
    [rangeLabelsData],
  )

  // Poll for new mag data every 2s when live
  const connected = isLive && selectedSensorId != null

  useEffect(() => {
    if (!isLive || selectedSensorId === null || timeRange === 'all' || timeRange === 'custom' || periodOffset > 0) return

    const poll = async () => {
      try {
        const result = await fetchMagReportsRef.current({
          sensorIds: [selectedSensorId],
          since: new Date(Date.now() - RANGE_MS[timeRange]).toISOString(),
          until: new Date().toISOString(),
        })
        if (result?.mag_report?.length) {
          const newPoints = result.mag_report
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(magToPoint)
          setLiveMagData(newPoints)
        }
      } catch {
        // silent retry on next poll
      }
    }

    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [isLive, selectedSensorId, timeRange, periodOffset])

  const magChartData = useMemo<MagChartPoint[]>(() => {
    const magReports = magData?.mag_report ?? []
    const base: MagChartPoint[] = magReports.length
      ? [...magReports]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(magToPoint)
      : []
    if (!isLive || timeRange === 'all' || timeRange === 'custom' || periodOffset > 0 || liveMagData.length === 0) {
      return filterPointsToWindow(base, timeRange, periodOffset, customWindow ?? undefined)
    }
    const lastBaseTs = base.length > 0 ? base[base.length - 1]!.timestamp : 0
    const newPoints = liveMagData.filter((p) => p.timestamp > lastBaseTs)
    const merged = newPoints.length === 0 ? base : [...base, ...newPoints]
    return filterPointsToWindow(merged, timeRange, periodOffset, customWindow ?? undefined)
  }, [isLive, timeRange, periodOffset, customWindow, magData, liveMagData])

  const chartData = useMemo(() => downsample(magChartData, MAX_CHART_POINTS), [magChartData])

  const buildings = useMemo(() => buildingsData?.building ?? [], [buildingsData])

  const selectedBuildingName = useMemo(() => {
    if (selectedBuildingId === null) return null
    return buildings.find((b) => b.id === selectedBuildingId)?.name ?? null
  }, [buildings, selectedBuildingId])

  // Handlers
  const handleBuildingChange = useCallback((buildingId: number) => {
    setSelectedBuildingId(buildingId)
    setSelectedSensorId(null)
    setPeriodOffset(0)
    setLiveMagData([])
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [])

  const handleSensorChange = useCallback((sensorId: number) => {
    setSelectedSensorId(sensorId)
    setPeriodOffset(0)
    setLiveMagData([])
    magBufferRef.current = []
    lastMagIdRef.current = null
    prevFetchKeyRef.current = ''
  }, [])

  const handleAddRangeLabel = useCallback(
    async (startDate: string, endDate: string, label: string) => {
      if (selectedSensorId === null) return
      const result = await insertRangeLabelRef.current({
        sensor: selectedSensorId,
        start_date: startDate,
        end_date: endDate,
        label,
      })
      if (result) {
        fetchRangeLabelsRef.current({ sensorId: selectedSensorId })
      }
    },
    [selectedSensorId],
  )

  const handleDeleteRangeLabel = useCallback(
    async (id: number) => {
      const result = await deleteRangeLabelMutationRef.current({ id })
      if (result && selectedSensorId !== null) {
        fetchRangeLabelsRef.current({ sensorId: selectedSensorId })
      }
    },
    [selectedSensorId],
  )

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
    if (range !== 'custom') setCustomWindow(null)
    setPeriodOffset(0)
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [])

  const handleCustomRange = useCallback((since: string, until: string) => {
    setTimeRange('custom')
    setCustomWindow({ since, until })
    setPeriodOffset(0)
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [])

  const handleToggleLive = useCallback(() => {
    setIsLive((prev) => !prev)
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [])

  const handlePreviousPeriod = useCallback(() => {
    setPeriodOffset((prev) => prev + 1)
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [])

  const handleNextPeriod = useCallback(() => {
    setPeriodOffset((prev) => Math.max(0, prev - 1))
    magBufferRef.current = []
    lastMagIdRef.current = null
  }, [])

  return {
    buildings,
    selectedBuildingId,
    selectedBuildingName,
    magSensorIds,
    selectedSensorId,
    rangeLabels,
    signals,
    chartData,
    sensorMultiplier,
    timeRange,
    periodOffset,
    isLive,
    connected,
    buildingsLoading,
    magLoading,
    magError,
    customWindow,
    handleBuildingChange,
    handleSensorChange,
    handleTimeRangeChange,
    handleCustomRange,
    handleToggleLive,
    handlePreviousPeriod,
    handleNextPeriod,
    handleAddRangeLabel,
    handleDeleteRangeLabel,
  }
}

export default useMagReportsPage
