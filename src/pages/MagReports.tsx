import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
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

import { computeDominantFreqOverTime, computeWaveFrequency } from '@/utils/fft'
import type { MultiAxisSample } from '@/utils/fft'
import { useTheme } from '@/contexts/ThemeContext'
import {
  RANGE_MS,
  TIME_RANGE_OPTIONS,
  useMagReportsPage,
  type MagChartPoint,
  type TimeRange,
} from '@/hooks/useMagReportsPage'

const CHART_COLORS = {
  light: {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
  },
  dark: {
    grid: '#374151',
    axis: '#9ca3af',
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#f3f4f6',
  },
} as const

const LABEL_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#06b6d4', '#ef4444', '#84cc16', '#eab308', '#a855f7',
]

function getLabelColor(index: number): string {
  return LABEL_COLORS[index % LABEL_COLORS.length]!
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

function rangeButtonClass(isActive: boolean): string {
  if (isActive) return 'bg-indigo-500 text-white'
  return 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
}

function computeYDomain(values: (number | null)[]): [number, number] {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return [0, 1]
  let min = nums[0]!
  let max = nums[0]!
  for (const v of nums) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const pad = Math.max((max - min) * 0.15, 0.05)
  return [min - pad, max + pad]
}

// --- Cycle counter ---

type AxisKey = 'total' | 'x' | 'y' | 'z'

interface CycleSelection {
  axis: AxisKey
  startTs: number
  endTs: number
}

interface DetectedPeak {
  timestamp: number
  value: number
  type: 'peak' | 'trough'
}

interface CycleResult {
  peakToPeak: number
  peak: DetectedPeak
  trough: DetectedPeak
}

interface CycleCountResult {
  maxPeakToPeak: number
  allCycles: CycleResult[]
  filteredCycles: CycleResult[]
  peaks: DetectedPeak[]
}

function extractAxisValues(data: MagChartPoint[], axis: AxisKey): { timestamp: number; value: number }[] {
  return data
    .filter((p) => p[axis] != null)
    .map((p) => ({ timestamp: p.timestamp, value: p[axis]! }))
}

function detectPeaksAndTroughs(values: { timestamp: number; value: number }[]): DetectedPeak[] {
  if (values.length < 3) return []
  const extrema: DetectedPeak[] = []
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1]!.value
    const curr = values[i]!.value
    const next = values[i + 1]!.value
    if (curr > prev && curr > next) {
      extrema.push({ timestamp: values[i]!.timestamp, value: curr, type: 'peak' })
    } else if (curr < prev && curr < next) {
      extrema.push({ timestamp: values[i]!.timestamp, value: curr, type: 'trough' })
    }
  }
  // Ensure alternating peak/trough sequence
  const alternating: DetectedPeak[] = []
  for (const e of extrema) {
    if (alternating.length === 0) {
      alternating.push(e)
      continue
    }
    const last = alternating[alternating.length - 1]!
    if (last.type === e.type) {
      // Same type: keep the more extreme one
      if (e.type === 'peak' && e.value > last.value) {
        alternating[alternating.length - 1] = e
      } else if (e.type === 'trough' && e.value < last.value) {
        alternating[alternating.length - 1] = e
      }
    } else {
      alternating.push(e)
    }
  }
  return alternating
}

function countCycles(
  data: MagChartPoint[],
  axis: AxisKey,
  startTs: number,
  endTs: number,
  tolerancePct: number,
): CycleCountResult {
  const rangeData = data.filter((p) => p.timestamp >= startTs && p.timestamp <= endTs)
  const values = extractAxisValues(rangeData, axis)
  const peaks = detectPeaksAndTroughs(values)

  const allCycles: CycleResult[] = []
  for (let i = 0; i < peaks.length - 1; i++) {
    const a = peaks[i]!
    const b = peaks[i + 1]!
    if ((a.type === 'peak' && b.type === 'trough') || (a.type === 'trough' && b.type === 'peak')) {
      const peakPt = a.type === 'peak' ? a : b
      const troughPt = a.type === 'trough' ? a : b
      allCycles.push({ peakToPeak: Math.abs(peakPt.value - troughPt.value), peak: peakPt, trough: troughPt })
    }
  }

  if (allCycles.length === 0) {
    return { maxPeakToPeak: 0, allCycles: [], filteredCycles: [], peaks }
  }

  const maxPeakToPeak = Math.max(...allCycles.map((c) => c.peakToPeak))
  const threshold = (tolerancePct / 100) * maxPeakToPeak
  const filteredCycles = allCycles.filter((c) => c.peakToPeak >= threshold)

  return { maxPeakToPeak, allCycles, filteredCycles, peaks }
}

