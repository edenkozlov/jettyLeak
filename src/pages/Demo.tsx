import { useMemo } from 'react'
import type { Props as RechartLabelProps } from 'recharts/types/component/Label'
import type { TooltipProps } from 'recharts'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router'

import logo from '@/assets/logoTransparent.png'
import { useTheme } from '@/contexts/ThemeContext'
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
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }
  if (rangeMs <= 6 * 60 * 60_000) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
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
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const MAX_VISIBLE_LABELS = 14

function renderValueLabel(props: RechartLabelProps, totalPoints: number, color: string) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const index = Number(props.index ?? 0)
  const value = props.value as number | null | undefined
  const interval = Math.max(1, Math.floor(totalPoints / MAX_VISIBLE_LABELS))
  if (index % interval !== 0) return null
  if (value === null || value === undefined) return null
  return (
    <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fontWeight={500} fill={color}>
      {toLph(value).toFixed(1)}
    </text>
  )
}

function rangeButtonClass(isActive: boolean): string {
  return isActive ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
}

interface CompressedPoint { timestamp: number; cx: number; flowValue: number | null }
interface TimelineCompression { points: CompressedPoint[]; toCompressed: (ts: number) => number; toReal: (cx: number) => number }

function compressTimeline(data: { timestamp: number; flowValue: number | null }[]): TimelineCompression {
  const identity = { points: data.map((p) => ({ ...p, cx: p.timestamp })), toCompressed: (ts: number) => ts, toReal: (ts: number) => ts }
  if (data.length < 3) return identity
  const gaps: number[] = []
  for (let i = 1; i < data.length; i++) gaps.push(data[i]!.timestamp - data[i - 1]!.timestamp)
  const sorted = [...gaps].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  const maxGap = Math.max(median * 5, 5000)
  if (!gaps.some((g) => g > maxGap)) return identity
  const realTs = data.map((p) => p.timestamp)
  const cx: number[] = [realTs[0]!]
  for (let i = 1; i < realTs.length; i++) cx.push(cx[i - 1]! + Math.min(realTs[i]! - realTs[i - 1]!, maxGap))
  const points = data.map((p, i) => ({ ...p, cx: cx[i]! }))
  const toCompressed = (ts: number): number => {
    if (ts <= realTs[0]!) return cx[0]! + (ts - realTs[0]!)
    if (ts >= realTs[realTs.length - 1]!) return cx[cx.length - 1]! + (ts - realTs[realTs.length - 1]!)
    let lo = 0, hi = realTs.length - 1
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (realTs[mid]! <= ts) lo = mid; else hi = mid }
    const realGap = realTs[hi]! - realTs[lo]!
    if (realGap === 0) return cx[lo]!
    return cx[lo]! + ((ts - realTs[lo]!) / realGap) * (cx[hi]! - cx[lo]!)
  }
  const toReal = (cts: number): number => {
    if (cts <= cx[0]!) return realTs[0]! + (cts - cx[0]!)
    if (cts >= cx[cx.length - 1]!) return realTs[realTs.length - 1]! + (cts - cx[cx.length - 1]!)
    let lo = 0, hi = cx.length - 1
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cx[mid]! <= cts) lo = mid; else hi = mid }
    const cGap = cx[hi]! - cx[lo]!
    if (cGap === 0) return realTs[lo]!
    return realTs[lo]! + ((cts - cx[lo]!) / cGap) * (realTs[hi]! - realTs[lo]!)
  }
  return { points, toCompressed, toReal }
}

function getActiveSignalType(timestamp: number, signals: ParsedSignal[]): number | null {
  for (const s of signals) {
    const start = new Date(s.start_time).getTime()
    const end = new Date(s.end_time).getTime()
    if (timestamp >= start && timestamp <= end) return s.signalType
  }
  return null
}

interface EnrichedPoint { timestamp: number; cx: number; flowValue: number | null; [key: string]: number | null }

