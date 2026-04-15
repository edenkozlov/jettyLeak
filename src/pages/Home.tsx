import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useOverview, type HealthLabel, type OverviewBuilding } from '@/hooks/useOverview'
import useAuth from '@/hooks/auth/useAuth'
import { useBuildingAnalytics } from '@/hooks/useBuildingAnalytics'
import useBuildingDetail from '@/hooks/useBuildingDetail'
import {
  useBuildingWaterHealth,
  type WaterHealthIndex,
} from '@/hooks/useBuildingWaterHealth'
import { formatLitres, formatRelative } from '@/utils/formatVolume'

// ─────────────────────────────────────────────────────────────────────────────
// Label styling (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_STYLE: Record<HealthLabel, {
  pill: string
  dot: string
  text: string
  title: string
}> = {
  healthy: {
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    title: 'Healthy',
  },
  watch: {
    pill: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    dot: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    title: 'Watch',
  },
  investigate: {
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    title: 'Investigate',
  },
  critical: {
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    title: 'Critical',
  },
  unknown: {
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    title: 'Calibrating',
  },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio hero — big-number "is it OK right now?" answer
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioHero({
  totalTodayLitres,
  healthyCount,
  watchCount,
  investigateCount,
  criticalCount,
  unknownCount,
  buildingCount,
  sensorCount,
  loading,
}: {
  totalTodayLitres: number
  healthyCount: number
  watchCount: number
  investigateCount: number
  criticalCount: number
  unknownCount: number
  buildingCount: number
  sensorCount: number
  loading: boolean
}) {
  const total = buildingCount || 1
  const segments: { label: HealthLabel; count: number }[] = [
    { label: 'healthy', count: healthyCount },
    { label: 'watch', count: watchCount },
    { label: 'investigate', count: investigateCount },
    { label: 'critical', count: criticalCount },
    { label: 'unknown', count: unknownCount },
  ]

  return (
    <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6 lg:grid-cols-5">
      {/* Total usage — the headline number */}
      <div className="lg:col-span-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Water used today
        </p>
        {loading ? (
          <div className="mt-2 h-11 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : (
          <p className="mt-1 text-4xl font-bold tabular-nums text-gray-900 dark:text-white sm:text-5xl">
            {formatLitres(totalTodayLitres)}
            <span className="ml-1.5 text-lg font-normal text-gray-400">L</span>
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          across {buildingCount} building{buildingCount === 1 ? '' : 's'} · {sensorCount} sensor
          {sensorCount === 1 ? '' : 's'}
        </p>
      </div>

      {/* Health distribution bar */}
      <div className="lg:col-span-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Plumbing health
        </p>
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          {segments.map(
            (s) =>
              s.count > 0 && (
                <div
                  key={s.label}
                  className={LABEL_STYLE[s.label].dot}
                  style={{ width: `${(s.count / total) * 100}%` }}
                  title={`${s.count} ${LABEL_STYLE[s.label].title}`}
                />
              ),
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${LABEL_STYLE[s.label].dot}`} />
              <span className="text-gray-500 dark:text-gray-400">
                {LABEL_STYLE[s.label].title}
              </span>
              <span className="ml-auto font-medium tabular-nums text-gray-900 dark:text-white">
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Issues panel — surfaces non-healthy buildings with honest reasons
// ─────────────────────────────────────────────────────────────────────────────

function IssuesPanel({ issues, loading }: { issues: OverviewBuilding[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Active issues
        </h2>
        {issues.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {issues.length}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-3 p-5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"
            />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          No active issues — all buildings healthy.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {issues.slice(0, 6).map((b) => {
            const style = LABEL_STYLE[b.healthLabel]
            return (
              <li key={b.id}>
                <Link
                  to={`/dashboard/buildings/${b.id}`}
                  className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {b.name || b.full_address || `Building #${b.id}`}
                    </p>
                    <p className={`truncate text-xs ${style.text}`}>{b.issueReason}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.pill}`}>
                    {typeof b.bhi === 'number' ? `WHI ${b.bhi}` : style.title}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Building card — compact, scannable summary
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveWhi {
  score: number
  label: HealthLabel
  reason: string | null
}

/**
 * Map the 5-bucket WaterHealthGrade returned by useBuildingWaterHealth
 * (matches the detail-page hero) onto the Overview page's HealthLabel scheme.
 */
function whiToHealthLabel(whi: WaterHealthIndex): LiveWhi | null {
  if (whi.score == null) return null
  let label: HealthLabel
  if (whi.grade === 'excellent' || whi.grade === 'good') label = 'healthy'
  else if (whi.grade === 'watch') label = 'watch'
  else if (whi.grade === 'poor') label = 'critical'
  else return null
  // Pick the worst sub-score as the reason sentence
  const subs = [
    { key: 'intensity', ...whi.intensity },
    { key: 'leak', ...whi.leak },
    { key: 'trend', ...whi.trend },
  ].filter((s) => s.score != null) as Array<{ key: string; score: number; headline: string }>
  subs.sort((a, b) => a.score - b.score)
  const worst = subs[0]
  const reason = worst ? worst.headline : null
  return { score: Math.round(whi.score), label, reason }
}

function BuildingCard({
  b,
  liveWhi,
}: {
  b: OverviewBuilding
  liveWhi: LiveWhi | null
}) {
  // Prefer the live-computed WHI; fall back to the stored bhi_label while loading.
  const label: HealthLabel = liveWhi?.label ?? b.healthLabel
  const score = liveWhi?.score ?? b.bhi
  const style = LABEL_STYLE[label]
  return (
    <Link
      to={`/dashboard/buildings/${b.id}`}
      state={{ bhi: score, bhiLabel: label }}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {b.name || b.full_address || `Building #${b.id}`}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {b.full_address || '—'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.pill}`}>
            {style.title}
          </span>
          {score != null && (
            <span className={`text-[10px] font-semibold tabular-nums ${style.text}`}>
              WHI {score}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
          {formatLitres(b.today_volume_litres ?? 0)}
        </span>
        <span className="text-sm text-gray-400">L today</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-gray-700/60">
        <span className="text-gray-500 dark:text-gray-400">
          {b.sensor_count} sensor{b.sensor_count === 1 ? '' : 's'}
        </span>
        <span className="text-gray-400">
          {b.last_activity_at ? `active ${formatRelative(b.last_activity_at)}` : 'no activity'}
        </span>
      </div>
    </Link>
  )
}

/**
 * Wrapper that fetches live WHI for a single building and bubbles the result
 * up to the parent. Each card fires its own useBuildingAnalytics +
 * useBuildingWaterHealth so the Overview page's numbers match what the
 * Building Detail hero shows — no more stored-bhi "vanity metrics".
 */
function LiveBuildingCard({
  b,
  onLiveWhi,
}: {
  b: OverviewBuilding
  onLiveWhi: (id: number, live: LiveWhi) => void
}) {
  const { building } = useBuildingDetail(String(b.id))
  const {
    data: analytics,
    health,
    loading,
  } = useBuildingAnalytics(b.id)
  const whi = useBuildingWaterHealth({
    buildingId: b.id,
    analytics,
    health,
    footprint: building?.footprint ?? null,
    numberOfFloors: building?.number_of_floors ?? null,
    address: building?.full_address ?? b.full_address ?? null,
    loading,
  })

  const live = useMemo(() => whiToHealthLabel(whi), [whi])

  useEffect(() => {
    if (live) onLiveWhi(b.id, live)
  }, [live, b.id, onLiveWhi])

  return <BuildingCard b={b} liveWhi={live} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { userData } = useAuth()
  const { buildings, portfolio, loading, error } = useOverview()

  // Live WHI scores keyed by building id — populated progressively as each
  // LiveBuildingCard resolves its analytics fetches.
  const [liveScores, setLiveScores] = useState<Map<number, LiveWhi>>(new Map())
  const onLiveWhi = useCallback((id: number, live: LiveWhi) => {
    setLiveScores((prev) => {
      const existing = prev.get(id)
      if (
        existing &&
        existing.score === live.score &&
        existing.label === live.label &&
        existing.reason === live.reason
      ) {
        return prev
      }
      const next = new Map(prev)
      next.set(id, live)
      return next
    })
  }, [])

  // Portfolio stats recomputed from live scores when available, falling back
  // to the stored bhi_label for buildings whose live WHI hasn't resolved yet.
  const livePortfolio = useMemo(() => {
    const stats = {
      buildingCount: buildings.length,
      totalTodayLitres: 0,
      sensorCount: 0,
      healthyCount: 0,
      watchCount: 0,
      investigateCount: 0,
      criticalCount: 0,
      unknownCount: 0,
      issueBuildings: [] as OverviewBuilding[],
    }
    const severity: Record<HealthLabel, number> = {
      critical: 0,
      investigate: 1,
      watch: 2,
      unknown: 3,
      healthy: 4,
    }
    const annotated = buildings.map((b) => {
      const live = liveScores.get(b.id)
      const label: HealthLabel = live?.label ?? b.healthLabel
      const reason = live?.reason ?? b.issueReason
      return {
        ...b,
        healthLabel: label,
        issueReason: reason,
        bhi: live?.score ?? b.bhi,
      } as OverviewBuilding
    })
    for (const b of annotated) {
      stats.totalTodayLitres += Number.isFinite(b.today_volume_litres) ? b.today_volume_litres : 0
      stats.sensorCount += b.sensor_count ?? 0
      switch (b.healthLabel) {
        case 'healthy': stats.healthyCount++; break
        case 'watch': stats.watchCount++; break
        case 'investigate': stats.investigateCount++; break
        case 'critical': stats.criticalCount++; break
        default: stats.unknownCount++
      }
    }
    stats.issueBuildings = annotated
      .filter((b) => b.healthLabel !== 'healthy')
      .sort((a, z) => {
        const sa = severity[a.healthLabel]
        const sz = severity[z.healthLabel]
        if (sa !== sz) return sa - sz
        return (a.bhi ?? 100) - (z.bhi ?? 100)
      })
    return { stats, annotated }
  }, [buildings, liveScores])

  const userName =
    ((userData?.name as string) ?? (userData?.email as string) ?? '').split(/[\s@]/)[0] ?? ''

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {greeting()}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Plumbing health and water usage across your portfolio.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Hero: big number + health distribution (live WHI-backed) */}
      <PortfolioHero
        totalTodayLitres={portfolio.totalTodayLitres}
        healthyCount={livePortfolio.stats.healthyCount}
        watchCount={livePortfolio.stats.watchCount}
        investigateCount={livePortfolio.stats.investigateCount}
        criticalCount={livePortfolio.stats.criticalCount}
        unknownCount={livePortfolio.stats.unknownCount}
        buildingCount={livePortfolio.stats.buildingCount}
        sensorCount={livePortfolio.stats.sensorCount}
        loading={loading}
      />

      {/* Issues + Buildings */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <IssuesPanel issues={livePortfolio.stats.issueBuildings} loading={loading} />
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Your buildings
            </h2>
            <Link
              to="/dashboard/buildings"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : buildings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-16 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
              No buildings yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {buildings.slice(0, 6).map((b) => (
                <LiveBuildingCard key={b.id} b={b} onLiveWhi={onLiveWhi} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
