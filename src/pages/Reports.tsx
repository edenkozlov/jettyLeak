import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import type { Props as RechartLabelProps } from 'recharts/types/component/Label'
import type { TooltipProps } from 'recharts'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import LiveFlowIndicator from '@/components/LiveFlowIndicator'
import useAuth from '@/hooks/auth/useAuth'
import { computeWaveFrequency } from '@/utils/fft'
import {
  computeFlowFromPeaks,
  computeBucketedFlow,
  computePeakFlow,
  getFlowPeakTimestamps,
  litresPerCycleFromMultiplier,
  volumeFromFullCyclesInWindow,
  type BucketedFlowPoint,
  type SignalTimeRange,
} from '@/utils/flowComputation'
import { useTheme } from '@/contexts/ThemeContext'
import { parseSignalValue } from '@/types/signal'
import { useChartTags } from '@/hooks/useChartTags'
import { useChartZoomPan } from '@/hooks/useChartZoomPan'
import { useVolumeSummary } from '@/hooks/useVolumeSummary'
import {
  getSignalColorByType,
  getSignalLabel,
  RANGE_MS,
  TIME_RANGE_OPTIONS,
  useReportsPage,
  type ParsedSignal,
  type TimeRange,
} from '@/hooks/useReportsPage'

const RAW_TO_LPH = 1000


const MA_RANGE_OPTIONS = [
  { value: 10_000, label: '10s' },
  { value: 30_000, label: '30s' },
  { value: 60_000, label: '1m' },
  { value: 5 * 60_000, label: '5m' },
  { value: 15 * 60_000, label: '15m' },
  { value: 60 * 60_000, label: '1h' },
] as const

const MA_DEFAULT_RANGE_MS = 60_000

function toLph(raw: number): number {
  return raw * RAW_TO_LPH
}

const CHART_COLORS = {
  light: {
    line: '#0ea5e9',
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
  },
  dark: {
    line: '#38bdf8',
    grid: '#374151',
    axis: '#9ca3af',
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#f3f4f6',
  },
} as const

/** Snap to human-friendly time steps for axis ticks. */
const NICE_TIME_AXIS_STEPS_MS = [
  1_000, 2_000, 5_000, 10_000, 15_000, 30_000,
  60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000, 15 * 60_000, 30 * 60_000,
  60 * 60_000, 2 * 60 * 60_000, 3 * 60 * 60_000, 6 * 60 * 60_000,
  12 * 60 * 60_000, 24 * 60 * 60_000,
] as const

function pickNiceTimeAxisStepMs(roughStepMs: number): number {
  for (const s of NICE_TIME_AXIS_STEPS_MS) {
    if (s >= roughStepMs) return s
  }
  return NICE_TIME_AXIS_STEPS_MS[NICE_TIME_AXIS_STEPS_MS.length - 1]!
}

/**
 * Evenly spaced epoch timestamps for the x-axis (max ~8 labels) so short ranges
 * are not one label per bar.
 */
function buildReadableTimeAxisTicks(
  minTs: number,
  maxTs: number,
  maxLabels = 8,
): number[] {
  if (minTs >= maxTs) return [minTs]
  const span = Math.max(maxTs - minTs, 1)
  const target = Math.max(2, Math.min(maxLabels, 10))
  const roughStep = span / (target - 1)
  const step = pickNiceTimeAxisStepMs(roughStep)
  const ticks: number[] = []
  let t = Math.ceil(minTs / step) * step
  let guard = 0
  while (t <= maxTs + step * 0.001 && guard < 48) {
    ticks.push(t)
    t += step
    guard++
  }
  if (ticks.length === 0) return [minTs, maxTs]
  return ticks
}

function formatTick(ts: number, rangeMs: number): string {
  const d = new Date(ts)
  if (rangeMs <= 5 * 60_000) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }
  if (rangeMs <= 6 * 60 * 60_000) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function computeTickInterval(rangeMs: number): number {
  if (rangeMs <= 10_000) return 1_000
  if (rangeMs <= 30_000) return 5_000
  if (rangeMs <= 60_000) return 10_000
  if (rangeMs <= 5 * 60_000) return 60_000
  if (rangeMs <= 15 * 60_000) return 3 * 60_000
  if (rangeMs <= 60 * 60_000) return 10 * 60_000
  if (rangeMs <= 6 * 60 * 60_000) return 60 * 60_000
  if (rangeMs <= 24 * 60 * 60_000) return 3 * 60 * 60_000
  return 6 * 60 * 60_000
}

function formatTooltipTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const MAX_VISIBLE_LABELS = 14

function renderValueLabel(
  props: RechartLabelProps,
  totalPoints: number,
  color: string,
) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const index = Number(props.index ?? 0)
  const value = props.value as number | null | undefined

  const interval = Math.max(1, Math.floor(totalPoints / MAX_VISIBLE_LABELS))
  if (index % interval !== 0) return null
  if (value === null || value === undefined) return null

  return (
    <text
      x={x}
      y={y - 10}
      textAnchor="middle"
      fontSize={10}
      fontWeight={500}
      fill={color}
    >
      {toLph(value).toFixed(1)}
    </text>
  )
}

function rangeButtonClass(isActive: boolean): string {
  if (isActive) {
    return 'bg-indigo-500 text-white'
  }
  return 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
}

// --- Gap compression ---

interface CompressedPoint {
  timestamp: number
  cx: number
  flowValue: number | null
}

interface TimelineCompression {
  points: CompressedPoint[]
  toCompressed: (realTs: number) => number
  toReal: (cx: number) => number
}

function compressTimeline(
  data: { timestamp: number; flowValue: number | null }[],
): TimelineCompression {
  const identity = {
    points: data.map((p) => ({ ...p, cx: p.timestamp })),
    toCompressed: (ts: number) => ts,
    toReal: (ts: number) => ts,
  }
  if (data.length < 3) return identity

  const gaps: number[] = []
  for (let i = 1; i < data.length; i++) {
    gaps.push(data[i]!.timestamp - data[i - 1]!.timestamp)
  }
  const sorted = [...gaps].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  const maxGap = Math.max(median * 5, 5000)

  const hasLargeGap = gaps.some((g) => g > maxGap)
  if (!hasLargeGap) return identity

  const realTs = data.map((p) => p.timestamp)
  const cx: number[] = [realTs[0]!]
  for (let i = 1; i < realTs.length; i++) {
    const gap = realTs[i]! - realTs[i - 1]!
    cx.push(cx[i - 1]! + Math.min(gap, maxGap))
  }

  const points = data.map((p, i) => ({ ...p, cx: cx[i]! }))

  const toCompressed = (ts: number): number => {
    if (ts <= realTs[0]!) return cx[0]! + (ts - realTs[0]!)
    if (ts >= realTs[realTs.length - 1]!)
      return cx[cx.length - 1]! + (ts - realTs[realTs.length - 1]!)
    let lo = 0
    let hi = realTs.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (realTs[mid]! <= ts) lo = mid
      else hi = mid
    }
    const realGap = realTs[hi]! - realTs[lo]!
    if (realGap === 0) return cx[lo]!
    const frac = (ts - realTs[lo]!) / realGap
    return cx[lo]! + frac * (cx[hi]! - cx[lo]!)
  }

  const toReal = (cts: number): number => {
    if (cts <= cx[0]!) return realTs[0]! + (cts - cx[0]!)
    if (cts >= cx[cx.length - 1]!)
      return realTs[realTs.length - 1]! + (cts - cx[cx.length - 1]!)
    let lo = 0
    let hi = cx.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (cx[mid]! <= cts) lo = mid
      else hi = mid
    }
    const cGap = cx[hi]! - cx[lo]!
    if (cGap === 0) return realTs[lo]!
    const frac = (cts - cx[lo]!) / cGap
    return realTs[lo]! + frac * (realTs[hi]! - realTs[lo]!)
  }

  return { points, toCompressed, toReal }
}

// --- Signal type enrichment ---

function getActiveSignalType(
  timestamp: number,
  signals: ParsedSignal[],
): number | null {
  for (const s of signals) {
    const start = new Date(s.start_time).getTime()
    const end = new Date(s.end_time).getTime()
    if (timestamp >= start && timestamp <= end) return s.signalType
  }
  return null
}

interface EnrichedPoint {
  timestamp: number
  cx: number
  flowValue: number | null
  [key: string]: number | null
}

function buildEnrichedData(
  points: CompressedPoint[],
  signals: ParsedSignal[],
): EnrichedPoint[] {
  if (points.length === 0) return []

  const types: (number | null)[] = points.map((p) =>
    getActiveSignalType(p.timestamp, signals),
  )

  return points.map((p, i) => {
    const currentType = types[i]!
    const prevType = i > 0 ? types[i - 1]! : undefined
    const nextType = i < types.length - 1 ? types[i + 1]! : undefined

    const value = p.flowValue

    const result: EnrichedPoint = {
      timestamp: p.timestamp,
      cx: p.cx,
      flowValue: value,
    }

    const key =
      currentType !== null ? `flow_type_${currentType}` : 'flow_default'
    result[key] = value

    if (prevType !== undefined && prevType !== currentType) {
      const prevKey =
        prevType !== null ? `flow_type_${prevType}` : 'flow_default'
      result[prevKey] = value
    }
    if (nextType !== undefined && nextType !== currentType) {
      const nextKey =
        nextType !== null ? `flow_type_${nextType}` : 'flow_default'
      result[nextKey] = value
    }

    return result
  })
}