const AXIS_LABELS: Record<AxisKey, string> = {
  total: 'Total Magnitude',
  x: 'X Axis',
  y: 'Y Axis',
  z: 'Z Axis',
}

export default function MagReports() {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]
  const navigate = useNavigate()
  const { buildingId: buildingIdParam } = useParams<{ buildingId: string }>()
  const paramBuildingId = buildingIdParam ? Number(buildingIdParam) : null

  const {
    buildings,
    selectedBuildingId,
    selectedBuildingName,
    magSensorIds,
    selectedSensorId,
    rangeLabels,
    chartData,
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
  } = useMagReportsPage(paramBuildingId)

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

  const visibleRangeMs = useMemo(() => {
    if (chartData.length < 2) return RANGE_MS[timeRange] || 60_000
    return chartData[chartData.length - 1]!.timestamp - chartData[0]!.timestamp
  }, [chartData, timeRange])

  const xTicks = useMemo(() => {
    if (chartData.length < 2) return []
    const min = chartData[0]!.timestamp
    const max = chartData[chartData.length - 1]!.timestamp
    const step = computeTickInterval(max - min)
    const start = Math.ceil(min / step) * step
    const ticks: number[] = []
    for (let t = start; t <= max; t += step) ticks.push(t)
    return ticks
  }, [chartData])

  const totalMagYDomain = useMemo(
    () => computeYDomain(chartData.map((p) => p.total)),
    [chartData],
  )
  const xAxisYDomain = useMemo(
    () => computeYDomain(chartData.map((p) => p.x)),
    [chartData],
  )
  const yAxisYDomain = useMemo(
    () => computeYDomain(chartData.map((p) => p.y)),
    [chartData],
  )
  const zAxisYDomain = useMemo(
    () => computeYDomain(chartData.map((p) => p.z)),
    [chartData],
  )

  const vibrationData = useMemo(() => {
    return chartData.filter(
      (p) => p.bandEnergy10s != null || p.bandEnergy60s != null || p.bandEnergy5m != null,
    )
  }, [chartData])

  const waveFreqData = useMemo(() => {
    const samples = chartData
      .filter((p) => p.x != null)
      .map((p) => ({ timestamp: p.timestamp, value: p.x! }))
    if (samples.length < 3) return []
    return computeWaveFrequency(samples, 5000)
  }, [chartData])

  const multiAxisSamples = useMemo<MultiAxisSample[]>(() => {
    return chartData
      .filter((p) => p.x != null && p.y != null && p.z != null)
      .map((p) => ({ timestamp: p.timestamp, values: [p.x!, p.y!, p.z!] }))
  }, [chartData])

  const fftChartData = useMemo(() => {
    if (multiAxisSamples.length < 8) return []
    const fft10s = computeDominantFreqOverTime(multiAxisSamples, 10_000, 1000)
    const fft30s = computeDominantFreqOverTime(multiAxisSamples, 30_000, 2000)

    const map30 = new Map<number, number>()
    for (const pt of fft30s) map30.set(pt.timestamp, pt.freqHz)

    const allTimestamps = new Set([
      ...fft10s.map((p) => p.timestamp),
      ...fft30s.map((p) => p.timestamp),
    ])
    const sorted = [...allTimestamps].sort((a, b) => a - b)

    const map10 = new Map<number, number>()
    for (const pt of fft10s) map10.set(pt.timestamp, pt.freqHz)

    return sorted.map((ts) => ({
      timestamp: ts,
      freqHz10s: map10.get(ts) ?? null,
      freqHz30s: map30.get(ts) ?? null,
    }))
  }, [multiAxisSamples])

  // --- Cycle counter state ---
  const [cycleSelection, setCycleSelection] = useState<CycleSelection | null>(null)
  const [cycleTolerance, setCycleTolerance] = useState(100)
  const [selRefLeft, setSelRefLeft] = useState<number | null>(null)
  const [selRefRight, setSelRefRight] = useState<number | null>(null)
  const selectingAxisRef = useRef<AxisKey | null>(null)

  const cycleResult = useMemo(() => {
    if (!cycleSelection) return null
    return countCycles(chartData, cycleSelection.axis, cycleSelection.startTs, cycleSelection.endTs, cycleTolerance)
  }, [chartData, cycleSelection, cycleTolerance])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeSelMouseDown = useCallback((axis: AxisKey) => (e: any) => {
    if (e?.activeLabel != null) {
      selectingAxisRef.current = axis
      setSelRefLeft(Number(e.activeLabel))
      setSelRefRight(null)
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelMouseMove = useCallback((e: any) => {
    if (selectingAxisRef.current !== null && selRefLeft !== null && e?.activeLabel != null) {
      setSelRefRight(Number(e.activeLabel))
    }
  }, [selRefLeft])

  const handleSelMouseUp = useCallback(() => {
    if (selectingAxisRef.current !== null && selRefLeft !== null && selRefRight !== null && selRefLeft !== selRefRight) {
      const left = Math.min(selRefLeft, selRefRight)
      const right = Math.max(selRefLeft, selRefRight)
      if (labelModeRef.current) {
        setLabelDraft({ startTs: left, endTs: right })
      } else {
        setCycleSelection({ axis: selectingAxisRef.current, startTs: left, endTs: right })
      }
    }
    selectingAxisRef.current = null
    setSelRefLeft(null)
    setSelRefRight(null)
  }, [selRefLeft, selRefRight])

  const handleSelMouseLeave = useCallback(() => {
    if (selectingAxisRef.current !== null) {
      selectingAxisRef.current = null
      setSelRefLeft(null)
      setSelRefRight(null)
    }
  }, [])

  const clearCycleSelection = useCallback(() => {
    setCycleSelection(null)
  }, [])

  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [labelMode, setLabelMode] = useState(false)
  const [labelDraft, setLabelDraft] = useState<{ startTs: number; endTs: number } | null>(null)
  const [labelName, setLabelName] = useState('')
  const labelModeRef = useRef(false)
  labelModeRef.current = labelMode

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo) return
    handleCustomRange(new Date(customFrom).toISOString(), new Date(customTo).toISOString())
    setShowCustomPicker(false)
  }, [customFrom, customTo, handleCustomRange])

  const applyAddLabel = useCallback(async () => {
    if (!labelName || !labelDraft) return
    await handleAddRangeLabel(
      new Date(labelDraft.startTs).toISOString(),
      new Date(labelDraft.endTs).toISOString(),
      labelName,
    )
    setLabelName('')
    setLabelDraft(null)
    setLabelMode(false)
  }, [labelName, labelDraft, handleAddRangeLabel])

  const cancelLabelMode = useCallback(() => {
    setLabelMode(false)
    setLabelDraft(null)
    setLabelName('')
  }, [])

  const onSensorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleSensorChange(Number(e.target.value))
    },
    [handleSensorChange],
  )

  const onBuildingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = Number(e.target.value)
      handleBuildingChange(newId)
      navigate(`/dashboard/mag-reports/${newId}`)
    },
    [handleBuildingChange, navigate],
  )

  const onTimeRangeChange = useCallback(
    (range: TimeRange) => {
      handleTimeRangeChange(range)
    },
    [handleTimeRangeChange],
  )

  const chartRangeLabels = useMemo(() => {
    if (rangeLabels.length === 0 || chartData.length === 0) return []
    const chartMin = chartData[0]!.timestamp
    const chartMax = chartData[chartData.length - 1]!.timestamp
    return rangeLabels
      .map((rl, i) => {
        const start = rl.start_date ? new Date(rl.start_date).getTime() : null
        const end = rl.end_date ? new Date(rl.end_date).getTime() : null
        if (start === null || end === null) return null
        if (end < chartMin || start > chartMax) return null
        return {
          ...rl,
          startMs: Math.max(start, chartMin),
          endMs: Math.min(end, chartMax),
          color: getLabelColor(i),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [rangeLabels, chartData])

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 8,
      fontSize: 12,
      color: colors.tooltipText,
    }),
    [colors],
  )

  const tooltipLabelFormatter = useCallback(
    (ts: unknown) => formatTooltipTime(Number(ts)),
    [],
  )

  const defaultFormatter = useCallback(
    (value: unknown, name: unknown) => [
      typeof value === 'number' ? value.toFixed(3) : '—',
      String(name ?? ''),
    ],
    [],
  )

  if (buildingsLoading) {
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
          <h1 className="text-xl font-bold sm:text-2xl">Mag Reports</h1>
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
            value={selectedBuildingId ?? ''}
            onChange={onBuildingChange}
            className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? `Building #${b.id}`}
              </option>
            ))}
          </select>

          {magSensorIds.length > 1 && (
            <select
              value={selectedSensorId ?? ''}
              onChange={onSensorChange}
              className="min-w-0 flex-1 truncate rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
            >
              {magSensorIds.map((id) => (
                <option key={id} value={id}>
                  Sensor #{id}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {magError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {magError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-4 space-y-3 sm:mb-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {selectedBuildingName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Building:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedBuildingName}
                </span>
              </p>
            )}
            {selectedSensorId != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Sensor:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  #{selectedSensorId}
                </span>
              </p>
            )}
            {chartData.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                <span className="text-xs text-gray-400">
                  ({chartData.length} pts)
                </span>
              </p>
            )}
            {selectedSensorId != null && !labelMode && (
              <button
                onClick={() => setLabelMode(true)}
                className="ml-auto rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
              >
                + Add Label
              </button>
            )}
            {labelMode && !labelDraft && (
              <button
                onClick={cancelLabelMode}
                className="ml-auto rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>

          {labelMode && !labelDraft && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              Drag on any chart below to select a time range for the label
            </div>
          )}

          {labelMode && labelDraft && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-800 dark:bg-indigo-900/20">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Selected range</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {formatTooltipTime(labelDraft.startTs)} — {formatTooltipTime(labelDraft.endTs)}
                </span>
              </div>
              <label className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                Label name
                <input
                  type="text"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  placeholder="e.g. Pump running"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') applyAddLabel() }}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <button
                onClick={applyAddLabel}
                disabled={!labelName}
                className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setLabelDraft(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                Re-select
              </button>
              <button
                onClick={cancelLabelMode}
                className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          )}

          {rangeLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {rangeLabels.map((rl, i) => (
                <span
                  key={rl.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: getLabelColor(i) }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-white/60"
                  />
                  {rl.label ?? 'Unlabeled'}
                  <button
                    onClick={() => handleDeleteRangeLabel(rl.id)}
                    className="ml-0.5 rounded-full p-0.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                    title="Remove label"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-[11px] font-medium dark:border-gray-700 dark:bg-gray-900 sm:p-1 sm:text-xs">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onTimeRangeChange(opt.value as TimeRange)}
                  className={`rounded-md px-2 py-1 transition-colors sm:px-3 sm:py-1.5 ${rangeButtonClass(timeRange === opt.value)}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomPicker((v) => !v)}
                className={`rounded-md px-2 py-1 transition-colors sm:px-3 sm:py-1.5 ${rangeButtonClass(timeRange === 'custom')}`}
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

        {selectedSensorId === null && !magLoading ? (
          <div className="flex h-80 items-center justify-center text-gray-400">
            No mag sensors found for this building
          </div>
        ) : magLoading && chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-gray-500 dark:text-gray-400">
            Loading mag data…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-gray-400">
            No mag data for this time range
          </div>
        ) : (
          <>
            {!labelMode && (
              <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                Drag on any axis chart to select a range for cycle counting
              </p>
            )}

            {/* Cycle counter results panel */}
            {cycleSelection && cycleResult && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-900/15">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Cycle Counter — {AXIS_LABELS[cycleSelection.axis]}
                  </h3>
                  <button
                    onClick={clearCycleSelection}
                    className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                  >
                    Clear
                  </button>
                </div>
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-300">
                  {formatTooltipTime(cycleSelection.startTs)} — {formatTooltipTime(cycleSelection.endTs)}
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    Tolerance:
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={cycleTolerance}
                      onChange={(e) => setCycleTolerance(Number(e.target.value))}
                      className="h-1.5 w-28 cursor-pointer accent-emerald-500"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={cycleTolerance}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(100, Number(e.target.value) || 1))
                        setCycleTolerance(v)
                      }}
                      className="w-14 rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-center text-xs text-gray-900 dark:border-emerald-700 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-6 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Largest peak-to-peak: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {cycleResult.maxPeakToPeak.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Threshold: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {(cycleResult.maxPeakToPeak * cycleTolerance / 100).toFixed(4)}
                    </span>
                    <span className="ml-1 text-gray-400">({cycleTolerance}%)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Total half-cycles: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {cycleResult.allCycles.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Matching half-cycles: </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {cycleResult.filteredCycles.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Full cycles (÷2): </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {Math.floor(cycleResult.filteredCycles.length / 2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Magnitude */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Total Magnitude
                {cycleSelection?.axis === 'total' && (
                  <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">● selected</span>
                )}
              </h3>
              <div
                className="h-[200px] w-full cursor-crosshair select-none sm:h-[280px]"
                onMouseLeave={handleSelMouseLeave}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    onMouseDown={makeSelMouseDown('total')}
                    onMouseMove={handleSelMouseMove}
                    onMouseUp={handleSelMouseUp}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      ticks={xTicks}
                      tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                      contentStyle={tooltipStyle}
                      formatter={defaultFormatter}
                      labelFormatter={tooltipLabelFormatter}
                    />
                    {chartRangeLabels.map((rl) => (
                      <ReferenceArea key={`rl-${rl.id}`} x1={rl.startMs} x2={rl.endMs} fill={rl.color} fillOpacity={0.12} stroke={rl.color} strokeDasharray="4 3" label={{ value: rl.label ?? '', position: 'insideTop', fill: rl.color, fontSize: 11, fontWeight: 600 }} />
                    ))}
                    {selRefLeft !== null && selRefRight !== null && selectingAxisRef.current === 'total' && (
                      <ReferenceArea x1={Math.min(selRefLeft, selRefRight)} x2={Math.max(selRefLeft, selRefRight)} fill={labelMode ? '#6366f1' : '#10b981'} fillOpacity={0.15} strokeOpacity={0.3} />
                    )}
                    {labelDraft && labelMode && (
                      <ReferenceArea x1={labelDraft.startTs} x2={labelDraft.endTs} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeDasharray="4 3" label={{ value: labelName || 'New label…', position: 'insideTop', fill: '#6366f1', fontSize: 11, fontWeight: 600 }} />
                    )}
                    {cycleSelection?.axis === 'total' && (
                      <ReferenceArea x1={cycleSelection.startTs} x2={cycleSelection.endTs} fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'total' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`p-${c.peak.timestamp}`} x={c.peak.timestamp} stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
                    {cycleSelection?.axis === 'total' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`t-${c.trough.timestamp}`} x={c.trough.timestamp} stroke="#ef4444" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
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
            </div>

            {/* X Axis */}
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                X Axis
                {cycleSelection?.axis === 'x' && (
                  <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">● selected</span>
                )}
              </h3>
              <div
                className="h-[200px] w-full cursor-crosshair select-none sm:h-[250px]"
                onMouseLeave={handleSelMouseLeave}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    onMouseDown={makeSelMouseDown('x')}
                    onMouseMove={handleSelMouseMove}
                    onMouseUp={handleSelMouseUp}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      ticks={xTicks}
                      tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                      contentStyle={tooltipStyle}
                      formatter={defaultFormatter}
                      labelFormatter={tooltipLabelFormatter}
                    />
                    {chartRangeLabels.map((rl) => (
                      <ReferenceArea key={`rl-${rl.id}`} x1={rl.startMs} x2={rl.endMs} fill={rl.color} fillOpacity={0.12} stroke={rl.color} strokeDasharray="4 3" />
                    ))}
                    {selRefLeft !== null && selRefRight !== null && selectingAxisRef.current === 'x' && (
                      <ReferenceArea x1={Math.min(selRefLeft, selRefRight)} x2={Math.max(selRefLeft, selRefRight)} fill={labelMode ? '#6366f1' : '#10b981'} fillOpacity={0.15} strokeOpacity={0.3} />
                    )}
                    {labelDraft && labelMode && (
                      <ReferenceArea x1={labelDraft.startTs} x2={labelDraft.endTs} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'x' && (
                      <ReferenceArea x1={cycleSelection.startTs} x2={cycleSelection.endTs} fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'x' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`p-${c.peak.timestamp}`} x={c.peak.timestamp} stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
                    {cycleSelection?.axis === 'x' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`t-${c.trough.timestamp}`} x={c.trough.timestamp} stroke="#ef4444" strokeDasharray="2 2" strokeWidth={1} />
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

            {/* Y Axis */}
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Y Axis
                {cycleSelection?.axis === 'y' && (
                  <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">● selected</span>
                )}
              </h3>
              <div
                className="h-[200px] w-full cursor-crosshair select-none sm:h-[250px]"
                onMouseLeave={handleSelMouseLeave}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    onMouseDown={makeSelMouseDown('y')}
                    onMouseMove={handleSelMouseMove}
                    onMouseUp={handleSelMouseUp}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      ticks={xTicks}
                      tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                      contentStyle={tooltipStyle}
                      formatter={defaultFormatter}
                      labelFormatter={tooltipLabelFormatter}
                    />
                    {chartRangeLabels.map((rl) => (
                      <ReferenceArea key={`rl-${rl.id}`} x1={rl.startMs} x2={rl.endMs} fill={rl.color} fillOpacity={0.12} stroke={rl.color} strokeDasharray="4 3" />
                    ))}
                    {selRefLeft !== null && selRefRight !== null && selectingAxisRef.current === 'y' && (
                      <ReferenceArea x1={Math.min(selRefLeft, selRefRight)} x2={Math.max(selRefLeft, selRefRight)} fill={labelMode ? '#6366f1' : '#10b981'} fillOpacity={0.15} strokeOpacity={0.3} />
                    )}
                    {labelDraft && labelMode && (
                      <ReferenceArea x1={labelDraft.startTs} x2={labelDraft.endTs} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'y' && (
                      <ReferenceArea x1={cycleSelection.startTs} x2={cycleSelection.endTs} fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'y' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`p-${c.peak.timestamp}`} x={c.peak.timestamp} stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
                    {cycleSelection?.axis === 'y' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`t-${c.trough.timestamp}`} x={c.trough.timestamp} stroke="#ef4444" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
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

            {/* Z Axis */}
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Z Axis
                {cycleSelection?.axis === 'z' && (
                  <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">● selected</span>
                )}
              </h3>
              <div
                className="h-[200px] w-full cursor-crosshair select-none sm:h-[250px]"
                onMouseLeave={handleSelMouseLeave}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    onMouseDown={makeSelMouseDown('z')}
                    onMouseMove={handleSelMouseMove}
                    onMouseUp={handleSelMouseUp}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      ticks={xTicks}
                      tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                      contentStyle={tooltipStyle}
                      formatter={defaultFormatter}
                      labelFormatter={tooltipLabelFormatter}
                    />
                    {chartRangeLabels.map((rl) => (
                      <ReferenceArea key={`rl-${rl.id}`} x1={rl.startMs} x2={rl.endMs} fill={rl.color} fillOpacity={0.12} stroke={rl.color} strokeDasharray="4 3" />
                    ))}
                    {selRefLeft !== null && selRefRight !== null && selectingAxisRef.current === 'z' && (
                      <ReferenceArea x1={Math.min(selRefLeft, selRefRight)} x2={Math.max(selRefLeft, selRefRight)} fill={labelMode ? '#6366f1' : '#10b981'} fillOpacity={0.15} strokeOpacity={0.3} />
                    )}
                    {labelDraft && labelMode && (
                      <ReferenceArea x1={labelDraft.startTs} x2={labelDraft.endTs} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'z' && (
                      <ReferenceArea x1={cycleSelection.startTs} x2={cycleSelection.endTs} fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeDasharray="4 3" />
                    )}
                    {cycleSelection?.axis === 'z' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`p-${c.peak.timestamp}`} x={c.peak.timestamp} stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
                    {cycleSelection?.axis === 'z' && cycleResult?.filteredCycles.map((c) => (
                      <ReferenceLine key={`t-${c.trough.timestamp}`} x={c.trough.timestamp} stroke="#ef4444" strokeDasharray="2 2" strokeWidth={1} />
                    ))}
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

            {/* Vibration Intensity (10s / 60s / 5m) */}
            {vibrationData.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Vibration Intensity (10s / 60s / 5m)
                </h3>
                <div className="h-[200px] w-full sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vibrationData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={xTicks}
                        tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                        contentStyle={tooltipStyle}
                        formatter={(value: unknown, name: unknown) => [
                          typeof value === 'number' ? value.toFixed(4) : '—',
                          name === 'bandEnergy10s' ? '10s' : name === 'bandEnergy60s' ? '60s' : '5m',
                        ]}
                        labelFormatter={tooltipLabelFormatter}
                      />
                      <Line type="monotone" dataKey="bandEnergy10s" name="bandEnergy10s" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="bandEnergy60s" name="bandEnergy60s" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="bandEnergy5m" name="bandEnergy5m" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
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

            {/* Dominant Frequency (FFT) — 10s / 30s */}
            {fftChartData.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dominant Frequency (FFT)
                </h3>
                <div className="h-[200px] w-full sm:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fftChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={xTicks}
                        tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
                        tick={{ fontSize: 11, fill: colors.axis }}
                        tickLine={{ stroke: colors.grid }}
                        axisLine={{ stroke: colors.grid }}
                      />
                      <YAxis
                        width={50}
                        tick={{ fontSize: 11, fill: colors.axis }}
                        tickLine={{ stroke: colors.grid }}
                        axisLine={{ stroke: colors.grid }}
                        tickFormatter={(v: number) => v.toFixed(2)}
                        label={{
                          value: 'Hz',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: 12, fill: colors.axis },
                        }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: unknown, name: unknown) => [
                          typeof value === 'number' ? `${value.toFixed(3)} Hz` : '—',
                          name === 'freqHz10s' ? '10s window' : '30s window',
                        ]}
                        labelFormatter={tooltipLabelFormatter}
                      />
                      <Line type="monotone" dataKey="freqHz10s" name="freqHz10s" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="freqHz30s" name="freqHz30s" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded bg-[#f43f5e]" /> 10s window
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded bg-[#3b82f6]" /> 30s window
                  </span>
                </div>
              </div>
            )}

            {/* Vibration Intensity — X Axis (5s window) */}
            {waveFreqData.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Vibration Intensity — X Axis (5s window)
                </h3>
                <div className="h-[160px] w-full sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={waveFreqData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        ticks={xTicks}
                        tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                        contentStyle={tooltipStyle}
                        formatter={defaultFormatter}
                        labelFormatter={tooltipLabelFormatter}
                      />
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

            {/* Combined Building Mag Data */}
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                All Axes + Total
              </h3>
              <div className="h-[200px] w-full sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      ticks={xTicks}
                      tickFormatter={(ts: number) => formatTick(ts, visibleRangeMs)}
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
                      contentStyle={tooltipStyle}
                      formatter={(value: unknown, name: unknown) => [
                        typeof value === 'number' ? value.toFixed(2) : '—',
                        String(name ?? ''),
                      ]}
                      labelFormatter={tooltipLabelFormatter}
                    />
                    <Line type="monotone" dataKey="x" name="X Axis" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="y" name="Y Axis" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="z" name="Z Axis" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="total" name="Total Magnitude" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
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
          </>
        )}
      </div>
    </div>
  )
}
