import { useCallback, useMemo, useRef, useState } from 'react'
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

import { useTheme } from '@/contexts/ThemeContext'
import CalibrationLabelModal from '@/components/CalibrationLabelModal'
import { GET_MAG_DOWNSAMPLED } from '@/queries/getFlowAnalytics'
import type {
  RawSubWindow,
  SharedYDomains,
  SubWindowMagPoint,
} from '@/hooks/useRawSubWindows'
import type { MagReport } from '@/types'

export interface RawSignalOverlay {
  id: number
  startMs: number
  endMs: number
  color: string
  label: string
}

const CHART_COLORS = {
  light: {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
    tileBorder: '#e5e7eb',
    selectFill: '#6366f1',
  },
  dark: {
    grid: '#374151',
    axis: '#9ca3af',
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#f3f4f6',
    tileBorder: '#374151',
    selectFill: '#818cf8',
  },
} as const

const LINE_COLORS = {
  total: '#f59e0b',
  x: '#f43f5e',
  y: '#10b981',
  z: '#3b82f6',
}

interface ZoomLevel {
  sinceMs: number
  untilMs: number
  points: SubWindowMagPoint[]
}

interface RawDataPanelProps {
  window: RawSubWindow
  sharedYDomains: SharedYDomains
  signalOverlays?: RawSignalOverlay[]
  label: string
  magSensorIds: number[]
  buildingId: number | null
  isExpanded?: boolean
  onExpand?: () => void
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatRange(sinceMs: number, untilMs: number): string {
  return `${formatClock(sinceMs)} – ${formatClock(untilMs)}`
}

function buildXTicks(sinceMs: number, untilMs: number, count = 5): number[] {
  if (untilMs <= sinceMs) return [sinceMs]
  const step = (untilMs - sinceMs) / (count - 1)
  const ticks: number[] = []
  for (let i = 0; i < count; i++) ticks.push(sinceMs + step * i)
  return ticks
}

function magReportToPoint(r: MagReport): SubWindowMagPoint {
  return {
    timestamp: new Date(r.created_at).getTime(),
    x: r.x_axis_reading,
    y: r.y_axis_reading,
    z: r.z_axis_reading,
    total: r.total_magnitude,
    bandEnergy10s: r.band_energy_10s,
    bandEnergy60s: r.band_energy_60s,
    bandEnergy5m: r.band_energy_5m,
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]!
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]!
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo)
}

function paddedDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1]
  if (values.length < 20) {
    let mn = values[0]!
    let mx = values[0]!
    for (const v of values) {
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    const pad = Math.max((mx - mn) * 0.15, 0.05)
    return [mn - pad, mx + pad]
  }
  const sorted = [...values].sort((a, b) => a - b)
  const lo = quantile(sorted, 0.01)
  const hi = quantile(sorted, 0.99)
  const pad = Math.max((hi - lo) * 0.15, 0.05)
  return [lo - pad, hi + pad]
}