// --- Tooltip ---

type CustomTooltipProps = TooltipProps<number, string> & {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number | null; color?: string; dataKey?: string; payload?: unknown }>
  colors: { tooltipBg: string; tooltipBorder: string; tooltipText: string }
}

const MA_COLOR = '#f97316'

function CustomTooltip({ active, payload, colors }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const flowEntry = payload.find((e) => e.dataKey !== 'movingAvg' && e.value != null)
  const maEntry = payload.find((e) => e.dataKey === 'movingAvg' && e.value != null)

  if (!flowEntry && !maEntry) return null

  const referenceEntry = flowEntry ?? maEntry
  const realTs = (referenceEntry!.payload as EnrichedPoint | undefined)?.timestamp
  const timeStr = realTs != null ? formatTooltipTime(realTs) : ''

  return (
    <div
      style={{
        backgroundColor: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        color: colors.tooltipText,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{timeStr}</p>
      {flowEntry && (
        <p style={{ color: String(flowEntry.color ?? colors.tooltipText) }}>
          Flow: {toLph(Number(flowEntry.value)).toFixed(1)} L/h
        </p>
      )}
      {maEntry && (
        <p style={{ color: MA_COLOR, marginTop: flowEntry ? 2 : 0 }}>
          MA: {toLph(Number(maEntry.value)).toFixed(1)} L/h
        </p>
      )}
    </div>
  )
}

export default function Reports() {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]
  const { role } = useAuth()
  const showMagnetometerUi = role !== 'client'
  const navigate = useNavigate()
  const location = useLocation()
  const { sensorId: sensorIdParam, timeWindow: timeWindowParam } = useParams<{ sensorId: string; timeWindow: string }>()
  const paramSensorId = sensorIdParam ? Number(sensorIdParam) : null
  const validTimeRanges = new Set(['1m', '5m', '15m', '1h', '6h', '12h', '24h', 'all'])
  const paramTimeRange = timeWindowParam && validTimeRanges.has(timeWindowParam) ? timeWindowParam as TimeRange : undefined
  /** Raw is default; chart-only uses an explicit `/flow` suffix. Legacy `/sensorId/time` (no suffix) counts as raw. */
  const showRawData =
    location.pathname.endsWith('/raw') ||
    (!location.pathname.endsWith('/flow') &&
      (location.pathname === '/dashboard' ||
        location.pathname.startsWith('/dashboard/reports')))

  const {
    sensors,
    selectedSensorId,
    selectedSensorName,
    sensorMultiplier,
    chartData,
    rawChartData,
    timeRange,
    periodOffset,
    isLive,
    connected,
    sensorsLoading,
    reportsLoading,
    magLoading,
    reportsError,
    magChartData,
    magChartDataFull,
    flowHourlyRows,
    refetchMag,
    parsedSignals,
    signalTypeIds,
    sensorMappings,
    updateMapping,
    customWindow,
    magSensorIdsForQuery,
    handleSensorChange,
    handleTimeRangeChange,
    handleCustomRange,
    handleToggleLive,
    handlePreviousPeriod,
    handleNextPeriod,
  } = useReportsPage(paramSensorId, paramTimeRange)

  const refetchMagRef = useRef(refetchMag)
  refetchMagRef.current = refetchMag

  const buildPath = useCallback((sensorId: number | string, range?: string, raw?: boolean) => {
    let path = `/dashboard/reports/${sensorId}`
    if (range && range !== 'custom') {
      path += `/${range}`
      path += raw === false ? '/flow' : '/raw'
    }
    return path
  }, [])

  // Sync URL when time range changes via UI buttons
  useEffect(() => {
    if (selectedSensorId == null) return
    const expectedPath = buildPath(selectedSensorId, timeRange, showRawData)
    if (location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true })
    }
  }, [selectedSensorId, timeRange, showRawData, buildPath, navigate, location.pathname])

  useEffect(() => {
    if (paramSensorId === null && sensors.length > 0) {
      const defaultId = sensors[sensors.length - 1]!.id
      navigate(buildPath(defaultId, timeRange, true), { replace: true })
    }
  }, [paramSensorId, sensors, navigate, buildPath, timeRange])

  const selectedBuildingId = useMemo(() => {
    if (selectedSensorId == null) return null
    return sensors.find((s) => s.id === selectedSensorId)?.building_id ?? null
  }, [sensors, selectedSensorId])

  const { buckets: volumeBuckets } = useVolumeSummary(
    magSensorIdsForQuery,
    sensorMultiplier,
  )

  /** Latest flow from report table (subscription + fetch), for the selected sensor — L/h */
  const liveSensorFlowLph = useMemo(() => {
    if (!isLive || periodOffset !== 0 || rawChartData.length === 0) return null
    const last = rawChartData[rawChartData.length - 1]!
    if (last.flowValue == null) return null
    const ageMs = Date.now() - last.timestamp
    if (ageMs > 180_000) return null
    return toLph(last.flowValue)
  }, [isLive, periodOffset, rawChartData])

  const periodLabel = useMemo(() => {
    if (periodOffset === 0 || timeRange === 'all' || timeRange === 'custom') return null
    const rangeMs = RANGE_MS[timeRange]
    const now = Date.now()
    const untilMs = now - rangeMs * periodOffset
    const sinceMs = untilMs - rangeMs
    const fmt = (ms: number) =>
      new Date(ms).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    return `${fmt(sinceMs)} – ${fmt(untilMs)}`
  }, [periodOffset, timeRange])

  const timeline = useMemo(() => compressTimeline(chartData), [chartData])

  const SIGNAL_TYPE_COLORS: Record<string, string> = {
    sink: '#f59e0b',
    toilet: '#8b5cf6',
    shower: '#3b82f6',
    dishwasher: '#10b981',
    unknown: '#6b7280',
  }

  const detectorSignalOverlays = useMemo(() => {
    if (!parsedSignals.length) return []
    const hasTimeline = timeline.points.length > 0
    const result = parsedSignals
      .map((sig) => {
        const parsed = parseSignalValue(sig.value)
        if (!parsed) return null
        const startMs = sig.start_time ? new Date(sig.start_time).getTime() : null
        const endMs = sig.end_time ? new Date(sig.end_time).getTime() : null
        if (!startMs || !endMs) return null
        const startCx = hasTimeline ? timeline.toCompressed(startMs) : startMs
        const endCx = hasTimeline ? timeline.toCompressed(endMs) : endMs
        const signalType = String(parsed.signal_type)
        const fixtureName = parsed.fixture_name ?? '?'
        const distance = parsed.cosine_distance ?? parsed.mass_distance
        const classifications = parsed.classifications ?? []
        const lines = [`→ ${signalType} (${fixtureName})${distance != null ? ` d=${distance.toFixed(3)}` : ''}`]
        for (const c of classifications.slice(1)) {
          lines.push(`  ${c.type} (${c.name}) d=${c.distance.toFixed(3)}`)
        }
        if (parsed.duration_s != null) lines.push(`  ${parsed.duration_s}s · ${parsed.readings} readings`)
        return {
          id: sig.id,
          startCx,
          endCx,
          color: SIGNAL_TYPE_COLORS[signalType] ?? SIGNAL_TYPE_COLORS.unknown!,
          fullLabel: lines.join('\n'),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    console.log(`[SIGNAL OVERLAYS] ${parsedSignals.length} → ${result.length} overlays`)
    return result
  }, [parsedSignals, timeline])

  const dataMin =
    timeline.points.length > 0 ? timeline.points[0]!.cx : 0
  const dataMax =
    timeline.points.length > 0
      ? timeline.points[timeline.points.length - 1]!.cx
      : 0

  const homeMin = useMemo(() => {
    if (timeRange === 'all' || timeRange === 'custom' || dataMax === 0) return dataMin
    const realMax =
      chartData.length > 0
        ? chartData[chartData.length - 1]!.timestamp
        : 0
    const realHomeMin = realMax - RANGE_MS[timeRange]
    return Math.max(dataMin, timeline.toCompressed(realHomeMin))
  }, [timeRange, dataMin, dataMax, chartData, timeline])
  const homeMax = dataMax

  const totalLiters = useMemo(() => {
    if (chartData.length < 2) return 0
    let sum = 0
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1]!
      const curr = chartData[i]!
      if (prev.flowValue == null || curr.flowValue == null) continue
      const dtHours = (curr.timestamp - prev.timestamp) / 3_600_000
      const avgLph = (toLph(prev.flowValue) + toLph(curr.flowValue)) / 2
      sum += avgLph * dtHours
    }
    return Math.abs(sum)
  }, [chartData])

  const visibleRangeMsRef = useRef(0)

  // Nice round bucket intervals per time range (in ms)
  const FLOW_BUCKET_MS: Record<TimeRange, number> = {
    '1m':  5_000,           // 5s  → 12 buckets
    '5m':  15_000,          // 15s → 20 buckets
    '15m': 60_000,          // 1m  → 15 buckets
    '1h':  5 * 60_000,      // 5m  → 12 buckets
    '6h':  15 * 60_000,     // 15m → 24 buckets
    '12h': 30 * 60_000,     // 30m → 24 buckets
    '24h': 60 * 60_000,     // 1h  → 24 buckets
    all:   60 * 60_000,     // 1h  fallback
    custom: 60_000,         // 1m  fallback
  }

  const bucketMs = FLOW_BUCKET_MS[timeRange]

  const [slotAnchor, setSlotAnchor] = useState(() =>
    Math.floor(Date.now() / bucketMs) * bucketMs,
  )

  // Synchronously update slotAnchor when bucketMs changes so the chart window
  // is never stale (useEffect would leave it wrong for one render).
  const [prevBucketMs, setPrevBucketMs] = useState(bucketMs)
  if (bucketMs !== prevBucketMs) {
    setPrevBucketMs(bucketMs)
    setSlotAnchor(Math.floor(Date.now() / bucketMs) * bucketMs)
  }

  const lastRefetchMsRef = useRef(Date.now())
  const MIN_REFETCH_INTERVAL_MS = 15_000

  // Tick counter drives the timer loop without moving the chart window.
  // slotAnchor only advances after a successful data refetch so the charts
  // never show empty future time that hasn't been populated yet.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const now = Date.now()
    const nextBoundary = (Math.floor(now / bucketMs) + 1) * bucketMs
    const delay = nextBoundary - now

    const timeout = setTimeout(async () => {
      const elapsed = Date.now() - lastRefetchMsRef.current
      if (elapsed >= MIN_REFETCH_INTERVAL_MS) {
        lastRefetchMsRef.current = Date.now()
        await refetchMagRef.current()
        // Advance the chart window only after fresh data has arrived
        setSlotAnchor(Math.floor(Date.now() / bucketMs) * bucketMs)
      }
      // Always bump the tick so the next timeout is scheduled
      setTick((t) => t + 1)
    }, delay)

    return () => clearTimeout(timeout)
  }, [tick, bucketMs])

  // Canonical time window shared by all charts
  const effectiveRangeMs = useMemo(() => {
    const r = RANGE_MS[timeRange]
    if (r > 0) return r
    if (magChartDataFull.length >= 2) {
      return magChartDataFull[magChartDataFull.length - 1]!.timestamp - magChartDataFull[0]!.timestamp
    }
    return 60_000
  }, [timeRange, magChartDataFull])
  const numFlowBuckets = Math.max(1, Math.round(effectiveRangeMs / bucketMs))
  // Derive chart window from actual data extent so there is no empty space
  // on either side.  Falls back to slotAnchor when no data exists yet.
  const latestFlowTs = rawChartData.length > 0
    ? rawChartData[rawChartData.length - 1]!.timestamp
    : 0
  const earliestFlowTs = rawChartData.length > 0
    ? rawChartData[0]!.timestamp
    : 0
  const latestMagTs = magChartDataFull.length > 0
    ? magChartDataFull[magChartDataFull.length - 1]!.timestamp
    : 0
  const earliestMagTs = magChartDataFull.length > 0
    ? magChartDataFull[0]!.timestamp
    : 0
  const latestDataTs = Math.max(latestFlowTs, latestMagTs)
  const earliestDataTs = Math.min(
    earliestFlowTs || Infinity,
    earliestMagTs || Infinity,
  )

  // Shared chart window — all charts (bar, line, mag) use this so their
  // x-axes are perfectly aligned at every column/grid line.
  const chartWindowEnd = latestDataTs > 0
    ? latestDataTs
    : slotAnchor
  const chartWindowStart = earliestDataTs > 0 && earliestDataTs < Infinity
    ? earliestDataTs
    : chartWindowEnd - numFlowBuckets * bucketMs

  const [tagFormTimestamp, setTagFormTimestamp] = useState<number | null>(null)
  const [tagTitle, setTagTitle] = useState('')
  const [tagDescription, setTagDescription] = useState('')

  const {
    tags,
    selectedTag,
    setSelectedTag,
    createTag,
    updateTag,
    deleteTag,
  } = useChartTags(selectedSensorId)

  const [isEditingTag, setIsEditingTag] = useState(false)
  const [editTagTitle, setEditTagTitle] = useState('')
  const [editTagDescription, setEditTagDescription] = useState('')

  const [editingMappingType, setEditingMappingType] = useState<number | null>(
    null,
  )
  const [editingMappingLabel, setEditingMappingLabel] = useState('')

  const handleChartClick = useCallback(
    (cx: number) => {
      const realTs = timeline.toReal(cx)
      const range = visibleRangeMsRef.current
      const threshold = Math.max(range * 0.02, 2000)

      let closestTag: (typeof tags)[number] | null = null
      let closestDist = Infinity
      for (const tag of tags) {
        const tagCx = timeline.toCompressed(
          new Date(tag.tagged_at).getTime(),
        )
        const dist = Math.abs(tagCx - cx)
        if (dist < closestDist) {
          closestDist = dist
          closestTag = tag
        }
      }

      if (closestTag && closestDist <= threshold) {
        setSelectedTag(closestTag)
      } else {
        setTagFormTimestamp(realTs)
      }
    },
    [tags, setSelectedTag, timeline],
  )

  const {
    chartWrapperRef,
    domain,
    visibleRangeMs,
    isZoomed,
    refAreaLeft,
    refAreaRight,
    onChartMouseDown,
    onChartMouseMove,
    onChartMouseUp,
    cancelSelection,
    panLeft,
    panRight,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useChartZoomPan(dataMin, dataMax, homeMin, homeMax, handleChartClick)

  visibleRangeMsRef.current = visibleRangeMs

  const onTimeRangeChange = useCallback(
    (range: TimeRange) => {
      resetZoom()
      handleTimeRangeChange(range)
    },
    [resetZoom, handleTimeRangeChange],
  )

  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo) return
    const since = new Date(customFrom).toISOString()
    const until = new Date(customTo).toISOString()
    resetZoom()
    handleCustomRange(since, until)
    setShowCustomPicker(false)
  }, [customFrom, customTo, resetZoom, handleCustomRange])

  const onSensorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = Number(e.target.value)
      resetZoom()
      setSelectedTag(null)
      handleSensorChange(newId)
      lastRefetchMsRef.current = 0
      navigate(buildPath(newId, timeRange, showRawData))
    },
    [resetZoom, setSelectedTag, handleSensorChange, navigate, buildPath, timeRange, showRawData],
  )

  const visibleData = useMemo(() => {
    const pts = timeline.points
    if (pts.length === 0) return pts
    const [left, right] = domain
    let startIdx = pts.findIndex((p) => p.cx >= left)
    if (startIdx < 0) startIdx = pts.length
    let endIdx = pts.findIndex((p) => p.cx > right)
    if (endIdx < 0) endIdx = pts.length
    return pts.slice(
      Math.max(0, startIdx - 1),
      Math.min(pts.length, endIdx + 1),
    )
  }, [timeline, domain])

  const realVisibleRange = useMemo(() => {
    if (visibleData.length < 2) return visibleRangeMs
    return (
      visibleData[visibleData.length - 1]!.timestamp -
      visibleData[0]!.timestamp
    )
  }, [visibleData, visibleRangeMs])

  const zoomTicks = useMemo(() => {
    if (visibleData.length < 2) return []
    const realLeft = visibleData[0]!.timestamp
    const realRight = visibleData[visibleData.length - 1]!.timestamp
    const step = computeTickInterval(realVisibleRange)
    const start = Math.ceil(realLeft / step) * step
    const ticks: number[] = []
    for (let t = start; t <= realRight; t += step) {
      ticks.push(timeline.toCompressed(t))
    }
    return ticks
  }, [visibleData, realVisibleRange, timeline])

  const visibleTags = useMemo(() => {
    if (!tags.length || timeline.points.length === 0) return []
    const [left, right] = domain
    return tags.filter((tag) => {
      const tagCx = timeline.toCompressed(
        new Date(tag.tagged_at).getTime(),
      )
      return tagCx >= left && tagCx <= right
    })
  }, [tags, domain, timeline])

  const magRangeMs = chartWindowEnd - chartWindowStart

  /** Mag points after main time-window / flow-chart zoom (base layer for raw mag zoom) */
  const magLayerBaseData = useMemo(() => {
    if (magChartData.length === 0) return []
    if (timeline.points.length === 0) {
      return magChartData
        .map((p) => ({ ...p, cx: p.timestamp }))
        .filter((p) => p.cx >= chartWindowStart && p.cx <= chartWindowEnd)
    }
    const [left, right] = domain
    return magChartData
      .map((p) => ({ ...p, cx: timeline.toCompressed(p.timestamp) }))
      .filter((p) => p.cx >= left && p.cx <= right)
  }, [magChartData, timeline, domain, chartWindowStart, chartWindowEnd])

  // Use the same chart window as the flow chart so timestamps stay aligned.
  const magXBaseMin = chartWindowStart
  const magXBaseMax = chartWindowEnd

  const magXDataMin = magXBaseMin
  const magXDataMax = magXBaseMax <= magXBaseMin ? magXBaseMin + 1 : magXBaseMax

  const magDeferZoomOpts = useMemo(() => ({ deferZoom: true }), [])
  const {
    chartWrapperRef: magRawChartWrapperRef,
    domain: magRawDomain,
    isZoomed: magRawIsZoomed,
    refAreaLeft: magRefAreaLeft,
    refAreaRight: magRefAreaRight,
    pendingSelection: magPendingSelection,
    onChartMouseDown: onMagRawMouseDown,
    onChartMouseMove: onMagRawMouseMove,
    onChartMouseUp: onMagRawMouseUp,
    cancelSelection: cancelMagRawSelection,
    clearSelection: clearMagRawSelection,
    commitZoom: commitMagRawZoom,
    panLeft: magRawPanLeft,
    panRight: magRawPanRight,
    zoomIn: magRawZoomIn,
    zoomOut: magRawZoomOut,
    resetZoom: resetMagRawZoom,
  } = useChartZoomPan(magXDataMin, magXDataMax, magXBaseMin, magXBaseMax, undefined, magDeferZoomOpts)

  useEffect(() => {
    resetMagRawZoom()
  }, [magXBaseMin, magXBaseMax, resetMagRawZoom])

  const magDisplayData = useMemo(() => {
    if (magLayerBaseData.length === 0) return []
    const [left, right] = magRawDomain
    return magLayerBaseData.filter((p) => p.cx >= left && p.cx <= right)
  }, [magLayerBaseData, magRawDomain])

  const magRawRealRangeMs = useMemo(() => {
    const [left, right] = magRawDomain
    if (timeline.points.length > 0) {
      return Math.max(0, timeline.toReal(right) - timeline.toReal(left))
    }
    return Math.max(0, right - left)
  }, [magRawDomain, timeline])

  const magRawTicks = useMemo(() => {
    const [left, right] = magRawDomain
    const realLeft = timeline.points.length > 0 ? timeline.toReal(left) : left
    const realRight = timeline.points.length > 0 ? timeline.toReal(right) : right
    if (realRight <= realLeft) return []
    const realTicks = buildReadableTimeAxisTicks(realLeft, realRight, 8)
    return realTicks.map((t) =>
      timeline.points.length > 0 ? timeline.toCompressed(t) : t,
    )
  }, [magRawDomain, timeline])

  const magZoomTimeBounds = useMemo(() => {
    const [left, right] = magRawDomain
    if (timeline.points.length > 0) {
      return { start: timeline.toReal(left), end: timeline.toReal(right) }
    }
    return { start: left, end: right }
  }, [magRawDomain, timeline])

  const magFlowChartData = useMemo(
    () =>
      computeFlowFromPeaks(
        magChartDataFull,
        sensorMultiplier ?? 0,
      ),
    [magChartDataFull, sensorMultiplier],
  )

  const flowPeakTimestamps = useMemo(
    () => getFlowPeakTimestamps(magChartDataFull),
    [magChartDataFull],
  )

  const currentLitresPerCycle = useMemo(
    () => litresPerCycleFromMultiplier(sensorMultiplier ?? 0),
    [sensorMultiplier],
  )

  const signalTimeRanges: SignalTimeRange[] = useMemo(() => {
    return parsedSignals
      .map((sig) => {
        const parsed = parseSignalValue(sig.value)
        if (!parsed) return null
        const startMs = sig.start_time ? new Date(sig.start_time).getTime() : null
        const endMs = sig.end_time ? new Date(sig.end_time).getTime() : null
        if (!startMs || !endMs) return null
        return { startMs, endMs, signalType: String(parsed.signal_type) }
      })
      .filter((x): x is SignalTimeRange => x !== null)
  }, [parsedSignals])

  const bucketedFlowData = useMemo(() => {
    // For 6h+ ranges, use pre-computed flow_hourly data instead of
    // client-side peak detection (downsampled data is too sparse for peaks).
    if (flowHourlyRows.length > 0) {
      const now = Date.now()
      const points: BucketedFlowPoint[] = []
      for (const row of flowHourlyRows) {
        const hourStart = new Date(row.hour_start).getTime()
        const hourEnd = hourStart + 3_600_000

        if (bucketMs >= 3_600_000) {
          // 1 bucket = 1 hour — direct mapping
          const bMid = hourStart + bucketMs / 2
          const isPartial = hourStart <= now && now < hourEnd
          const volumeL = row.volume_litres
          const flowRateLph = volumeL > 0 ? volumeL / (bucketMs / 3_600_000) : 0
          points.push({
            timestamp: bMid,
            flowRateLph: Math.round(flowRateLph * 100) / 100,
            flowRateBarVisual: flowRateLph === 0 ? 0.001 : Math.round(flowRateLph * 100) / 100,
            partial: isPartial,
            bucketVolumeL: Math.round(volumeL * 10000) / 10000,
          })
        } else {
          // Sub-hour buckets (e.g., 15min or 30min) — split hourly data evenly
          const bucketsPerHour = Math.round(3_600_000 / bucketMs)
          const volPerBucket = row.volume_litres / bucketsPerHour
          const ratePerBucket = volPerBucket / (bucketMs / 3_600_000)
          for (let b = 0; b < bucketsPerHour; b++) {
            const bStart = hourStart + b * bucketMs
            const bMid = bStart + bucketMs / 2
            if (bMid < chartWindowStart || bMid > chartWindowEnd) continue
            const isPartial = bStart <= now && now < bStart + bucketMs
            points.push({
              timestamp: bMid,
              flowRateLph: Math.round(ratePerBucket * 100) / 100,
              flowRateBarVisual: ratePerBucket === 0 ? 0.001 : Math.round(ratePerBucket * 100) / 100,
              partial: isPartial,
              bucketVolumeL: Math.round(volPerBucket * 10000) / 10000,
            })
          }
        }
      }
      points.sort((a, b) => a.timestamp - b.timestamp)
      return points
    }

    // For short ranges, compute from raw mag data (full resolution peak detection)
    if (magChartDataFull.length === 0) return []
    return computeBucketedFlow(
      magChartDataFull,
      magFlowChartData,
      flowPeakTimestamps,
      currentLitresPerCycle,
      bucketMs,
      chartWindowStart,
      numFlowBuckets,
      undefined,
      undefined,
      undefined,
      signalTimeRanges,
    )
  }, [
    flowHourlyRows,
    magChartDataFull,
    magFlowChartData,
    flowPeakTimestamps,
    currentLitresPerCycle,
    bucketMs,
    chartWindowStart,
    chartWindowEnd,
    numFlowBuckets,
    slotAnchor,
    signalTimeRanges,
  ])

  const volumeSignalTypes = useMemo(() => {
    const types = new Set<string>()
    for (const b of bucketedFlowData) {
      for (const t of Object.keys(b.volumeByType ?? {})) types.add(t)
    }
    const order = ['sink', 'toilet', 'shower', 'dishwasher', 'urinal']
    const sorted = order.filter((t) => types.has(t))
    for (const t of types) {
      if (!sorted.includes(t)) sorted.push(t)
    }
    return sorted
  }, [bucketedFlowData])

  const stackedBarData = useMemo(() => {
    return bucketedFlowData.map((b) => {
      const row: Record<string, number> = {
        timestamp: b.timestamp,
        bucketVolumeL: b.bucketVolumeL,
        flowRateLph: b.flowRateLph,
        partial: b.partial ? 1 : 0,
      }
      let attributed = 0
      for (const t of volumeSignalTypes) {
        const v = (b.volumeByType ?? {})[t] ?? 0
        row[`vol_${t}`] = v
        attributed += v
      }
      row['vol__unattributed'] = Math.max(0, Math.round((b.bucketVolumeL - attributed) * 10000) / 10000)
      return row
    })
  }, [bucketedFlowData, volumeSignalTypes])

  const peakFlowData = useMemo(
    () =>
      computePeakFlow(
        magChartDataFull,
        sensorMultiplier ?? 0,
        Math.max(bucketMs / 2, 5000),
        chartWindowStart,
        chartWindowEnd,
      ),
    [
      magChartDataFull,
      sensorMultiplier,
      bucketMs,
      chartWindowStart,
      chartWindowEnd,
    ],
  )

  const flowBarAxisRangeMs = useMemo(() => {
    const preset = RANGE_MS[timeRange]
    if (preset > 0) return preset
    if (bucketedFlowData.length >= 2) {
      return (
        bucketedFlowData[bucketedFlowData.length - 1]!.timestamp -
        bucketedFlowData[0]!.timestamp
      )
    }
    return 60_000
  }, [timeRange, bucketedFlowData])

  const flowBarAxisTicks = useMemo(
    () => buildReadableTimeAxisTicks(chartWindowStart, chartWindowEnd, 8),
    [chartWindowStart, chartWindowEnd],
  )

  const peakFlowAxisTicks = useMemo(
    () => buildReadableTimeAxisTicks(chartWindowStart, chartWindowEnd, 8),
    [chartWindowStart, chartWindowEnd],
  )

  const magVolumeFromCycles = useMemo(() => {
    if (currentLitresPerCycle <= 0 || flowPeakTimestamps.length < 2) return null
    const { start, end } = magZoomTimeBounds
    const { fullCycles, volumeL } = volumeFromFullCyclesInWindow(
      flowPeakTimestamps,
      start,
      end,
      currentLitresPerCycle,
    )
    return { litresPerCycle: currentLitresPerCycle, fullCycles, volumeL, peakCount: flowPeakTimestamps.length }
  }, [
    currentLitresPerCycle,
    flowPeakTimestamps,
    magZoomTimeBounds,
  ])

  const magSelectionVolume = useMemo(() => {
    if (!magPendingSelection) return null
    if (currentLitresPerCycle <= 0 || flowPeakTimestamps.length < 2) return null
    const realLeft = timeline.points.length > 0
      ? timeline.toReal(magPendingSelection.left)
      : magPendingSelection.left
    const realRight = timeline.points.length > 0
      ? timeline.toReal(magPendingSelection.right)
      : magPendingSelection.right
    const { fullCycles, volumeL } = volumeFromFullCyclesInWindow(
      flowPeakTimestamps,
      Math.min(realLeft, realRight),
      Math.max(realLeft, realRight),
      currentLitresPerCycle,
    )
    const durationMs = Math.abs(realRight - realLeft)
    return { fullCycles, volumeL, litresPerCycle: currentLitresPerCycle, durationMs }
  }, [
    magPendingSelection,
    currentLitresPerCycle,
    flowPeakTimestamps,
    timeline,
  ])

  const onMagRawMouseLeave = useCallback(() => {
    cancelMagRawSelection()
  }, [cancelMagRawSelection])

  const totalMagYDomain = useMemo<[number, number]>(() => {
    const totals = magDisplayData
      .map((p) => p.total)
      .filter((v): v is number => v != null)
    if (totals.length === 0) return [0, 1]
    let min = totals[0]!
    let max = totals[0]!
    for (const v of totals) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const pad = Math.max((max - min) * 0.15, 0.05)
    return [min - pad, max + pad]
  }, [magDisplayData])

  const xAxisYDomain = useMemo<[number, number]>(() => {
    const vals = magDisplayData
      .map((p) => p.x)
      .filter((v): v is number => v != null)
    if (vals.length === 0) return [0, 1]
    let min = vals[0]!
    let max = vals[0]!
    for (const v of vals) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const pad = Math.max((max - min) * 0.15, 0.05)
    return [min - pad, max + pad]
  }, [magDisplayData])

  const yAxisYDomain = useMemo<[number, number]>(() => {
    const vals = magDisplayData
      .map((p) => p.y)
      .filter((v): v is number => v != null)
    if (vals.length === 0) return [0, 1]
    let min = vals[0]!
    let max = vals[0]!
    for (const v of vals) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const pad = Math.max((max - min) * 0.15, 0.05)
    return [min - pad, max + pad]
  }, [magDisplayData])

  const zAxisYDomain = useMemo<[number, number]>(() => {
    const vals = magDisplayData
      .map((p) => p.z)
      .filter((v): v is number => v != null)
    if (vals.length === 0) return [0, 1]
    let min = vals[0]!
    let max = vals[0]!
    for (const v of vals) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const pad = Math.max((max - min) * 0.15, 0.05)
    return [min - pad, max + pad]
  }, [magDisplayData])
  const vibrationData = useMemo(() => {
    if (magDisplayData.length === 0) return []
    return magDisplayData.filter(
      (p) => p.bandEnergy10s != null || p.bandEnergy60s != null || p.bandEnergy5m != null,
    )
  }, [magDisplayData])

  const compressedWaveFreqData = useMemo(() => {
    if (magChartData.length < 3) return []
    const samples = magChartData
      .filter((p) => p.x != null)
      .map((p) => ({ timestamp: p.timestamp, value: p.x! }))
    if (samples.length < 3) return []
    const freqPoints = computeWaveFrequency(samples, 5000)
    let rows: { cx: number; activity: number; timestamp: number }[]
    if (timeline.points.length === 0) {
      rows = freqPoints
        .map((p) => ({ ...p, cx: p.timestamp }))
        .filter((p) => p.cx >= chartWindowStart && p.cx <= chartWindowEnd)
    } else {
      const [l, r] = domain
      rows = freqPoints
        .map((p) => ({ ...p, cx: timeline.toCompressed(p.timestamp) }))
        .filter((p) => p.cx >= l && p.cx <= r)
    }
    const [zl, zr] = magRawDomain
    return rows.filter((p) => p.cx >= zl && p.cx <= zr)
  }, [magChartData, timeline, domain, chartWindowStart, chartWindowEnd, magRawDomain])

  const enrichedData = useMemo(
    () => buildEnrichedData(visibleData, parsedSignals),
    [visibleData, parsedSignals],
  )

  const [showMovingAverage, setShowMovingAverage] = useState(false)
  const [maRangeMs, setMaRangeMs] = useState(MA_DEFAULT_RANGE_MS)
  const [maSelectMode, setMaSelectMode] = useState(false)
  const [maRegion, setMaRegion] = useState<{ startTs: number; endTs: number } | null>(null)
  const [maRefLeft, setMaRefLeft] = useState<number | null>(null)
  const [maRefRight, setMaRefRight] = useState<number | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartMouseDown = useCallback((e: any) => {
    if (maSelectMode && e?.activeLabel != null) {
      setMaRefLeft(Number(e.activeLabel))
      setMaRefRight(null)
      return
    }
    onChartMouseDown(e)
  }, [maSelectMode, onChartMouseDown])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartMouseMove = useCallback((e: any) => {
    if (maSelectMode && maRefLeft !== null && e?.activeLabel != null) {
      setMaRefRight(Number(e.activeLabel))
      return
    }
    onChartMouseMove(e)
  }, [maSelectMode, maRefLeft, onChartMouseMove])

  const chartMouseUp = useCallback(() => {
    if (maSelectMode) {
      if (maRefLeft !== null && maRefRight !== null && maRefLeft !== maRefRight) {
        const left = Math.min(maRefLeft, maRefRight)
        const right = Math.max(maRefLeft, maRefRight)
        setMaRegion({ startTs: timeline.toReal(left), endTs: timeline.toReal(right) })
      }
      setMaRefLeft(null)
      setMaRefRight(null)
      setMaSelectMode(false)
      return
    }
    onChartMouseUp()
  }, [maSelectMode, maRefLeft, maRefRight, timeline, onChartMouseUp])

  const chartMouseLeave = useCallback(() => {
    if (maSelectMode && maRefLeft !== null) {
      setMaRefLeft(null)
      setMaRefRight(null)
      return
    }
    cancelSelection()
  }, [maSelectMode, maRefLeft, cancelSelection])

  const enrichedDataWithMA = useMemo(() => {
    if (!showMovingAverage || enrichedData.length === 0) return enrichedData
    const halfMs = maRangeMs / 2
    const regionStart = maRegion?.startTs ?? -Infinity
    const regionEnd = maRegion?.endTs ?? Infinity
    const result: typeof enrichedData = new Array(enrichedData.length)
    let lo = 0
    let hi = 0
    let sum = 0
    let count = 0
    for (let i = 0; i < enrichedData.length; i++) {
      const ts = enrichedData[i]!.timestamp
      if (ts < regionStart || ts > regionEnd) {
        result[i] = enrichedData[i]!
        continue
      }
      const minTs = Math.max(ts - halfMs, regionStart)
      const maxTs = Math.min(ts + halfMs, regionEnd)
      while (hi < enrichedData.length && enrichedData[hi]!.timestamp <= maxTs) {
        const v = enrichedData[hi]!.flowValue
        if (v != null) { sum += v; count++ }
        hi++
      }
      while (lo < enrichedData.length && enrichedData[lo]!.timestamp < minTs) {
        const v = enrichedData[lo]!.flowValue
        if (v != null) { sum -= v; count-- }
        lo++
      }
      if (count === 0) {
        result[i] = enrichedData[i]!
      } else {
        result[i] = { ...enrichedData[i]!, movingAvg: sum / count }
      }
    }
    return result
  }, [enrichedData, showMovingAverage, maRangeMs, maRegion])

  const maRegionStats = useMemo(() => {
    if (!showMovingAverage || !maRegion || enrichedDataWithMA.length === 0) return null
    const flowValues: number[] = []
    let maSum = 0
    let maCount = 0
    for (const point of enrichedDataWithMA) {
      if (point.timestamp < maRegion.startTs || point.timestamp > maRegion.endTs) continue
      if (point.flowValue != null) flowValues.push(point.flowValue)
      const ma = (point as Record<string, unknown>).movingAvg as number | undefined
      if (ma != null) { maSum += ma; maCount++ }
    }
    if (flowValues.length === 0) return null
    const directAvg = flowValues.reduce((a, b) => a + b, 0) / flowValues.length
    let varianceSum = 0
    for (const v of flowValues) { const d = v - directAvg; varianceSum += d * d }
    const directVariance = varianceSum / flowValues.length
    return {
      directAvg,
      directVariance,
      maAvg: maCount > 0 ? maSum / maCount : null,
    }
  }, [showMovingAverage, maRegion, enrichedDataWithMA])

  const handleSaveTag = useCallback(async () => {
    if (!tagFormTimestamp || !tagTitle.trim()) return
    await createTag(tagFormTimestamp, tagTitle.trim(), tagDescription.trim())
    setTagFormTimestamp(null)
    setTagTitle('')
    setTagDescription('')
  }, [tagFormTimestamp, tagTitle, tagDescription, createTag])

  const handleCancelTag = useCallback(() => {
    setTagFormTimestamp(null)
    setTagTitle('')
    setTagDescription('')
  }, [])

  const closeTagModal = useCallback(() => {
    setSelectedTag(null)
    setIsEditingTag(false)
  }, [setSelectedTag])

  const startEditTag = useCallback(() => {
    if (!selectedTag) return
    setEditTagTitle(selectedTag.title)
    setEditTagDescription(selectedTag.description ?? '')
    setIsEditingTag(true)
  }, [selectedTag])

  const cancelEditTag = useCallback(() => {
    setIsEditingTag(false)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedTag || !editTagTitle.trim()) return
    await updateTag(
      selectedTag.id,
      editTagTitle.trim(),
      editTagDescription.trim(),
    )
    setIsEditingTag(false)
  }, [selectedTag, editTagTitle, editTagDescription, updateTag])

  const handleDeleteTag = useCallback(
    async (id: number) => {
      await deleteTag(id)
      setIsEditingTag(false)
    },
    [deleteTag],
  )

  if (sensorsLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">Flow Reports</h1>
          {isLive && connected && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live
            </span>
          )}
        </div>

        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={handleToggleLive}
            className={`w-full shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:w-auto sm:px-3 sm:py-2 sm:text-sm ${
              isLive
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>

          <select
            value={selectedSensorId ?? ''}
            onChange={onSensorChange}
            className="min-w-0 w-full truncate rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:min-w-[12rem] sm:max-w-md sm:flex-1 sm:px-3 sm:py-2 sm:text-sm"
          >
            {sensors.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.name ?? `Sensor #${sensor.id}`}
                {sensor.building?.name ? ` — ${sensor.building.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {reportsError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {reportsError}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div
          className={`w-full min-w-0 sm:max-w-sm sm:min-w-0 sm:flex-1 ${showMagnetometerUi ? '' : 'hidden'}`}
          aria-hidden={!showMagnetometerUi}
        >
          <LiveFlowIndicator
            buildingId={selectedBuildingId ?? undefined}
            fallbackMagSensorId={selectedSensorId ?? undefined}
          />
        </div>
        {liveSensorFlowLph != null && (
          <div className="w-full min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:max-w-sm sm:flex-1 sm:p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Live (sensor report)
            </p>
            <p className="text-xl font-bold tabular-nums text-sky-600 sm:text-2xl dark:text-sky-400">
              {liveSensorFlowLph.toFixed(1)}{' '}
              <span className="text-sm font-normal text-gray-400">L/h</span>
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Latest sample for this sensor
            </p>
          </div>
        )}
        {showMagnetometerUi && volumeBuckets.some((b) => b.volumeL > 0) && (
          <div className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3 sm:flex-[2] sm:px-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:mb-3">
              Volume Used
            </p>
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700/80 sm:flex sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:divide-y-0">
              {volumeBuckets.map((b) => {
                const vol =
                  b.volumeL < 1
                    ? b.volumeL.toFixed(3)
                    : b.volumeL < 100
                      ? b.volumeL.toFixed(1)
                      : Math.round(b.volumeL)
                return (
                  <div
                    key={b.label}
                    className="flex min-w-0 flex-row items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 sm:min-w-[4.25rem] sm:flex-col sm:items-start sm:justify-start sm:gap-0 sm:py-0"
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-300 sm:order-2 sm:mt-1 sm:text-[11px] sm:font-normal sm:text-gray-500 dark:sm:text-gray-400">
                      {b.label}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-emerald-600 sm:order-1 sm:text-lg dark:text-emerald-400">
                      {vol}
                      <span className="text-xs font-normal text-gray-400"> L</span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-4 space-y-3 sm:mb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-4">
            {selectedSensorName && (
              <p className="min-w-0 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Sensor:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedSensorName}
                </span>
                {isLive && (
                  <span className="ml-1 text-xs text-gray-400">
                    (
                    {showMagnetometerUi
                      ? chartData.length || magChartData.length
                      : chartData.length}{' '}
                    pts)
                  </span>
                )}
              </p>
            )}
            {chartData.length >= 2 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Total:{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalLiters < 1 ? totalLiters.toFixed(2) : totalLiters.toFixed(1)} L
                </span>
              </p>
            )}
            </div>
            {showMagnetometerUi && magChartData.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedSensorId == null) return
                  navigate(buildPath(selectedSensorId, timeRange, !showRawData))
                }}
                className={`w-full shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:ml-auto sm:w-auto sm:py-1 ${
                  showRawData
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {showRawData ? 'Hide Raw Data' : 'View Raw Data'}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="inline-flex max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-[11px] font-medium [-webkit-overflow-scrolling:touch] dark:border-gray-700 dark:bg-gray-900 sm:p-1 sm:text-xs">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onTimeRangeChange(opt.value as TimeRange)
                  }
                  className={`shrink-0 rounded-md px-2 py-1 transition-colors sm:px-3 sm:py-1.5 ${rangeButtonClass(timeRange === opt.value)}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustomPicker((v) => !v)}
                className={`shrink-0 rounded-md px-2 py-1 transition-colors sm:px-3 sm:py-1.5 ${rangeButtonClass(timeRange === 'custom')}`}
              >
                Custom
              </button>
            </div>

            {showCustomPicker && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                <label className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  From
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  To
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <button
                  onClick={applyCustomRange}
                  disabled={!customFrom || !customTo}
                  className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            )}

            {timeRange === 'custom' && customWindow && !showCustomPicker && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
                {new Date(customWindow.since).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                {' – '}
                {new Date(customWindow.until).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            )}

            {timeRange !== 'all' && timeRange !== 'custom' && (
              <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900 sm:gap-1 sm:p-1">
                <button
                  onClick={handlePreviousPeriod}
                  className="rounded-md px-1.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-xs"
                  title="Previous period"
                >
                  ‹ Prev
                </button>
                <button
                  onClick={handleNextPeriod}
                  disabled={periodOffset === 0}
                  className="rounded-md px-1.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-xs"
                  title="Next period"
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>

        {periodLabel && (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300 sm:flex-row sm:items-center sm:gap-2">
            <div className="min-w-0">
              <span className="font-medium">Viewing past period:</span>{' '}
              <span className="break-words">{periodLabel}</span>
            </div>
            <button
              type="button"
              onClick={handleNextPeriod}
              className="w-full shrink-0 rounded px-2 py-1 font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/40 sm:ml-auto sm:w-auto sm:py-0.5"
            >
              ← Back to current
            </button>
          </div>
        )}

        <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="inline-flex w-fit max-w-full shrink-0 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={panLeft}
              className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
              title="Pan left"
            >
              ◀
            </button>
            <button
              onClick={zoomOut}
              className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={zoomIn}
              className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={panRight}
              className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
              title="Pan right"
            >
              ▶
            </button>
          </div>
          <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowMovingAverage((v) => {
                    if (v) { setMaSelectMode(false); setMaRegion(null) }
                    return !v
                  })
                }}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs ${
                  showMovingAverage
                    ? 'border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'border-gray-200 bg-gray-100 text-gray-500 hover:bg-white hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
                title="Toggle moving average"
              >
                MA
              </button>
              {showMovingAverage && (
                <>
                  <div className="inline-flex max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-orange-200 bg-orange-50 p-0.5 [-webkit-overflow-scrolling:touch] dark:border-orange-800 dark:bg-orange-900/20">
                    {MA_RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMaRangeMs(opt.value)}
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors sm:px-2 sm:py-0.5 sm:text-xs ${
                          maRangeMs === opt.value
                            ? 'bg-orange-500 text-white'
                            : 'text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMaSelectMode(true); setMaRegion(null) }}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs ${
                      maSelectMode
                        ? 'border-orange-400 bg-orange-500 text-white'
                        : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/40'
                    }`}
                    title="Drag on chart to select MA region"
                  >
                    {maSelectMode ? 'Selecting…' : 'Select'}
                  </button>
                  {maRegion && (
                    <button
                      type="button"
                      onClick={() => setMaRegion(null)}
                      className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600 transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/40 sm:px-2.5 sm:text-xs"
                      title="Clear selected region — MA will apply to full chart"
                    >
                      Clear
                    </button>
                  )}
                </>
              )}
            </div>
            {isZoomed && (
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 sm:px-2.5 sm:text-xs"
              >
                Reset
              </button>
            )}
            <span className="hidden text-xs text-gray-400 dark:text-gray-500 lg:inline">
              Drag to zoom · Scroll to zoom · Swipe to pan
            </span>
          </div>
        </div>

        {maRegionStats && (
          <div className="mb-3 flex flex-wrap items-center gap-4 rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2 dark:border-orange-800 dark:bg-orange-900/15">
            <span className="text-[11px] font-medium text-orange-700 dark:text-orange-300 sm:text-xs">
              Selected range:
            </span>
            <span className="text-[11px] text-gray-600 dark:text-gray-300 sm:text-xs">
              Direct avg:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {toLph(maRegionStats.directAvg).toFixed(1)} L/h
              </span>
            </span>
            <span className="text-[11px] text-gray-600 dark:text-gray-300 sm:text-xs">
              Variance:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(toLph(Math.sqrt(maRegionStats.directVariance))).toFixed(2)} L/h
              </span>
              <span className="ml-0.5 text-gray-400 dark:text-gray-500">(σ)</span>
            </span>
            {maRegionStats.maAvg != null && (
              <span className="text-[11px] text-gray-600 dark:text-gray-300 sm:text-xs">
                MA avg:{' '}
                <span className="font-semibold" style={{ color: MA_COLOR }}>
                  {toLph(maRegionStats.maAvg).toFixed(1)} L/h
                </span>
              </span>
            )}
          </div>
        )}

        {signalTypeIds.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Signals:
            </span>
            {signalTypeIds.map((typeId) => (
              <div key={typeId} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-4 rounded-full"
                  style={{
                    backgroundColor: getSignalColorByType(typeId),
                  }}
                />
                {editingMappingType === typeId ? (
                  <input
                    type="text"
                    value={editingMappingLabel}
                    onChange={(e) => setEditingMappingLabel(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && editingMappingLabel.trim()) {
                        await updateMapping(typeId, editingMappingLabel.trim())
                        setEditingMappingType(null)
                      }
                      if (e.key === 'Escape') setEditingMappingType(null)
                    }}
                    onBlur={async () => {
                      if (editingMappingLabel.trim()) {
                        await updateMapping(typeId, editingMappingLabel.trim())
                      }
                      setEditingMappingType(null)
                    }}
                    autoFocus
                    className="w-24 rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-600 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingMappingType(typeId)
                      setEditingMappingLabel(
                        getSignalLabel(typeId, sensorMappings),
                      )
                    }}
                    className="rounded px-1 py-0.5 text-xs text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Click to rename"
                  >
                    {getSignalLabel(typeId, sensorMappings)}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {maSelectMode && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
            <span className="font-medium">Drag on the chart to select the MA region</span>
            <button
              onClick={() => setMaSelectMode(false)}
              className="ml-auto rounded px-2 py-0.5 font-medium transition-colors hover:bg-orange-100 dark:hover:bg-orange-900/40"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Water Usage per bucket */}
        {bucketedFlowData.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Water Usage
            </h3>
            {showMagnetometerUi && showRawData && magVolumeFromCycles && (
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {magVolumeFromCycles.fullCycles}
                </span>{' '}
                full cycle(s) in the raw mag zoom →{' '}
                <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                  {magVolumeFromCycles.volumeL.toFixed(3)} L
                </span>
                <span className="ml-2 text-gray-400">
                  (1 cycle = {magVolumeFromCycles.litresPerCycle.toFixed(4)} L)
                </span>
              </p>
            )}
            <div className="h-[200px] w-full min-w-0 overflow-hidden sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stackedBarData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 14 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={[chartWindowStart, chartWindowEnd]}
                    allowDataOverflow
                    ticks={flowBarAxisTicks}
                    tickFormatter={(ts: number) => formatTick(ts, flowBarAxisRangeMs)}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    yAxisId="left"
                    width={50}
                    domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, 0.01)]}
                    allowDataOverflow
                    tickFormatter={(v: number) => v < 0.01 ? v.toFixed(3) : v < 1 ? v.toFixed(2) : v.toFixed(1)}
                    tick={{ fontSize: 11, fill: '#3b82f6' }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    label={{ value: 'Litres', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#3b82f6' } }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload as Record<string, number> | undefined
                      if (!row) return null
                      const totalL = row.bucketVolumeL ?? 0
                      const flowRate = row.flowRateLph ?? 0
                      const isPartial = row.partial === 1
                      const bStart = typeof label === 'number' ? label - bucketMs / 2 : null
                      const bEnd = typeof label === 'number' ? label + bucketMs / 2 : null
                      const fmtBucket = (ms: number) =>
                        new Date(ms).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          ...(bucketMs < 60_000 ? { second: '2-digit' } : {}),
                          hour12: false,
                        })
                      const timeStr = bStart != null && bEnd != null
                        ? `${fmtBucket(bStart)} – ${fmtBucket(bEnd)}`
                        : ''
                      const breakdown: { type: string; vol: number; color: string }[] = []
                      for (const t of volumeSignalTypes) {
                        const v = row[`vol_${t}`] ?? 0
                        if (v > 0) breakdown.push({ type: t, vol: v, color: SIGNAL_TYPE_COLORS[t] ?? '#6b7280' })
                      }
                      const unattr = row['vol__unattributed'] ?? 0
                      if (unattr > 0) breakdown.push({ type: 'unclassified', vol: unattr, color: '#3b82f6' })
                      return (
                        <div
                          className="rounded-lg border px-3 py-2 text-xs shadow-sm"
                          style={{
                            backgroundColor: colors.tooltipBg,
                            borderColor: colors.tooltipBorder,
                            color: colors.tooltipText,
                          }}
                        >
                          <p className="mb-2 font-semibold" style={{ fontSize: 12 }}>
                            {timeStr}
                          </p>
                          <p
                            className="font-medium tabular-nums"
                            style={{ fontSize: 13, color: '#3b82f6' }}
                          >
                            {totalL < 0.01 ? totalL.toFixed(4) : totalL.toFixed(3)} L
                            {isPartial ? ' (so far)' : ''}
                          </p>
                          {breakdown.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {breakdown.map((b) => (
                                <p key={b.type} className="tabular-nums text-[11px]" style={{ color: b.color }}>
                                  {b.type}: {b.vol < 0.01 ? b.vol.toFixed(4) : b.vol.toFixed(3)} L
                                </p>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-[11px] leading-snug tabular-nums text-gray-500 dark:text-gray-400">
                            {flowRate.toFixed(1)} L/h avg
                          </p>
                        </div>
                      )
                    }}
                  />
                  {volumeSignalTypes.map((t) => (
                    <Bar
                      key={t}
                      yAxisId="left"
                      dataKey={`vol_${t}`}
                      stackId="volume"
                      name={t}
                      fill={SIGNAL_TYPE_COLORS[t] ?? '#6b7280'}
                      isAnimationActive={false}
                    />
                  ))}
                  <Bar
                    yAxisId="left"
                    dataKey="vol__unattributed"
                    stackId="volume"
                    name="Unclassified"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-peak flow rate line chart */}
        {showMagnetometerUi && peakFlowData.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Flow Rate (per cycle)
            </h3>
            {showRawData && magVolumeFromCycles && (
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Each spike is one cycle; volume in the raw mag zoom uses the same calibration (
                {magVolumeFromCycles.litresPerCycle.toFixed(4)} L per cycle).
              </p>
            )}
            <div className="h-[160px] w-full sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={peakFlowData} margin={{ top: 5, right: 20, left: 10, bottom: 14 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={[chartWindowStart, chartWindowEnd]}
                    ticks={peakFlowAxisTicks}
                    tickFormatter={(ts: number) => formatTick(ts, magRangeMs)}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    domain={[-1, (dataMax: number) => Math.max(dataMax * 1.1, 100)]}
                    allowDataOverflow
                    tickFormatter={(v: number) => v < 0 ? '' : String(Math.round(v))}
                    tick={{ fontSize: 11, fill: '#8b5cf6' }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    label={{ value: 'L/h', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#8b5cf6' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      borderColor: colors.tooltipBorder,
                      color: colors.tooltipText,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: unknown) => [
                      typeof value === 'number' ? value.toFixed(2) + ' L/h' : '—',
                      'Flow Rate',
                    ]}
                    labelFormatter={(ts: unknown) =>
                      typeof ts === 'number'
                        ? new Date(ts).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                          })
                        : ''
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="flowRateLph"
                    name="Flow Rate"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: '#8b5cf6' }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(reportsLoading || magLoading) && chartData.length === 0 && bucketedFlowData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <svg className="h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Loading data…
            </div>
          </div>
        ) : chartData.length === 0 && bucketedFlowData.length === 0 && magChartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-gray-400">
            No data for this time range
          </div>
        ) : chartData.length > 0 ? (
          <div
            ref={chartWrapperRef}
            className={`h-[280px] select-none sm:h-[400px] ${maSelectMode ? 'cursor-crosshair' : ''}`}
            onMouseLeave={chartMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={enrichedDataWithMA}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                onMouseDown={chartMouseDown}
                onMouseMove={chartMouseMove}
                onMouseUp={chartMouseUp}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  dataKey="cx"
                  type="number"
                  domain={domain}
                  allowDataOverflow
                  ticks={zoomTicks}
                  tickFormatter={(cx: number) =>
                    formatTick(timeline.toReal(cx), realVisibleRange)
                  }
                  tick={{ fontSize: 11, fill: colors.axis }}
                  tickLine={{ stroke: colors.grid }}
                  axisLine={{ stroke: colors.grid }}
                />
                <YAxis
                  width={50}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => toLph(v).toFixed(0)}
                  tick={{ fontSize: 11, fill: colors.axis }}
                  tickLine={{ stroke: colors.grid }}
                  axisLine={{ stroke: colors.grid }}
                  label={{
                    value: 'L/h',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: colors.axis },
                  }}
                />
                <Tooltip
                  content={<CustomTooltip colors={colors} />}
                />
                {refAreaLeft !== null &&
                  refAreaRight !== null &&
                  refAreaLeft !== refAreaRight && (
                    <ReferenceArea
                      x1={refAreaLeft}
                      x2={refAreaRight}
                      strokeOpacity={0.3}
                      fill={colors.line}
                      fillOpacity={0.15}
                    />
                  )}
                {maRefLeft !== null &&
                  maRefRight !== null &&
                  maRefLeft !== maRefRight && (
                    <ReferenceArea
                      x1={Math.min(maRefLeft, maRefRight)}
                      x2={Math.max(maRefLeft, maRefRight)}
                      strokeOpacity={0.4}
                      fill="#f97316"
                      fillOpacity={0.15}
                    />
                  )}
                {showMovingAverage && maRegion && (
                  <ReferenceArea
                    x1={timeline.toCompressed(maRegion.startTs)}
                    x2={timeline.toCompressed(maRegion.endTs)}
                    strokeOpacity={0.3}
                    fill="#f97316"
                    fillOpacity={0.08}
                    stroke="#f97316"
                    strokeDasharray="4 3"
                  />
                )}
                {visibleTags.map((tag) => (
                  <ReferenceLine
                    key={tag.id}
                    x={timeline.toCompressed(
                      new Date(tag.tagged_at).getTime(),
                    )}
                    stroke="#f59e0b"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{
                      value:
                        tag.title.length > 15
                          ? tag.title.slice(0, 15) + '\u2026'
                          : tag.title,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#f59e0b',
                      fontWeight: 500,
                    }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="flow_default"
                  name="Flow"
                  stroke={colors.line}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  connectNulls={false}
                  label={(props: RechartLabelProps) =>
                    renderValueLabel(
                      props,
                      enrichedDataWithMA.length,
                      colors.axis,
                    )
                  }
                />
                {signalTypeIds.map((typeId) => (
                  <Line
                    key={typeId}
                    type="monotone"
                    dataKey={`flow_type_${typeId}`}
                    name={getSignalLabel(typeId, sensorMappings)}
                    stroke={getSignalColorByType(typeId)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                ))}
                {showMovingAverage && (
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    name="Moving Average"
                    stroke={MA_COLOR}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls={true}
                    strokeDasharray="8 4"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {showMagnetometerUi && showRawData && magLayerBaseData.length > 0 && (
          <div
            ref={magRawChartWrapperRef}
            className="select-none"
            onMouseLeave={onMagRawMouseLeave}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 sm:text-sm">
                Raw mag time range
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={magRawPanLeft}
                  className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
                  title="Pan left"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={magRawZoomOut}
                  className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={magRawZoomIn}
                  className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={magRawPanRight}
                  className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm"
                  title="Pan right"
                >
                  ▶
                </button>
              </div>
              {magRawIsZoomed && (
                <button
                  type="button"
                  onClick={resetMagRawZoom}
                  className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 sm:px-2.5 sm:text-xs"
                >
                  Reset zoom
                </button>
              )}
              <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
                Drag to select · Scroll to zoom · Swipe to pan
              </span>
            </div>
            {magPendingSelection && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                {magSelectionVolume ? (
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {magSelectionVolume.volumeL.toFixed(3)} L
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {magSelectionVolume.fullCycles} cycle{magSelectionVolume.fullCycles !== 1 ? 's' : ''}
                      <span className="mx-1">·</span>
                      {magSelectionVolume.litresPerCycle.toFixed(4)} L/cycle
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {magSelectionVolume.durationMs < 60_000
                        ? `${(magSelectionVolume.durationMs / 1000).toFixed(1)}s`
                        : `${(magSelectionVolume.durationMs / 60_000).toFixed(1)}m`}
                      {' '}selected
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    No calibration — cannot compute volume
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={commitMagRawZoom}
                    className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                  >
                    Zoom in
                  </button>
                  <button
                    type="button"
                    onClick={clearMagRawSelection}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {magDisplayData.length === 0 && magRawIsZoomed && (
              <p className="mb-3 text-center text-xs text-amber-600 dark:text-amber-400">
                No samples in this zoom range — reset zoom or drag a wider selection.
              </p>
            )}
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Total Magnitude
            </h3>
            <div className="h-[200px] w-full sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={magDisplayData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    domain={totalMagYDomain}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : '—',
                      name ?? '',
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const realTs = timeline.toReal(Number(cx))
                      return new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Magnitude"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              X Axis
            </h3>
            <div className="h-[200px] w-full sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={magDisplayData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    domain={xAxisYDomain}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                      whiteSpace: 'pre-line' as const,
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : '—',
                      name ?? '',
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const cxNum = Number(cx)
                      const hasT = timeline.points.length > 0
                      const realTs = hasT ? timeline.toReal(cxNum) : cxNum
                      const timeStr = new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                      const match = detectorSignalOverlays.find(
                        (s) => cxNum >= s.startCx && cxNum <= s.endCx,
                      )
                      return match ? `${timeStr}\n${match.fullLabel}` : timeStr
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  {detectorSignalOverlays.map((sig) => (
                    <ReferenceArea
                      key={`dsig-${sig.id}`}
                      x1={sig.startCx}
                      x2={sig.endCx}
                      fill={sig.color}
                      fillOpacity={0.18}
                      stroke={sig.color}
                      strokeWidth={1.5}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="x"
                    name="X Axis"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Y Axis
            </h3>
            <div className="h-[200px] w-full sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={magDisplayData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    domain={yAxisYDomain}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : '—',
                      name ?? '',
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const realTs = timeline.toReal(Number(cx))
                      return new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="y"
                    name="Y Axis"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Z Axis
            </h3>
            <div className="h-[200px] w-full sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={magDisplayData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    domain={zAxisYDomain}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : '—',
                      name ?? '',
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const realTs = timeline.toReal(Number(cx))
                      return new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="z"
                    name="Z Axis"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>

            {compressedWaveFreqData.length > 0 && (
          <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Vibration Intensity — X Axis (5s window)
            </h3>
            <div className="h-[160px] w-full sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={compressedWaveFreqData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      typeof value === 'number' ? value.toFixed(3) : '—',
                      String(name ?? ''),
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const realTs = timeline.toReal(Number(cx))
                      return new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="activity"
                    name="Activity"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
            )}

            {vibrationData.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Vibration Intensity (10s / 60s / 5m)
            </h3>
            <div className="h-[200px] w-full sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={vibrationData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                    tickFormatter={(v: number) => v.toFixed(3)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      typeof value === 'number' ? value.toFixed(4) : '—',
                      name === 'bandEnergy10s' ? '10s' : name === 'bandEnergy60s' ? '60s' : '5m',
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const realTs = timeline.toReal(Number(cx))
                      return new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="bandEnergy10s"
                    name="bandEnergy10s"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bandEnergy60s"
                    name="bandEnergy60s"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bandEnergy5m"
                    name="bandEnergy5m"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-[#f43f5e]" /> 10s
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-[#8b5cf6]" /> 60s
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-[#10b981]" /> 5m
              </span>
            </div>
          </div>
              )}

            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Building Mag Data
            </h3>
            <div className="h-[200px] w-full sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={magDisplayData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  onMouseDown={onMagRawMouseDown}
                  onMouseMove={onMagRawMouseMove}
                  onMouseUp={onMagRawMouseUp}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.grid}
                  />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={magRawDomain}
                    allowDataOverflow
                    ticks={magRawTicks}
                    tickFormatter={(cx: number) =>
                      formatTick(timeline.toReal(cx), magRawRealRangeMs)
                    }
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis
                    width={50}
                    tick={{ fontSize: 11, fill: colors.axis }}
                    tickLine={{ stroke: colors.grid }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: colors.tooltipText,
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(2) : '—',
                      name ?? '',
                    ]}
                    labelFormatter={(cx: unknown) => {
                      const realTs = timeline.toReal(Number(cx))
                      return new Date(realTs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    }}
                  />
                  {magRefAreaLeft !== null &&
                    magRefAreaRight !== null &&
                    magRefAreaLeft !== magRefAreaRight && (
                      <ReferenceArea
                        x1={magRefAreaLeft}
                        x2={magRefAreaRight}
                        strokeOpacity={0.3}
                        fill={colors.line}
                        fillOpacity={0.15}
                      />
                    )}
                  {magPendingSelection && (
                    <ReferenceArea
                      x1={magPendingSelection.left}
                      x2={magPendingSelection.right}
                      strokeOpacity={0.4}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="x"
                    name="X Axis"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    name="Y Axis"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="z"
                    name="Z Axis"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Magnitude"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#f43f5e]" /> X Axis
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" /> Y Axis
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#3b82f6]" /> Z Axis
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> Total Magnitude
              </span>
            </div>
          </div>
          </div>
        )}

        <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tags
            </h3>
            {tags.length > 0 && (
              <span className="text-xs text-gray-400">
                {tags.length} tag{tags.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {tags.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400 italic">
              Click anywhere on the chart to add a tag
            </p>
          ) : (
            <div className="space-y-1.5">
              {tags.map((tag) => {
                const tagTs = new Date(tag.tagged_at).getTime()
                const tagCx = timeline.toCompressed(tagTs)
                const inView =
                  tagCx >= domain[0] && tagCx <= domain[1]
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(tag)}
                    className="group flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/60 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-700 dark:hover:bg-amber-900/20 sm:gap-3 sm:px-4 sm:py-3"
                  >
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${inView ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      title={
                        inView ? 'Visible on chart' : 'Outside current view'
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {tag.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTooltipTime(tagTs)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-300 transition-colors group-hover:text-amber-600 dark:text-gray-600 dark:group-hover:text-amber-400">
                      View &rarr;
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {tagFormTimestamp !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 sm:p-6"
          onClick={handleCancelTag}
        >
          <div
            className="my-auto w-full max-w-md max-h-[min(90vh,100dvh)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Tag
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatTooltipTime(tagFormTimestamp)}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={tagTitle}
                  onChange={(e) => setTagTitle(e.target.value)}
                  placeholder="e.g. Spike detected"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagTitle.trim()) handleSaveTag()
                    if (e.key === 'Escape') handleCancelTag()
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancelTag()
                  }}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCancelTag}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTag}
                disabled={!tagTitle.trim()}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 sm:p-6"
          onClick={closeTagModal}
        >
          <div
            className="my-auto w-full max-w-md max-h-[min(90vh,100dvh)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTooltipTime(
                    new Date(selectedTag.tagged_at).getTime(),
                  )}
                </p>
              </div>
              <button
                onClick={closeTagModal}
                className="ml-4 flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isEditingTag ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTagTitle}
                    onChange={(e) => setEditTagTitle(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editTagTitle.trim())
                        handleSaveEdit()
                      if (e.key === 'Escape') cancelEditTag()
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={editTagDescription}
                    onChange={(e) => setEditTagDescription(e.target.value)}
                    placeholder="Optional notes..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEditTag()
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={cancelEditTag}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editTagTitle.trim()}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTag.title}
                </h3>

                {selectedTag.description ? (
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {selectedTag.description}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm italic text-gray-400 dark:text-gray-500">
                    No description added.
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteTag(selectedTag.id)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={startEditTag}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={closeTagModal}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
