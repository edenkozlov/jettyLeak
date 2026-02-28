import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Props as RechartLabelProps } from 'recharts/types/component/Label'
import type { TooltipProps } from 'recharts'
import {
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

import { useTheme } from '@/contexts/ThemeContext'
import { useChartTags } from '@/hooks/useChartTags'
import { useChartZoomPan } from '@/hooks/useChartZoomPan'
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
    line: '#4457c2',
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
  },
  dark: {
    line: '#6a7ed2',
    grid: '#374151',
    axis: '#9ca3af',
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#f3f4f6',
  },
} as const

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
    return 'bg-indigo-600 text-white'
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
  const [searchParams] = useSearchParams()
  const sensorParam = searchParams.get('sensor')
  const initialSensorId = sensorParam ? Number(sensorParam) : null

  const {
    sensors,
    selectedSensorId,
    selectedSensorName,
    chartData,
    timeRange,
    periodOffset,
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
    handlePreviousPeriod,
    handleNextPeriod,
  } = useReportsPage(initialSensorId)

  const periodLabel = useMemo(() => {
    if (periodOffset === 0 || timeRange === 'all') return null
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

  const dataMin =
    timeline.points.length > 0 ? timeline.points[0]!.cx : 0
  const dataMax =
    timeline.points.length > 0
      ? timeline.points[timeline.points.length - 1]!.cx
      : 0

  const homeMin = useMemo(() => {
    if (timeRange === 'all' || dataMax === 0) return dataMin
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


  const visibleRangeMsRef = useRef(0)

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

  const onSensorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      resetZoom()
      setSelectedTag(null)
      handleSensorChange(e)
    },
    [resetZoom, setSelectedTag, handleSensorChange],
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
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
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

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleToggleLive}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
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
            className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
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

      <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-4 space-y-3 sm:mb-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {selectedSensorName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Sensor:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedSensorName}
                </span>
                {isLive && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({chartData.length} pts)
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-[11px] font-medium dark:border-gray-700 dark:bg-gray-900 sm:p-1 sm:text-xs">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    onTimeRangeChange(opt.value as TimeRange)
                  }
                  className={`rounded-md px-2 py-1 transition-colors sm:px-3 sm:py-1.5 ${rangeButtonClass(timeRange === opt.value)}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {timeRange !== 'all' && (
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
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300">
            <span className="font-medium">Viewing past period:</span>
            <span>{periodLabel}</span>
            <button
              onClick={handleNextPeriod}
              className="ml-auto rounded px-2 py-0.5 font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            >
              ← Back to current
            </button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900">
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
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
                  <div className="inline-flex overflow-x-auto rounded-md border border-orange-200 bg-orange-50 p-0.5 dark:border-orange-800 dark:bg-orange-900/20">
                    {MA_RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMaRangeMs(opt.value)}
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors sm:px-2 sm:py-0.5 sm:text-xs ${
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
                onClick={resetZoom}
                className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 sm:px-2.5 sm:text-xs"
              >
                Reset
              </button>
            )}
            <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
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

        {reportsLoading ? (
          <div className="flex h-80 items-center justify-center text-gray-500 dark:text-gray-400">
            Loading chart…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-gray-400">
            No report data for this time range
          </div>
        ) : (
          <div
            ref={chartWrapperRef}
            className={`h-[280px] select-none sm:h-[400px] ${maSelectMode ? 'cursor-crosshair' : ''}`}
            onMouseLeave={chartMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={enrichedDataWithMA}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancelTag}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:p-6"
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
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeTagModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:p-6"
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
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
