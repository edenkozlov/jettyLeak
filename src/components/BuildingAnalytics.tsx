import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
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
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatLitres(value)}{' '}
        <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Usage Trend
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'neutral' }) {
  if (direction === 'up') {
    return (
      <svg
        className="h-4 w-4 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    )
  }
  if (direction === 'down') {
    return (
      <svg
        className="h-4 w-4 text-emerald-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    )
  }
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14"
      />
    </svg>
  )
}

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

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <TrendIcon direction={direction} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {changePercent !== null ? (
          <span
            className={`text-sm font-semibold ${
              direction === 'up'
                ? 'text-red-500'
                : direction === 'down'
                  ? 'text-emerald-500'
                  : 'text-gray-400'
            }`}
          >
            {changePercent > 0 ? '+' : ''}
            {changePercent}%
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatLitres(current)}L vs {formatLitres(previous)}L
        </span>
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
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
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
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatDuration(data.activeFlowMs)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Idle</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatDuration(data.idleMs)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {data.sessionCount}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-2 rounded-full bg-indigo-500 transition-all"
            style={{ width: `${Math.min(100, data.activePercent)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {data.activePercent.toFixed(1)}% of 24h
        </p>
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
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatLitres(value)}{' '}
        <span className="text-sm font-normal text-gray-400">L</span>
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
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

  const sorted = [...chartData].sort((a, b) => b.litres - a.litres)
  const top3 = new Set(
    sorted
      .slice(0, 3)
      .filter((d) => d.litres > 0)
      .map((d) => d.hour),
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Peak Usage Hours
      </h3>
      <p className="mb-3 text-xs text-gray-400">Last 7 days</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="15%">
            <XAxis
              dataKey="hour"
              ticks={[0, 4, 8, 12, 16, 20]}
              tickFormatter={formatHour}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [`${value} L`, 'Usage']}
              labelFormatter={(label) => formatHour(Number(label))}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 12,
              }}
            />
            <Bar dataKey="litres" radius={[3, 3, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={top3.has(entry.hour) ? '#3b82f6' : '#d1d5db'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {top3.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {sorted
            .slice(0, 3)
            .filter((d) => d.litres > 0)
            .map((d) => (
              <span
                key={d.hour}
                className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {formatHour(d.hour)}: {formatLitres(d.litres)}L
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
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
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
              />
            ))}
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
