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

import logo from '@/assets/belugaLogo.png'
import BuildingFootprint from '@/components/BuildingFootprint'
import BuildingMap3D from '@/components/BuildingMap3D'
import { useTheme } from '@/contexts/ThemeContext'
import { useBuildingDetail } from '@/hooks/useBuildingDetail'
import { useBuildingFootprint } from '@/hooks/useBuildingFootprint'
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
  return isActive ? 'bg-indigo-500 text-white' : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
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
    magChartData,
    parsedSignals,
    signalTypeIds,
    sensorMappings,
    handleSensorChange,
    handleTimeRangeChange,
    handleToggleLive,
  } = useReportsPage()

  const { building } = useBuildingDetail('1')
  const bLat = building?.latitude ?? null
  const bLon = building?.longitude ?? null
  const { footprints } = useBuildingFootprint(bLat, bLon)
  const displayFootprints = building?.footprint
    ? [{ id: building.id, coordinates: building.footprint }]
    : footprints

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

  const compressedMagData = useMemo(() => {
    if (magChartData.length === 0 || timeline.points.length === 0) return []
    const [left, right] = domain
    return magChartData
      .map((p) => ({ ...p, cx: timeline.toCompressed(p.timestamp) }))
      .filter((p) => p.cx >= left && p.cx <= right)
  }, [magChartData, timeline, domain])

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


  const onSensorChange = (e: React.ChangeEvent<HTMLSelectElement>) => handleSensorChange(Number(e.target.value))
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
            <img src={logo} alt="Beluga" className="h-8 sm:h-9" /><span className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Beluga</span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              Live Demo
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:grid-rows-2 lg:h-full">

          {/* Live Water Flow chart */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:min-h-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700 sm:px-4 sm:py-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Live Water Flow</h2>
              {isLive && connected && (
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
              )}
              {selectedSensorName && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {selectedSensorName}
                </span>
              )}
              {chartData.length >= 2 && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  · <span className="font-semibold text-gray-900 dark:text-white">{totalLiters < 1 ? totalLiters.toFixed(2) : totalLiters.toFixed(1)} L</span>
                </span>
              )}
            </div>

            <div className="space-y-2 px-3 pt-2 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-[10px] font-medium dark:border-gray-700 dark:bg-gray-900 sm:text-[11px]">
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onTimeRangeChange(opt.value as TimeRange)}
                      className={`rounded-md px-2 py-0.5 transition-colors sm:px-2.5 sm:py-1 ${rangeButtonClass(timeRange === opt.value)}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleToggleLive}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors sm:px-2.5 sm:py-1 sm:text-[11px] ${
                    isLive ? 'bg-green-600 text-white hover:bg-green-500' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {isLive ? 'Pause' : 'Resume'}
                </button>

                <select
                  value={selectedSensorId ?? ''}
                  onChange={onSensorChange}
                  className="min-w-0 truncate rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-[10px] text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:px-2.5 sm:py-1 sm:text-[11px]"
                >
                  {sensors.map((sensor) => (
                    <option key={sensor.id} value={sensor.id}>
                      {sensor.name ?? `Sensor #${sensor.id}`}
                      {sensor.building?.name ? ` — ${sensor.building.name}` : ''}
                    </option>
                  ))}
                </select>

                <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900">
                  {[
                    { fn: panLeft, icon: '◀', title: 'Pan left' },
                    { fn: zoomOut, icon: '−', title: 'Zoom out' },
                    { fn: zoomIn, icon: '+', title: 'Zoom in' },
                    { fn: panRight, icon: '▶', title: 'Pan right' },
                  ].map((b) => (
                    <button key={b.title} onClick={b.fn} className="rounded-md px-1 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white sm:px-1.5 sm:text-xs" title={b.title}>
                      {b.icon}
                    </button>
                  ))}
                </div>
                {isZoomed && (
                  <button onClick={resetZoom} className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 sm:text-[11px]">
                    Reset
                  </button>
                )}
              </div>

              {signalTypeIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Signals:</span>
                  {signalTypeIds.map((typeId) => (
                    <div key={typeId} className="flex items-center gap-1">
                      <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: getSignalColorByType(typeId) }} />
                      <span className="text-[10px] text-gray-600 dark:text-gray-300">{getSignalLabel(typeId, sensorMappings)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
              {reportsLoading ? (
                <div className="flex h-full min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400">Loading chart…</div>
              ) : chartData.length === 0 ? (
                <div className="flex h-full min-h-[200px] items-center justify-center text-gray-400">No data for this time range</div>
              ) : (
                <div ref={chartWrapperRef} className="h-full min-h-[200px] select-none" onMouseLeave={cancelSelection}>
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
                        tick={{ fontSize: 10, fill: colors.axis }}
                        tickLine={{ stroke: colors.grid }}
                        axisLine={{ stroke: colors.grid }}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(v: number) => toLph(v).toFixed(0)}
                        tick={{ fontSize: 10, fill: colors.axis }}
                        tickLine={{ stroke: colors.grid }}
                        axisLine={{ stroke: colors.grid }}
                        label={{ value: 'L/h', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: colors.axis } }}
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

          {/* 3D Building View */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:min-h-0">
            <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700 sm:px-4 sm:py-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                3D View
                {building?.name && <span className="ml-2 font-normal text-gray-400">· {building.name}</span>}
              </h2>
            </div>
            <div className="min-h-0 flex-1">
              {bLat != null && bLon != null ? (
                <BuildingMap3D
                  latitude={bLat}
                  longitude={bLon}
                  className="h-full min-h-[240px] rounded-b-xl"
                  savedFootprint={building?.footprint}
                />
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-b-xl">
                  <p className="text-sm text-gray-400">{building ? 'No coordinates available' : 'Loading building…'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Building Footprint */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:min-h-0">
            <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700 sm:px-4 sm:py-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Building Footprint
                {building?.full_address && <span className="ml-2 font-normal text-gray-400">· {building.full_address}</span>}
              </h2>
            </div>
            <div className="min-h-0 flex-1">
              {displayFootprints.length > 0 ? (
                <BuildingFootprint
                  footprints={displayFootprints}
                  sensors={building?.sensors ?? []}
                  numberOfFloors={building?.number_of_floors ?? 1}
                  fixtures={building?.fixtures ?? []}
                  className="h-full min-h-[240px] rounded-b-xl"
                />
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-b-xl">
                  <p className="text-sm text-gray-400">{building ? 'No footprint available' : 'Loading building…'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Magnetometer data */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:min-h-0">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700 sm:px-4 sm:py-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Building Mag Data</h2>
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f43f5e]" /> X
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981]" /> Y
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3b82f6]" /> Z
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f59e0b]" /> Total
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1 px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
              {compressedMagData.length > 0 ? (
                <div className="h-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={compressedMagData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                      <XAxis
                        dataKey="cx"
                        type="number"
                        domain={domain}
                        allowDataOverflow
                        ticks={zoomTicks}
                        tickFormatter={(cx: number) => formatTick(timeline.toReal(cx), realVisibleRange)}
                        tick={{ fontSize: 10, fill: colors.axis }}
                        tickLine={{ stroke: colors.grid }}
                        axisLine={{ stroke: colors.grid }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: colors.axis }}
                        tickLine={{ stroke: colors.grid }}
                        axisLine={{ stroke: colors.grid }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.tooltipBg,
                          border: `1px solid ${colors.tooltipBorder}`,
                          borderRadius: 8,
                          fontSize: 11,
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
                      <Line type="monotone" dataKey="x" name="X Axis" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="y" name="Y Axis" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="z" name="Z Axis" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="total" name="Total Magnitude" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center text-gray-400">
                  No magnetometer data
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