function buildEnrichedData(points: CompressedPoint[], signals: ParsedSignal[]): EnrichedPoint[] {
  if (points.length === 0) return []
  const types: (number | null)[] = points.map((p) => getActiveSignalType(p.timestamp, signals))
  return points.map((p, i) => {
    const currentType = types[i]!
    const prevType = i > 0 ? types[i - 1]! : undefined
    const nextType = i < types.length - 1 ? types[i + 1]! : undefined
    const value = p.flowValue
    const result: EnrichedPoint = { timestamp: p.timestamp, cx: p.cx, flowValue: value }
    const key = currentType !== null ? `flow_type_${currentType}` : 'flow_default'
    result[key] = value
    if (prevType !== undefined && prevType !== currentType) {
      result[prevType !== null ? `flow_type_${prevType}` : 'flow_default'] = value
    }
    if (nextType !== undefined && nextType !== currentType) {
      result[nextType !== null ? `flow_type_${nextType}` : 'flow_default'] = value
    }
    return result
  })
}

type CustomTooltipProps = TooltipProps<number, string> & {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number | null; color?: string; dataKey?: string; payload?: unknown }>
  colors: { tooltipBg: string; tooltipBorder: string; tooltipText: string }
}

function CustomTooltip({ active, payload, colors }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const flowEntry = payload.find((e) => e.dataKey !== 'movingAvg' && e.value != null)
  if (!flowEntry) return null
  const realTs = (flowEntry.payload as EnrichedPoint | undefined)?.timestamp
  const timeStr = realTs != null ? formatTooltipTime(realTs) : ''
  return (
    <div style={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: colors.tooltipText }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{timeStr}</p>
      <p style={{ color: String(flowEntry.color ?? colors.tooltipText) }}>Flow: {toLph(Number(flowEntry.value)).toFixed(1)} L/h</p>
    </div>
  )
}

