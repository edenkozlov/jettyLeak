import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import LiveFlowIndicator from '@/components/LiveFlowIndicator'
import {
  useBuildingAnalytics,
  type AnalyticsData,
} from '@/hooks/useBuildingAnalytics'

interface Props {
  buildingId: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLitres(litres: number): string {
  if (litres >= 1000) return `${(litres / 1000).toFixed(1)}k`
  if (litres === 0) return '0'
  return litres.toFixed(1)
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a'
  if (hour < 12) return `${hour}a`
  if (hour === 12) return '12p'
  return `${hour - 12}p`
}

// ---------------------------------------------------------------------------
// Shared card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  unit = 'L',
}: {
  label: string
  value: number
  unit?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
        {formatLitres(value)}{' '}
        <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Usage Trend
// ---------------------------------------------------------------------------

function TrendRow({
  label,
  changePercent,
  current,
  previous,
}: {
  label: string
  changePercent: number | null
  current: number
  previous: number
}) {
  const direction: 'up' | 'down' | 'neutral' =
    changePercent === null || changePercent === 0
      ? 'neutral'
      : changePercent > 0
        ? 'up'
        : 'down'

  const badgeColor =
    direction === 'up'
      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
      : direction === 'down'
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'

  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '—'

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
          {formatLitres(current)}L vs {formatLitres(previous)}L
        </span>
        {changePercent !== null ? (
          <span
            className={`inline-flex min-w-[52px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${badgeColor}`}
          >
            {arrow} {Math.abs(changePercent)}%
          </span>
        ) : (
          <span className="inline-flex min-w-[52px] items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-700">
            —
          </span>
        )}
      </div>
    </div>
  )
}

function UsageTrend({ data }: { data: AnalyticsData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Usage Trend
      </h3>
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
        <TrendRow
          label="Day"
          changePercent={data.dayChangePercent}
          current={data.today}
          previous={data.yesterday}
        />
        <TrendRow
          label="Week"
          changePercent={data.weekChangePercent}
          current={data.thisWeek}
          previous={data.lastWeek}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active Flow Today
// ---------------------------------------------------------------------------

function ActiveFlowToday({ data }: { data: AnalyticsData }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Active Flow Today
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Active
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatDuration(data.activeFlowMs)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Idle
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
            {formatDuration(data.idleMs)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Sessions
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
            {data.sessionCount}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {data.activePercent.toFixed(1)}% active
          </span>
          <span className="text-gray-400">of elapsed today</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(100, data.activePercent)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Projected Usage
// ---------------------------------------------------------------------------

function ProjectedCard({
  label,
  value,
  soFar,
}: {
  label: string
  value: number
  soFar: number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
        {formatLitres(value)}{' '}
        <span className="text-sm font-normal text-gray-400">L</span>
      </p>
      <p className="mt-0.5 text-xs tabular-nums text-gray-400">
        so far: {formatLitres(soFar)} L
      </p>
    </div>
  )
}

function ProjectedUsageCards({ data }: { data: AnalyticsData }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Projected Usage
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <ProjectedCard
          label="Today (est.)"
          value={data.todayProjected}
          soFar={data.today}
        />
        <ProjectedCard
          label="Week (est.)"
          value={data.weekProjected}
          soFar={data.thisWeek}
        />
        <ProjectedCard
          label="Month (est.)"
          value={data.monthProjected}
          soFar={data.thisMonth}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Peak Usage Hours
// ---------------------------------------------------------------------------

function PeakUsageHours({ peakHours }: { peakHours: number[] }) {
  const chartData = peakHours.map((litres, hour) => ({
    hour,
    litres: Math.round(litres * 10) / 10,
  }))

  const maxLitres = Math.max(...chartData.map((d) => d.litres))
  const sorted = [...chartData].sort((a, b) => b.litres - a.litres)
  const top3 = new Set(
    sorted
      .slice(0, 3)
      .filter((d) => d.litres > 0)
      .map((d) => d.hour),
  )
  const hasData = maxLitres > 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Peak Usage Hours
        </h3>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-100 dark:text-gray-700/50"
            />
            <XAxis
              dataKey="hour"
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tickFormatter={formatHour}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={40}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v === 0 ? '' : formatLitres(v))}
              domain={[0, hasData ? 'auto' : 1]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(14, 165, 233, 0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload as { hour: number; litres: number } | undefined
                if (!d) return null
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      {formatHour(d.hour)} – {formatHour((d.hour + 1) % 24)}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-indigo-500">
                      {d.litres.toFixed(1)} L
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="litres" radius={[3, 3, 0, 0]} maxBarSize={18}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={top3.has(entry.hour) ? '#0ea5e9' : '#d1d5db'}
                  className={top3.has(entry.hour) ? '' : 'dark:fill-gray-600'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {top3.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sorted
            .slice(0, 3)
            .filter((d) => d.litres > 0)
            .map((d) => (
              <span
                key={d.hour}
                className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400"
              >
                {formatHour(d.hour)}–{formatHour((d.hour + 1) % 24)}: {formatLitres(d.litres)}L
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/[0.06]'

function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-gray-200/70 dark:bg-gray-700/50 ${shimmer} ${className}`}
    />
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <Bone className="mb-3 h-3 w-16" />
      <Bone className="h-7 w-24" />
    </div>
  )
}

function TrendSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <Bone className="mb-4 h-4 w-28" />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Bone className="h-3.5 w-14" />
            <Bone className="h-3.5 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ActiveFlowSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <Bone className="mb-4 h-4 w-32" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Bone className="mb-2 h-3 w-12" />
            <Bone className="h-5 w-16" />
          </div>
        ))}
      </div>
      <Bone className="mt-4 h-2 w-full rounded-full" />
      <Bone className="mt-2 h-3 w-20" />
    </div>
  )
}

function ProjectedSkeleton() {
  return (
    <div>
      <Bone className="mb-3 h-4 w-32" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <Bone className="mb-3 h-3 w-20" />
            <Bone className="mb-2 h-7 w-20" />
            <Bone className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PeakHoursSkeleton() {
  const heights = [25, 35, 30, 20, 15, 40, 55, 70, 60, 45, 35, 50, 65, 55, 40, 50, 60, 70, 45, 35, 30, 25, 20, 15]
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-baseline justify-between">
        <Bone className="h-4 w-32" />
        <Bone className="h-3 w-16" />
      </div>
      <div className="flex h-44 items-end gap-[3px] pl-7">
        {heights.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendSkeleton />
        <ActiveFlowSkeleton />
      </div>
      <ProjectedSkeleton />
      <PeakHoursSkeleton />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BuildingAnalytics({ buildingId }: Props) {
  const { data, loading, error } = useBuildingAnalytics(buildingId)

  return (
    <div className="space-y-4">
      {/* Top row: Live Flow + Water Usage stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <LiveFlowIndicator buildingId={buildingId} />
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : data ? (
          <>
            <StatCard label="Today" value={data.today} />
            <StatCard label="This Week" value={data.thisWeek} />
            <StatCard label="This Month" value={data.thisMonth} />
          </>
        ) : null}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <LoadingSkeleton />}

      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <UsageTrend data={data} />
            <ActiveFlowToday data={data} />
          </div>
          <ProjectedUsageCards data={data} />
          <PeakUsageHours peakHours={data.peakHours} />
        </>
      )}
    </div>
  )
}