export default function RawDataPanel({
  window,
  sharedYDomains,
  signalOverlays,
  label,
  magSensorIds,
  buildingId,
  isExpanded = false,
  onExpand,
}: RawDataPanelProps) {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]

  const [zoomStack, setZoomStack] = useState<ZoomLevel[]>([])
  const [zoomLoading, setZoomLoading] = useState(false)
  const [refLeft, setRefLeft] = useState<number | null>(null)
  const [refRight, setRefRight] = useState<number | null>(null)
  const dragHappenedRef = useRef(false)
  const clickTsRef = useRef<number | null>(null)
  const [calibrationSignal, setCalibrationSignal] = useState<RawSignalOverlay | null>(null)

  const current: { sinceMs: number; untilMs: number; points: SubWindowMagPoint[] } =
    zoomStack.length > 0
      ? zoomStack[zoomStack.length - 1]!
      : { sinceMs: window.sinceMs, untilMs: window.untilMs, points: window.points }

  const isZoomed = zoomStack.length > 0
  const data = current.points

  const xTicks = useMemo(
    () => buildXTicks(current.sinceMs, current.untilMs, isExpanded ? 7 : 5),
    [current.sinceMs, current.untilMs, isExpanded],
  )

  // When zoomed, recompute Y domains from the focused data so detail is visible.
  // When not zoomed, use the cross-tile shared domains for comparison.
  const yDomains: SharedYDomains = useMemo(() => {
    if (!isZoomed) return sharedYDomains
    const totals: number[] = []
    const xs: number[] = []
    const ys: number[] = []
    const zs: number[] = []
    const bands: number[] = []
    for (const p of data) {
      if (p.total != null) totals.push(p.total)
      if (p.x != null) xs.push(p.x)
      if (p.y != null) ys.push(p.y)
      if (p.z != null) zs.push(p.z)
      if (p.bandEnergy10s != null) bands.push(p.bandEnergy10s)
      if (p.bandEnergy60s != null) bands.push(p.bandEnergy60s)
      if (p.bandEnergy5m != null) bands.push(p.bandEnergy5m)
    }
    return {
      total: paddedDomain(totals),
      x: paddedDomain(xs),
      y: paddedDomain(ys),
      z: paddedDomain(zs),
      bandEnergy: paddedDomain(bands),
    }
  }, [isZoomed, data, sharedYDomains])

  const visibleOverlays = useMemo(() => {
    if (!signalOverlays || signalOverlays.length === 0) return []
    return signalOverlays
      .filter((s) => s.endMs >= current.sinceMs && s.startMs <= current.untilMs)
      .map((s) => ({
        ...s,
        clippedStart: Math.max(s.startMs, current.sinceMs),
        clippedEnd: Math.min(s.endMs, current.untilMs),
      }))
  }, [signalOverlays, current.sinceMs, current.untilMs])

  const tooltipLabelFormatter = (ts: unknown) =>
    new Date(Number(ts)).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  const fetchZoomedData = useCallback(
    async (sinceMs: number, untilMs: number): Promise<SubWindowMagPoint[]> => {
      if (magSensorIds.length === 0) return []
      const expectedIds = new Set(magSensorIds)
      const res = await GET_MAG_DOWNSAMPLED({
        sensorIds: magSensorIds,
        since: new Date(sinceMs).toISOString(),
        until: new Date(untilMs).toISOString(),
        maxPoints: 1500,
      })
      const rows = res.mag_report as unknown as MagReport[]
      return rows
        .filter((r) => r.sensor_id != null && expectedIds.has(Number(r.sensor_id)))
        .map(magReportToPoint)
        .sort((a, b) => a.timestamp - b.timestamp)
    },
    [magSensorIds],
  )

  const handleMouseDown = useCallback((e: { activeLabel?: number | string } | null) => {
    if (!e || e.activeLabel == null) return
    const ts = Number(e.activeLabel)
    setRefLeft(ts)
    setRefRight(null)
    dragHappenedRef.current = false
    clickTsRef.current = ts
  }, [])

  const handleMouseMove = useCallback(
    (e: { activeLabel?: number | string } | null) => {
      if (refLeft === null || !e || e.activeLabel == null) return
      const next = Number(e.activeLabel)
      setRefRight(next)
      dragHappenedRef.current = true
    },
    [refLeft],
  )

  const handleMouseUp = useCallback(async () => {
    const clickTs = clickTsRef.current
    clickTsRef.current = null

    if (refLeft === null || refRight === null || refLeft === refRight) {
      setRefLeft(null)
      setRefRight(null)
      // No drag — check if we clicked inside a signal overlay
      if (!dragHappenedRef.current && clickTs != null && visibleOverlays.length > 0 && buildingId != null) {
        const hit = visibleOverlays.find(
          (o) => clickTs >= o.clippedStart && clickTs <= o.clippedEnd,
        )
        if (hit) {
          const original = signalOverlays?.find((s) => s.id === hit.id)
          if (original) setCalibrationSignal(original)
        }
      }
      return
    }
    const left = Math.min(refLeft, refRight)
    const right = Math.max(refLeft, refRight)
    setRefLeft(null)
    setRefRight(null)
    if (right - left < 1000) return
    setZoomLoading(true)
    try {
      const points = await fetchZoomedData(left, right)
      // Clamp domain to actual data extent so the chart doesn't show
      // empty space past the last data point.
      const actualLeft = points.length > 0 ? Math.min(left, points[0]!.timestamp) : left
      const actualRight = points.length > 0 ? Math.min(right, points[points.length - 1]!.timestamp) : right
      setZoomStack((stack) => [...stack, { sinceMs: actualLeft, untilMs: actualRight, points }])
    } catch (err) {
      console.warn('[RawDataPanel] zoom fetch failed', err)
    } finally {
      setZoomLoading(false)
    }
  }, [refLeft, refRight, fetchZoomedData, visibleOverlays, signalOverlays, buildingId])

  const handleMouseLeave = useCallback(() => {
    if (refLeft !== null) {
      setRefLeft(null)
      setRefRight(null)
    }
  }, [refLeft])

  const popZoom = useCallback(() => {
    setZoomStack((stack) => stack.slice(0, -1))
  }, [])

  const resetZoom = useCallback(() => {
    setZoomStack([])
  }, [])

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!onExpand) return
      onExpand()
    },
    [onExpand],
  )

  const renderChart = (
    height: string,
    series: Array<{ key: 'total' | 'x' | 'y' | 'z'; name: string; color: string; domain: [number, number] }>,
    showTooltip: boolean,
  ) => (
    <>
      {series.map((s) => (
        <div key={s.key} className={height}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={[current.sinceMs, current.untilMs]}
                ticks={xTicks}
                tickFormatter={(v: number) => formatClock(v)}
                tick={{ fontSize: 10, fill: colors.axis }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                allowDataOverflow
              />
              <YAxis
                width={44}
                domain={s.domain}
                allowDataOverflow
                tick={{ fontSize: 10, fill: colors.axis }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              {showTooltip && (
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
                  labelFormatter={(ts) => {
                    const tsNum = Number(ts)
                    const timeStr = tooltipLabelFormatter(ts)
                    const match = visibleOverlays.find(
                      (o) => tsNum >= o.clippedStart && tsNum <= o.clippedEnd,
                    )
                    return match ? `${timeStr}\n${match.label}` : timeStr
                  }}
                />
              )}
              {visibleOverlays.map((o) => (
                <ReferenceArea
                  key={`sig-${o.id}`}
                  x1={o.clippedStart}
                  x2={o.clippedEnd}
                  fill={o.color}
                  fillOpacity={0.18}
                  stroke={o.color}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
              ))}
              {refLeft !== null && refRight !== null && refLeft !== refRight && (
                <ReferenceArea
                  x1={refLeft}
                  x2={refRight}
                  strokeOpacity={0.4}
                  stroke={colors.selectFill}
                  fill={colors.selectFill}
                  fillOpacity={0.18}
                />
              )}
              <Line
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={isExpanded ? 1.5 : 1.25}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </>
  )

  const zoomControls = (
    <div className="flex items-center gap-1">
      {zoomLoading && (
        <span className="mr-1 text-[10px] text-gray-400 dark:text-gray-500">
          Loading…
        </span>
      )}
      {isZoomed && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              popZoom()
            }}
            className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Back one zoom level"
          >
            ←
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              resetZoom()
            }}
            className="rounded-md border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            title="Reset zoom"
          >
            Reset
          </button>
        </>
      )}
    </div>
  )

  if (isExpanded) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatRange(current.sinceMs, current.untilMs)}
              {isZoomed && (
                <span className="ml-2 text-[11px] text-indigo-500 dark:text-indigo-400">
                  zoomed
                </span>
              )}
            </p>
          </div>
          {zoomControls}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Total Magnitude</h4>
            {renderChart('h-[220px] w-full sm:h-[280px]', [
              { key: 'total', name: 'Total', color: LINE_COLORS.total, domain: yDomains.total },
            ], true)}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">X Axis</h4>
            {renderChart('h-[180px] w-full sm:h-[220px]', [
              { key: 'x', name: 'X', color: LINE_COLORS.x, domain: yDomains.x },
            ], true)}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Y Axis</h4>
            {renderChart('h-[180px] w-full sm:h-[220px]', [
              { key: 'y', name: 'Y', color: LINE_COLORS.y, domain: yDomains.y },
            ], true)}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Z Axis</h4>
            {renderChart('h-[180px] w-full sm:h-[220px]', [
              { key: 'z', name: 'Z', color: LINE_COLORS.z, domain: yDomains.z },
            ], true)}
          </div>
        </div>

        {calibrationSignal && buildingId != null && (
          <CalibrationLabelModal
            signal={calibrationSignal}
            buildingId={buildingId}
            onClose={() => setCalibrationSignal(null)}
            onSaved={() => setCalibrationSignal(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full flex-col rounded-xl border bg-white p-3 dark:bg-gray-900/40"
      style={{ borderColor: colors.tileBorder }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
          {isZoomed && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              zoomed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
            {formatRange(current.sinceMs, current.untilMs)}
          </p>
          {zoomControls}
          {onExpand && (
            <button
              type="button"
              onClick={handleExpandClick}
              className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
              title="Expand"
            >
              ⤢
            </button>
          )}
        </div>
      </div>
      <div className="flex-1">
        {data.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center text-xs text-gray-400 dark:text-gray-600">
            {zoomLoading ? 'Loading…' : 'No samples'}
          </div>
        ) : (
          renderChart('h-[280px] w-full sm:h-[340px]', [
            { key: 'x', name: 'X', color: LINE_COLORS.x, domain: yDomains.x },
          ], true)
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
        Drag to zoom · Click a signal to label
      </p>

      {calibrationSignal && buildingId != null && (
        <CalibrationLabelModal
          signal={calibrationSignal}
          buildingId={buildingId}
          onClose={() => setCalibrationSignal(null)}
          onSaved={() => setCalibrationSignal(null)}
        />
      )}
    </div>
  )
}
