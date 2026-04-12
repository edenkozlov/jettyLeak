import { useMemo } from 'react'
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
import type { RawSubWindow, SharedYDomains } from '@/hooks/useRawSubWindows'

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
    tileBg: '#ffffff',
  },
  dark: {
    grid: '#374151',
    axis: '#9ca3af',
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#f3f4f6',
    tileBorder: '#374151',
    tileBg: '#0f172a',
  },
} as const

const LINE_COLORS = {
  total: '#f59e0b',
  x: '#f43f5e',
  y: '#10b981',
  z: '#3b82f6',
}

interface RawDataPanelProps {
  window: RawSubWindow
  sharedYDomains: SharedYDomains
  signalOverlays?: RawSignalOverlay[]
  label: string
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

export default function RawDataPanel({
  window,
  sharedYDomains,
  signalOverlays,
  label,
  isExpanded = false,
  onExpand,
}: RawDataPanelProps) {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]

  const data = window.points
  const xTicks = useMemo(
    () => buildXTicks(window.sinceMs, window.untilMs, isExpanded ? 7 : 5),
    [window.sinceMs, window.untilMs, isExpanded],
  )

  const visibleOverlays = useMemo(() => {
    if (!signalOverlays || signalOverlays.length === 0) return []
    return signalOverlays
      .filter((s) => s.endMs >= window.sinceMs && s.startMs <= window.untilMs)
      .map((s) => ({
        ...s,
        clippedStart: Math.max(s.startMs, window.sinceMs),
        clippedEnd: Math.min(s.endMs, window.untilMs),
      }))
  }, [signalOverlays, window.sinceMs, window.untilMs])

  const tooltipLabelFormatter = (ts: unknown) =>
    new Date(Number(ts)).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  const renderChart = (
    height: string,
    series: Array<{ key: 'total' | 'x' | 'y' | 'z'; name: string; color: string; domain: [number, number] }>,
    showTooltip: boolean,
  ) => (
    <>
      {series.map((s) => (
        <div key={s.key} className={height}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={[window.sinceMs, window.untilMs]}
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

  if (isExpanded) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatRange(window.sinceMs, window.untilMs)}
            </p>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Total Magnitude</h4>
            {renderChart('h-[220px] w-full sm:h-[280px]', [
              { key: 'total', name: 'Total', color: LINE_COLORS.total, domain: sharedYDomains.total },
            ], true)}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">X Axis</h4>
            {renderChart('h-[180px] w-full sm:h-[220px]', [
              { key: 'x', name: 'X', color: LINE_COLORS.x, domain: sharedYDomains.x },
            ], true)}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Y Axis</h4>
            {renderChart('h-[180px] w-full sm:h-[220px]', [
              { key: 'y', name: 'Y', color: LINE_COLORS.y, domain: sharedYDomains.y },
            ], true)}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">Z Axis</h4>
            {renderChart('h-[180px] w-full sm:h-[220px]', [
              { key: 'z', name: 'Z', color: LINE_COLORS.z, domain: sharedYDomains.z },
            ], true)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onExpand}
      className="group flex h-full w-full flex-col rounded-xl border bg-white p-3 text-left transition-colors hover:border-indigo-400 dark:bg-gray-900/40 dark:hover:border-indigo-500"
      style={{ borderColor: colors.tileBorder }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
          {formatRange(window.sinceMs, window.untilMs)}
        </p>
      </div>
      <div className="flex-1">
        {data.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center text-xs text-gray-400 dark:text-gray-600">
            No samples
          </div>
        ) : (
          renderChart('h-[280px] w-full sm:h-[340px]', [
            { key: 'x', name: 'X', color: LINE_COLORS.x, domain: sharedYDomains.x },
          ], true)
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
        Click to expand
      </p>
    </button>
  )
}
