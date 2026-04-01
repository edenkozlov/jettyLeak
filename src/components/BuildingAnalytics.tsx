import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import CollapsibleSection from '@/components/CollapsibleSection'
import LiveFlowIndicator from '@/components/LiveFlowIndicator'
import {
  useBuildingAnalytics,
  type AnalyticsData,
  type BucketedFlowPoint,
  type BuildingHealth,
  type MagChartPoint,
} from '@/hooks/useBuildingAnalytics'

interface Props {
  buildingId: number
  cachedBhi?: number | null
  cachedBhiLabel?: string | null
  onMagData?: (data: MagChartPoint[]) => void
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

// ---------------------------------------------------------------------------
// Collapsed-state preview text
// ---------------------------------------------------------------------------

function trendsPreview(data: AnalyticsData): string | undefined {
  const parts: string[] = []
  if (data.dayChangePercent !== null) {
    const arrow = data.dayChangePercent > 0 ? '↑' : data.dayChangePercent < 0 ? '↓' : '—'
    parts.push(`${arrow} ${Math.abs(data.dayChangePercent)}% day`)
  }
  if (data.activeFlowMs > 0) {
    parts.push(`${formatDuration(data.activeFlowMs)} active`)
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function projectedPreview(data: AnalyticsData): string | undefined {
  if (data.todayProjected > 0) return `~${formatLitres(data.todayProjected)} L today est.`
  return undefined
}

function peakHoursPreview(data: AnalyticsData): string | undefined {
  const max = Math.max(...data.peakHours)
  if (max === 0) return undefined
  const hour = data.peakHours.indexOf(max)
  return `Busiest ${formatHour(hour)}–${formatHour((hour + 1) % 24)}`
}

// ---------------------------------------------------------------------------
// Building health (BHI)
// ---------------------------------------------------------------------------

const HEALTH_LABEL_COPY: Record<BuildingHealth['label'], string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  investigate: 'Investigate',
  critical: 'Critical',
}

const HEALTH_LABEL_CLASS: Record<BuildingHealth['label'], string> = {
  healthy:
    'text-emerald-700 dark:text-emerald-300',
  watch:
    'text-amber-700 dark:text-amber-300',
  investigate:
    'text-orange-700 dark:text-orange-300',
  critical:
    'text-red-700 dark:text-red-300',
}

function HealthHoverPanel({ title, formula }: { title: string; formula: string }) {
  return (
    <div
      className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-300">{formula}</p>
    </div>
  )
}

function HealthGauge({
  score,
  label,
  compact = false,
}: {
  score: number
  label: BuildingHealth['label']
  compact?: boolean
}) {
  const cx = 150
  const cy = 138
  const r = 108
  const sw = 20

  const toAng = (s: number) => Math.PI * (1 - s / 100)
  const xy = (a: number, rad = r) => ({
    x: cx + rad * Math.cos(a),
    y: cy - rad * Math.sin(a),
  })
  const arcD = (s1: number, s2: number) => {
    const a1 = toAng(s1)
    const a2 = toAng(s2)
    const p1 = xy(a1)
    const p2 = xy(a2)
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${Math.abs(a1 - a2) > Math.PI ? 1 : 0} 1 ${p2.x} ${p2.y}`
  }

  const zones = [
    { from: 0, to: 49.6, color: '#dc2626' },
    { from: 50.4, to: 69.6, color: '#ea580c' },
    { from: 70.4, to: 84.6, color: '#d97706' },
    { from: 85.4, to: 100, color: '#16a34a' },
  ]

  const gaugeColor: Record<BuildingHealth['label'], string> = {
    healthy: '#16a34a',
    watch: '#d97706',
    investigate: '#ea580c',
    critical: '#dc2626',
  }

  const s = Math.min(100, Math.max(0, score))
  const na = toAng(s)
  const tipR = r - sw / 2 - 2
  const tailR = 14
  const hw = 4
  const tip = xy(na, tipR)
  const tail = {
    x: cx + tailR * Math.cos(na + Math.PI),
    y: cy - tailR * Math.sin(na + Math.PI),
  }
  const b1 = {
    x: cx + hw * Math.cos(na + Math.PI / 2),
    y: cy - hw * Math.sin(na + Math.PI / 2),
  }
  const b2 = {
    x: cx + hw * Math.cos(na - Math.PI / 2),
    y: cy - hw * Math.sin(na - Math.PI / 2),
  }

  return (
    <svg
      viewBox={compact ? '20 10 260 140' : '0 0 300 195'}
      className={compact ? 'w-full' : 'mx-auto w-full max-w-[280px]'}
      role="img"
      aria-label={`Health score ${score}, ${HEALTH_LABEL_COPY[label]}`}
    >
      <defs>
        <filter id="bhi-needle-shadow">
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="2"
            floodColor="#000"
            floodOpacity="0.2"
          />
        </filter>
      </defs>

      {/* Background track */}
      <path
        d={arcD(0, 100)}
        fill="none"
        stroke="currentColor"
        className="text-gray-100 dark:text-gray-700/40"
        strokeWidth={sw + 6}
        strokeLinecap="round"
      />

      {/* Colored zone arcs */}
      {zones.map((z) => (
        <path
          key={z.from}
          d={arcD(z.from, z.to)}
          fill="none"
          stroke={z.color}
          strokeWidth={sw}
          strokeLinecap="butt"
        />
      ))}
      <path
        d={arcD(0, 0.4)}
        fill="none"
        stroke={zones[0]!.color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <path
        d={arcD(99.6, 100)}
        fill="none"
        stroke={zones[zones.length - 1]!.color}
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* Needle */}
      <g filter="url(#bhi-needle-shadow)">
        <path
          d={`M ${tip.x} ${tip.y} L ${b1.x} ${b1.y} L ${tail.x} ${tail.y} L ${b2.x} ${b2.y} Z`}
          fill="currentColor"
          className="text-gray-800 dark:text-gray-100"
        />
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="currentColor"
        className="text-gray-200 dark:text-gray-600"
      />
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="currentColor"
        className="text-gray-700 dark:text-gray-200"
      />
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill="currentColor"
        className="text-white dark:text-white"
      />

      {!compact && (
        <>
          <text
            x={cx}
            y={cy + 36}
            textAnchor="middle"
            className="fill-gray-900 dark:fill-white"
            style={{
              fontSize: 38,
              fontWeight: 800,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {score}
          </text>
          <text
            x={cx}
            y={cy + 53}
            textAnchor="middle"
            fill={gaugeColor[label]}
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.18em',
            }}
          >
            {HEALTH_LABEL_COPY[label].toUpperCase()}
          </text>
        </>
      )}
    </svg>
  )
}

function BuildingHealthSection({
  health,
  loading,
  cachedBhi,
  cachedBhiLabel,
}: {
  health: BuildingHealth | null
  loading: boolean
  cachedBhi?: number | null
  cachedBhiLabel?: string | null
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading && cachedBhi != null) {
    const lbl = (cachedBhiLabel ?? 'watch') as BuildingHealth['label']
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-[100px] shrink-0">
            <HealthGauge score={cachedBhi} label={lbl} compact />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Building Health Index
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                {cachedBhi}
              </span>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500">/ 100</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${HEALTH_LABEL_CLASS[lbl]}`}
              >
                {HEALTH_LABEL_COPY[lbl]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              Refreshing…
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <Bone className="h-[52px] w-[100px] shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3 w-32" />
            <Bone className="h-6 w-20" />
            <Bone className="h-2.5 w-48" />
          </div>
        </div>
      </div>
    )
  }

  if (!health) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
        Building health unavailable. Link magnetometers to this building (
        <span className="font-mono text-xs">mag_to_building</span>) and ensure a sensor has a flow{' '}
        <span className="font-mono text-xs">multiplier</span> so usage can be scored.
      </div>
    )
  }

  const { bhi, label, insufficientData, isEstimate, calibration, subScores, overallFormula } =
    health

  return (
    <>
      {/* Compact card */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/card w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      >
        <div className="flex items-center gap-4">
          <div className="w-[100px] shrink-0">
            <HealthGauge score={bhi} label={label} compact />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Building Health Index
              {isEstimate && (
                <span className="ml-1.5 text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
                  EST.
                </span>
              )}
              {insufficientData && (
                <span
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                  title="Limited data today"
                />
              )}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                {bhi}
              </span>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500">/ 100</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${HEALTH_LABEL_CLASS[label]}`}
              >
                {HEALTH_LABEL_COPY[label]}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
              {calibration.summary}
            </p>
          </div>
          <div className="shrink-0 text-gray-300 transition group-hover/card:text-gray-400 dark:text-gray-600 dark:group-hover/card:text-gray-500">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>
      </button>

      {/* Detail modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="flex items-start gap-3 pr-10">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Building Health Index
                </h3>
                {isEstimate && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Estimate — calibrating
                  </span>
                )}
              </div>
              <div className="group relative outline-none" tabIndex={0}>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="How overall score is calculated"
                >
                  ?
                </button>
                <HealthHoverPanel title="Building Health Index (BHI)" formula={overallFormula} />
              </div>
            </div>

            {/* Full gauge */}
            <div className="mt-4">
              <HealthGauge score={bhi} label={label} />
            </div>

            {/* Calibration & warnings */}
            <div className="mt-2 space-y-1 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{calibration.summary}</p>
              {insufficientData && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Not enough magnetometer samples today — BHI is capped.
                </p>
              )}
            </div>

            {/* Pillar sub-scores */}
            <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700/50">
              <p className="mb-2.5 text-[11px] text-gray-400 dark:text-gray-500">
                Hover each pillar for how it is calculated.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['Trust', subScores.trust] as const,
                    ['Leak / idle', subScores.leak] as const,
                    ['Hydraulic', subScores.hydraulic] as const,
                    ['Mechanical', subScores.mechanical] as const,
                  ] as const
                ).map(([name, sub]) => (
                  <div
                    key={name}
                    className="group relative cursor-default rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 outline-none hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-800"
                    tabIndex={0}
                  >
                    <HealthHoverPanel title={`${name} pillar`} formula={sub.formula} />
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {name}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                      {Math.round(sub.score)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                      {sub.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Flow Rate bar chart (today)
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'p' : 'a'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function FlowRateChart({ data }: { data: BucketedFlowPoint[] }) {
  if (data.length === 0) return null

  const bucketMs = data.length > 1 ? data[1]!.timestamp - data[0]!.timestamp : 15 * 60_000

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Flow Rate
        </h3>
        <span className="text-xs text-gray-400">Today</span>
      </div>
      <div className="h-[200px] w-full min-w-0 overflow-hidden sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-100 dark:text-gray-700/50"
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[
                data[0]!.timestamp - bucketMs / 2,
                data[data.length - 1]!.timestamp + bucketMs / 2,
              ]}
              tickFormatter={formatTime}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={42}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v <= 0 ? '' : String(Math.round(v)))}
              domain={[0, (max: number) => Math.max(max * 1.1, 10)]}
              label={{
                value: 'L/h',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: '#3b82f6' },
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as BucketedFlowPoint | undefined
                if (!p) return null
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      {formatTime(p.timestamp - bucketMs / 2)} – {formatTime(p.timestamp + bucketMs / 2)}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-blue-500">
                      {p.flowRateLph.toFixed(1)} L/h
                    </p>
                    <p className="mt-0.5 tabular-nums text-gray-400">
                      {p.bucketVolumeL.toFixed(2)} L{p.partial ? ' (so far)' : ''}
                    </p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="flowRateBarVisual"
              name="Flow Rate (L/h)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill="#3b82f6"
                  fillOpacity={entry.partial ? 0.4 : 1}
                  stroke={entry.partial ? '#3b82f6' : 'none'}
                  strokeWidth={entry.partial ? 1.5 : 0}
                  strokeDasharray={entry.partial ? '4 2' : 'none'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function FlowRateChartSkeleton() {
  const bars = Array.from({ length: 16 }, (_, i) => 15 + Math.sin(i * 0.8) * 25 + Math.random() * 20)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-baseline justify-between">
        <Bone className="h-4 w-20" />
        <Bone className="h-3 w-10" />
      </div>
      <div className="flex h-[200px] items-end gap-[3px] pl-10 sm:h-[240px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm bg-blue-200/60 dark:bg-blue-900/30 ${shimmer}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Magnetometer signal charts (collapsed)
// ---------------------------------------------------------------------------

function MagSignalChart({ data, label, dataKey, color }: {
  data: MagChartPoint[]
  label: string
  dataKey: keyof MagChartPoint
  color: string
}) {
  if (data.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-gray-100 dark:text-gray-700/50"
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={40}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: '#d1d5db', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as MagChartPoint | undefined
                if (!p) return null
                const val = p[dataKey]
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-gray-500">{formatTime(p.timestamp)}</p>
                    <p className="font-semibold tabular-nums" style={{ color }}>
                      {val != null ? Number(val).toFixed(2) : '—'}
                    </p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function MagDataSection({ data }: { data: MagChartPoint[] }) {
  if (data.length === 0) return null

  const maxPoints = 500
  const step = data.length > maxPoints ? Math.ceil(data.length / maxPoints) : 1
  const sampled = step === 1 ? data : data.filter((_, i) => i % step === 0)

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Magnetometer Signals
        <span className="ml-2 text-xs font-normal text-gray-400">Last 24h</span>
      </h3>
      <MagSignalChart data={sampled} label="Total Magnitude" dataKey="total" color="#6366f1" />
      <MagSignalChart data={sampled} label="X Axis" dataKey="x" color="#ef4444" />
      <MagSignalChart data={sampled} label="Y Axis" dataKey="y" color="#22c55e" />
      <MagSignalChart data={sampled} label="Z Axis" dataKey="z" color="#3b82f6" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BuildingAnalytics({ buildingId, cachedBhi, cachedBhiLabel, onMagData }: Props) {
  const { data, health, bucketedFlow, magChart, loading, error } = useBuildingAnalytics(buildingId)

  useEffect(() => {
    onMagData?.(magChart)
  }, [magChart, onMagData])

  return (
    <div className="space-y-4">
      <BuildingHealthSection
        health={health}
        loading={loading}
        cachedBhi={cachedBhi}
        cachedBhiLabel={cachedBhiLabel}
      />

      {/* Top row: Live Flow + Water Usage stats — always visible */}
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

      {/* Flow rate bar chart — always visible */}
      {loading ? (
        <FlowRateChartSkeleton />
      ) : bucketedFlow.length > 0 ? (
        <FlowRateChart data={bucketedFlow} />
      ) : null}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Collapsible detail sections */}
      {(loading || data) && (
        <>
          <CollapsibleSection
            title="Trends & Activity"
            preview={data ? trendsPreview(data) : undefined}
          >
            {loading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <TrendSkeleton />
                <ActiveFlowSkeleton />
              </div>
            ) : data ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <UsageTrend data={data} />
                <ActiveFlowToday data={data} />
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="Projected Usage"
            preview={data ? projectedPreview(data) : undefined}
          >
            {loading ? (
              <ProjectedSkeleton />
            ) : data ? (
              <ProjectedUsageCards data={data} />
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="Peak Hours"
            preview={data ? peakHoursPreview(data) : undefined}
          >
            {loading ? (
              <PeakHoursSkeleton />
            ) : data ? (
              <PeakUsageHours peakHours={data.peakHours} />
            ) : null}
          </CollapsibleSection>
        </>
      )}

    </div>
  )
}