export default function Demo() {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]

  const {
    sensors,
    selectedSensorId,
    selectedSensorName,
    chartData,
    timeRange,
    isLive,
    connected,
    sensorsLoading,
    reportsLoading,
    parsedSignals,
    signalTypeIds,
    sensorMappings,
    handleSensorChange,
    handleTimeRangeChange,
    handleToggleLive,
  } = useReportsPage()

  const timeline = useMemo(() => compressTimeline(chartData), [chartData])

  const dataMin = timeline.points.length > 0 ? timeline.points[0]!.cx : 0
  const dataMax = timeline.points.length > 0 ? timeline.points[timeline.points.length - 1]!.cx : 0

  const homeMin = useMemo(() => {
    if (timeRange === 'all' || dataMax === 0) return dataMin
    const realMax = chartData.length > 0 ? chartData[chartData.length - 1]!.timestamp : 0
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

  const {
    domain, visibleRangeMs, isZoomed, resetZoom, panLeft, panRight, zoomIn, zoomOut,
    onChartMouseDown, onChartMouseMove, onChartMouseUp, refAreaLeft, refAreaRight,
    cancelSelection, chartWrapperRef,
  } = useChartZoomPan(dataMin, dataMax, homeMin, homeMax)

  const visibleData = useMemo(() => {
    const pts = timeline.points
    if (pts.length === 0) return pts
    const [left, right] = domain
    let startIdx = pts.findIndex((p) => p.cx >= left)
    if (startIdx < 0) startIdx = pts.length
    let endIdx = pts.findIndex((p) => p.cx > right)
    if (endIdx < 0) endIdx = pts.length
    return pts.slice(Math.max(0, startIdx - 1), Math.min(pts.length, endIdx + 1))
  }, [timeline, domain])

  const realVisibleRange = useMemo(() => {
    if (visibleData.length < 2) return visibleRangeMs
    return visibleData[visibleData.length - 1]!.timestamp - visibleData[0]!.timestamp
  }, [visibleData, visibleRangeMs])

  const zoomTicks = useMemo(() => {
    if (visibleData.length < 2) return []
    const realLeft = visibleData[0]!.timestamp
    const realRight = visibleData[visibleData.length - 1]!.timestamp
    const step = computeTickInterval(realVisibleRange)
    const start = Math.ceil(realLeft / step) * step
    const ticks: number[] = []
    for (let t = start; t <= realRight; t += step) ticks.push(timeline.toCompressed(t))
    return ticks
  }, [visibleData, realVisibleRange, timeline])

  const enrichedData = useMemo(() => buildEnrichedData(timeline.points, parsedSignals), [timeline, parsedSignals])

  const allLineKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const pt of enrichedData) {
      for (const k of Object.keys(pt)) {
        if (k.startsWith('flow_')) keys.add(k)
      }
    }
    return [...keys]
  }, [enrichedData])


  const onSensorChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleSensorChange(e)
  const onTimeRangeChange = (range: TimeRange) => handleTimeRangeChange(range)

  if (sensorsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Flomo" className="h-8 sm:h-9" />
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              Live Demo
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full bg-indigo-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-500 sm:px-5 sm:text-[13px]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Context */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Live Water Flow</h1>
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
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Real data streaming from Flomo sensors installed at our Toronto office and Vancouver warehouse.
          </p>
        </div>

        {/* Graph card */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          {/* Controls */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {selectedSensorName && (
                <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  Sensor: <span className="font-medium text-gray-900 dark:text-white">{selectedSensorName}</span>
                  {isLive && <span className="ml-1 text-xs text-gray-400">({chartData.length} pts)</span>}
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
                    onClick={() => onTimeRangeChange(opt.value as TimeRange)}
                    className={`rounded-md px-2 py-1 transition-colors sm:px-3 sm:py-1.5 ${rangeButtonClass(timeRange === opt.value)}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleToggleLive}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                  isLive ? 'bg-green-600 text-white hover:bg-green-500' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {isLive ? 'Pause' : 'Resume'}
              </button>

              <select
                value={selectedSensorId ?? ''}
                onChange={onSensorChange}
                className="min-w-0 truncate rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:px-3 sm:py-1.5 sm:text-xs"
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

          {/* Chart controls */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900">
              {[
                { fn: panLeft, icon: '◀', title: 'Pan left' },
                { fn: zoomOut, icon: '−', title: 'Zoom out' },
                { fn: zoomIn, icon: '+', title: 'Zoom in' },
                { fn: panRight, icon: '▶', title: 'Pan right' },
              ].map((b) => (
                <button key={b.title} onClick={b.fn} className="rounded-md px-1.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-2 sm:text-sm" title={b.title}>
                  {b.icon}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isZoomed && (
                <button onClick={resetZoom} className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 sm:px-2.5 sm:text-xs">
                  Reset
                </button>
              )}
              <span className="hidden text-xs text-gray-400 sm:inline">Drag to zoom · Scroll to zoom</span>
            </div>
          </div>

          {/* Signal legend */}
          {signalTypeIds.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Signals:</span>
              {signalTypeIds.map((typeId) => (
                <div key={typeId} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: getSignalColorByType(typeId) }} />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{getSignalLabel(typeId, sensorMappings)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {reportsLoading ? (
            <div className="flex h-[280px] items-center justify-center text-gray-500 dark:text-gray-400 sm:h-[400px]">Loading chart…</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-gray-400 sm:h-[400px]">No data for this time range</div>
          ) : (
            <div ref={chartWrapperRef} className="h-[280px] select-none sm:h-[400px]" onMouseLeave={cancelSelection}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enrichedData} onMouseDown={onChartMouseDown} onMouseMove={onChartMouseMove} onMouseUp={onChartMouseUp}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis
                    dataKey="cx"
                    type="number"
                    domain={domain}
                    allowDataOverflow
                    ticks={zoomTicks}
                    tickFormatter={(cx: number) => formatTick(timeline.toReal(cx), realVisibleRange)}
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
                    label={{ value: 'L/h', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: colors.axis } }}
                  />
                  <Tooltip content={<CustomTooltip colors={colors} />} />
                  {refAreaLeft !== null && refAreaRight !== null && refAreaLeft !== refAreaRight && (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill={colors.line} fillOpacity={0.15} />
                  )}
                  {allLineKeys.map((key) => {
                    const typeMatch = key.match(/^flow_type_(\d+)$/)
                    const color = typeMatch ? getSignalColorByType(Number(typeMatch[1])) : colors.line
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3 }}
                        label={(lp: RechartLabelProps) => renderValueLabel(lp, enrichedData.length, color)}
                        isAnimationActive={false}
                        connectNulls={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
