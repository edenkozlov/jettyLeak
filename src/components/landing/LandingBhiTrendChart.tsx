import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { LANDING_BHI_WEEKLY } from './bhiTrendData'

type LandingBhiTrendChartProps = {
  /** Stretch chart area to fill column height (pair with a parent flex column). */
  fillHeight?: boolean
  className?: string
  /** When set, shows under the title so the card matches a real building context */
  buildingName?: string
  buildingLocation?: string
}

export function LandingBhiTrendChart({
  fillHeight,
  className,
  buildingName,
  buildingLocation,
}: LandingBhiTrendChartProps) {
  const fillId = `landing-bhi-area-${useId().replace(/:/g, '')}`

  return (
    <div
      className={`flex w-full min-h-0 flex-col rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-md shadow-indigo-500/[0.05] ring-1 ring-black/[0.02] sm:p-4 ${fillHeight ? 'flex-1' : ''} ${className ?? ''}`}
      aria-label="Example: 7-day Building Health Index trend"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">7-day trend</p>
          {buildingName ? (
            <p className="truncate text-[11px] text-gray-600" title={`${buildingName} · ${buildingLocation ?? ''}`}>
              <span className="font-medium text-gray-800">{buildingName}</span>
              {buildingLocation ? (
                <>
                  <span className="text-gray-300"> · </span>
                  {buildingLocation}
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-[11px] text-gray-500">vs your baseline</p>
          )}
        </div>
        <p className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-emerald-800">
          <svg
            className="h-3 w-3 text-emerald-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
          +3
        </p>
      </div>

      <p className="mt-2 text-[11px] tabular-nums text-gray-600">
        <span className="font-semibold text-gray-900">78</span>
        <span className="mx-1 text-gray-300">·</span>
        was 75
        <span className="mx-1 text-gray-300">·</span>
        range 72–78
      </p>

      <div
        className={`mt-1.5 w-full min-w-0 ${fillHeight ? 'min-h-[120px] flex-1' : 'h-[128px] sm:h-[140px]'}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={[...LANDING_BHI_WEEKLY]}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dy={4}
              interval={0}
            />
            <YAxis
              domain={[68, 82]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickCount={4}
            />
            <Tooltip
              cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
              contentStyle={{
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                fontSize: 11,
                padding: '6px 8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
              formatter={(value: number | undefined) => [value != null ? `${value}` : '—', 'BHI']}
            />
            <Area
              type="monotone"
              dataKey="bhi"
              stroke="#059669"
              strokeWidth={1.75}
              fill={`url(#${fillId})`}
              dot={{ r: 2.25, fill: '#059669', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#047857', stroke: '#fff', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
