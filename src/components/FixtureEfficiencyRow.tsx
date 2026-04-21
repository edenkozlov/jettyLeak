import { useEffect, useMemo, useState } from 'react'

import BetaPill from '@/components/BetaPill'
import FixtureTypeIcon from '@/components/FixtureTypeIcon'
import type {
  FixtureEfficiencyRow as FixtureEfficiencyRowData,
  FixtureOccurrence,
  FixturePerItemStats,
} from '@/hooks/useBuildingWaterHealth'
import { formatLitres, formatRelative } from '@/utils/formatVolume'
import {
  TIER_LABEL,
  type EfficiencyTier,
} from '@/utils/waterBenchmarks'

// ─────────────────────────────────────────────────────────────────────────────
// Shared tier visual constants
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_PILL: Record<EfficiencyTier, string> = {
  excellent:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  good:
    'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  acceptable:
    'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  high:
    'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  excessive:
    'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

export const TIER_BORDER: Record<EfficiencyTier, string> = {
  excellent: 'border-emerald-200 dark:border-emerald-800/50',
  good: 'border-sky-200 dark:border-sky-800/50',
  acceptable: 'border-slate-200 dark:border-slate-700',
  high: 'border-amber-300 dark:border-amber-800/60',
  excessive: 'border-red-300 dark:border-red-800/60',
}

export const TIER_TEXT: Record<EfficiencyTier, string> = {
  excellent: 'text-emerald-600 dark:text-emerald-400',
  good: 'text-sky-600 dark:text-sky-400',
  acceptable: 'text-slate-700 dark:text-slate-300',
  high: 'text-amber-700 dark:text-amber-300',
  excessive: 'text-red-600 dark:text-red-400',
}

export const TIER_BG_SOLID: Record<EfficiencyTier, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-sky-500',
  acceptable: 'bg-slate-400',
  high: 'bg-amber-500',
  excessive: 'bg-red-500',
}

export const TIER_ORDER: EfficiencyTier[] = [
  'excellent',
  'good',
  'acceptable',
  'high',
  'excessive',
]

export function tierForValue(
  value: number,
  tiers: { excellentMax: number; goodMax: number; acceptableMax: number; highMax: number },
): EfficiencyTier {
  if (value <= tiers.excellentMax) return 'excellent'
  if (value <= tiers.goodMax) return 'good'
  if (value <= tiers.acceptableMax) return 'acceptable'
  if (value <= tiers.highMax) return 'high'
  return 'excessive'
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier distribution bar
// ─────────────────────────────────────────────────────────────────────────────

export function TierDistributionBar({
  tierCounts,
  total,
  onSegmentClick,
}: {
  tierCounts: Record<EfficiencyTier, number>
  total: number
  onSegmentClick: (e: React.MouseEvent) => void
}) {
  const segments = TIER_ORDER.map((t) => ({
    tier: t,
    count: tierCounts[t] ?? 0,
    pct: total > 0 ? (tierCounts[t] / total) * 100 : 0,
  }))
  const nonZero = segments.filter((s) => s.count > 0)
  if (nonZero.length === 0) return null

  return (
    <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.tier}
              className={`${TIER_BG_SOLID[s.tier]} transition-opacity hover:opacity-80`}
              style={{ width: `${s.pct}%` }}
              title={`${TIER_LABEL[s.tier]}: ${s.count.toLocaleString()} (${s.pct.toFixed(0)}%)`}
            />
          ) : null,
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {segments.map((s) => {
          const isConcerning = s.tier === 'high' || s.tier === 'excessive'
          const interactive = s.count > 0 && isConcerning
          const content = (
            <span className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${TIER_BG_SOLID[s.tier]} ${s.count === 0 ? 'opacity-40' : ''}`} />
              <span className={`font-semibold ${TIER_TEXT[s.tier]} ${s.count === 0 ? 'opacity-60' : ''}`}>
                {TIER_LABEL[s.tier]}
              </span>
              <span className={`tabular-nums ${s.count === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {s.count.toLocaleString()} · {s.pct.toFixed(0)}%
              </span>
            </span>
          )
          return interactive ? (
            <button
              key={s.tier}
              type="button"
              onClick={onSegmentClick}
              className="rounded transition-colors hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 dark:hover:bg-amber-900/20"
              title={`Click to see the ${s.count.toLocaleString()} ${TIER_LABEL[s.tier].toLowerCase()} session${s.count === 1 ? '' : 's'}`}
            >
              {content}
            </button>
          ) : (
            <span key={s.tier}>{content}</span>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini pie chart — tier distribution donut
// ─────────────────────────────────────────────────────────────────────────────

function TierPie({
  tierCounts,
  total,
  size = 40,
}: {
  tierCounts: Record<EfficiencyTier, number>
  total: number
  size?: number
}) {
  const r = size / 2
  const strokeW = size * 0.18
  const ir = r - strokeW / 2
  const c = 2 * Math.PI * ir

  const segments = TIER_ORDER
    .map((t) => ({ tier: t, count: tierCounts[t] ?? 0 }))
    .filter((s) => s.count > 0)

  if (segments.length === 0) return <div style={{ width: size, height: size }} />

  let offset = 0
  const arcs = segments.map((s) => {
    const pct = s.count / total
    const dash = c * pct
    const gap = c - dash
    const rotation = (offset / total) * 360 - 90
    offset += s.count
    return { ...s, dash, gap, rotation }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={ir} fill="none" strokeWidth={strokeW} className="stroke-gray-100 dark:stroke-gray-700" />
      {arcs.map((a) => (
        <circle
          key={a.tier}
          cx={r}
          cy={r}
          r={ir}
          fill="none"
          strokeWidth={strokeW}
          stroke={TIER_BG_HEX[a.tier]}
          strokeDasharray={`${a.dash} ${a.gap}`}
          transform={`rotate(${a.rotation} ${r} ${r})`}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}

const TIER_BG_HEX: Record<EfficiencyTier, string> = {
  excellent: '#10b981',
  good: '#0ea5e9',
  acceptable: '#6366f1',
  high: '#f97316',
  excessive: '#ef4444',
}

// ─────────────────────────────────────────────────────────────────────────────
// Occurrences list (paginated, scrollable)
// ─────────────────────────────────────────────────────────────────────────────

export function OccurrencesList({
  occurrences,
  benchmark,
  showClassifierName,
  totalBeforeFilter,
  anomalyOnly,
}: {
  occurrences: FixtureOccurrence[]
  benchmark: FixtureEfficiencyRowData['benchmark']
  showClassifierName: boolean
  totalBeforeFilter: number
  anomalyOnly: boolean
}) {
  const PAGE_SIZE = 50
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [occurrences])

  if (occurrences.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
        {anomalyOnly
          ? 'Nothing needing review in this set — everything looks compliant.'
          : 'No occurrences match the current filter.'}
      </p>
    )
  }

  const shown = occurrences.slice(0, visibleCount)
  const remaining = occurrences.length - shown.length
  const nextChunk = Math.min(PAGE_SIZE, remaining)

  return (
    <div>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Showing {shown.length.toLocaleString()}
        {shown.length !== totalBeforeFilter && ` of ${totalBeforeFilter.toLocaleString()}`} session
        {shown.length === 1 ? '' : 's'} · newest first
      </p>
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/40 p-2 dark:border-gray-700 dark:bg-gray-900/30">
        {shown.map((o) => (
          <OccurrenceRow
            key={o.signalId}
            occurrence={o}
            benchmark={benchmark}
            showClassifierName={showClassifierName}
          />
        ))}
        {remaining > 0 && (
          <div className="flex flex-col items-center gap-1 py-3">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300"
            >
              View {nextChunk} more
            </button>
            {remaining > PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setVisibleCount(occurrences.length)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                or show all {occurrences.length.toLocaleString()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OccurrenceRow({
  occurrence,
  benchmark,
  showClassifierName,
}: {
  occurrence: FixtureOccurrence
  benchmark: FixtureEfficiencyRowData['benchmark']
  showClassifierName: boolean
}) {
  const { needsReview, tier, durationS, impliedLitres, startMs, classifierName } = occurrence
  const isVolumeUse = benchmark?.kind === 'volume_per_use'
  const primaryValue = impliedLitres.toFixed(1)
  const primaryUnit = 'L'
  const durationText =
    durationS < 60
      ? `${durationS.toFixed(1)}s`
      : `${Math.floor(durationS / 60)}m ${Math.round(durationS % 60)}s`

  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
        needsReview
          ? 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-900/15'
          : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {needsReview && (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          title="This session falls into the high or excessive tier — worth a look."
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {primaryValue}
            <span className="ml-0.5 text-xs font-normal text-gray-500">{primaryUnit}</span>
          </p>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{durationText}</span>
          {!isVolumeUse && durationS > 0 && (
            <>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {((impliedLitres * 60) / durationS).toFixed(1)} L/min
              </span>
            </>
          )}
          {tier && tier !== 'excellent' && tier !== 'good' && tier !== 'acceptable' && (
            <span className={`ml-1 rounded-full px-1.5 py-0 text-xs font-bold uppercase ${TIER_PILL[tier]}`}>
              {TIER_LABEL[tier]}
            </span>
          )}
        </div>
        {showClassifierName && classifierName && (
          <p className="mt-0.5 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate">{classifierName}</span>
            <BetaPill title="Classifier fixture_name — experimental." />
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-gray-400">
        {startMs > 0 ? formatRelative(new Date(startMs).toISOString()) : '—'}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture item row (used in By-fixture mode)
// ─────────────────────────────────────────────────────────────────────────────

export function FixtureItemRow({
  item,
  benchmark,
}: {
  item: FixturePerItemStats
  benchmark: FixtureEfficiencyRowData['benchmark']
}) {
  if (!benchmark) return null
  const measured =
    benchmark.kind === 'volume_per_use' ? item.avgLitresPerSession : item.avgFlowLpm
  const unit = benchmark.unit

  const classifierLabel =
    item.classifierName && item.classifierName.trim().length > 0
      ? item.classifierName
      : 'Unlabeled'

  const dbMatched = item.dbName != null && item.fixtureId >= 0

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="min-w-0 flex-1">
        <p className="flex items-center truncate text-sm font-semibold text-gray-900 dark:text-white">
          <span className="truncate">{classifierLabel}</span>
          <BetaPill title="Individual fixture identity comes from the ML classifier and may be inaccurate." />
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {item.sessionCount.toLocaleString()} session{item.sessionCount === 1 ? '' : 's'}
          {item.totalLitres != null && ` · ${formatLitres(item.totalLitres)} L est. this month`}
        </p>
        {dbMatched ? (
          <p className="mt-1 text-xs text-gray-400">
            Matched to DB fixture
            {item.dbName ? ` "${item.dbName}"` : ''}
            {item.floorNumber != null ? ` · Floor ${item.floorNumber}` : ''}
            {item.sensorId != null ? ` · Sensor #${item.sensorId}` : ''}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            No matching row in the <span className="font-mono">fixtures</span> table — classifier only.
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
          {measured != null ? measured.toFixed(1) : '—'}
          <span className="ml-0.5 text-xs font-normal text-gray-500">{unit}</span>
        </p>
        {item.tier && (
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${TIER_PILL[item.tier]}`}>
            {TIER_LABEL[item.tier]}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture list (By-fixture mode landing view)
// ─────────────────────────────────────────────────────────────────────────────

export function FixtureList({
  items,
  benchmark,
  onSelect,
}: {
  items: FixturePerItemStats[]
  benchmark: FixtureEfficiencyRowData['benchmark']
  onSelect: (classifierName: string) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">No classifier fixtures seen yet.</p>
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <button
          key={`${item.classifierName ?? 'unlabeled'}-${i}`}
          type="button"
          onClick={() => onSelect(item.classifierName ?? '')}
          disabled={!item.classifierName}
          className="block w-full text-left transition-transform hover:scale-[1.01]"
        >
          <FixtureItemRow item={item} benchmark={benchmark} />
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded body — toolbar + occurrences list + by-fixture toggle
// ─────────────────────────────────────────────────────────────────────────────

export type FixtureExpandedMode = 'occurrences' | 'byFixture'

export function FixtureExpandedBody({
  row,
  mode,
  onModeChange,
  anomalyOnly,
  onAnomalyOnlyChange,
  selectedClassifierName,
  onSelectClassifierName,
}: {
  row: FixtureEfficiencyRowData
  mode: FixtureExpandedMode
  onModeChange: (m: FixtureExpandedMode) => void
  anomalyOnly: boolean
  onAnomalyOnlyChange: (v: boolean) => void
  selectedClassifierName: string | null
  onSelectClassifierName: (n: string | null) => void
}) {
  const { occurrences, items, benchmark, reviewCount } = row

  const filteredOccurrences = useMemo(() => {
    let list = occurrences
    if (mode === 'byFixture' && selectedClassifierName != null) {
      const normTarget = selectedClassifierName.toLowerCase().trim()
      list = list.filter(
        (o) => (o.classifierName ?? '').toLowerCase().trim() === normTarget,
      )
    }
    if (anomalyOnly) list = list.filter((o) => o.needsReview)
    return list
  }, [occurrences, mode, selectedClassifierName, anomalyOnly])

  const selectedItem =
    selectedClassifierName != null
      ? items.find(
          (i) =>
            (i.classifierName ?? '').toLowerCase().trim() ===
            selectedClassifierName.toLowerCase().trim(),
        )
      : null

  if (occurrences.length === 0) {
    return (
      <p className="text-sm text-gray-400">No individual sessions in the fetched window.</p>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              onModeChange('occurrences')
              onSelectClassifierName(null)
            }}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              mode === 'occurrences'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Occurrences
          </button>
          <button
            type="button"
            onClick={() => onModeChange('byFixture')}
            className={`flex items-center rounded-md px-3 py-1.5 transition-colors ${
              mode === 'byFixture'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            By fixture
            <BetaPill title="Grouping by classifier fixture_name — experimental and often inaccurate." />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onAnomalyOnlyChange(!anomalyOnly)}
          disabled={reviewCount === 0}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
            reviewCount === 0
              ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
              : anomalyOnly
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300'
                : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-amber-500/60 dark:hover:text-amber-300'
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          {anomalyOnly ? 'To review only' : 'To review'}
          <span className={`rounded-full px-1.5 text-xs ${
            reviewCount > 0 && !anomalyOnly
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : anomalyOnly
                ? 'bg-white/60 text-amber-800 dark:bg-black/20 dark:text-amber-200'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {reviewCount}
          </span>
        </button>
      </div>

      {mode === 'occurrences' && (
        <OccurrencesList
          occurrences={filteredOccurrences}
          benchmark={benchmark}
          showClassifierName
          totalBeforeFilter={occurrences.length}
          anomalyOnly={anomalyOnly}
        />
      )}

      {mode === 'byFixture' && selectedClassifierName == null && (
        <FixtureList
          items={items}
          benchmark={benchmark}
          onSelect={(name) => onSelectClassifierName(name)}
        />
      )}

      {mode === 'byFixture' && selectedClassifierName != null && (
        <div>
          <button
            type="button"
            onClick={() => onSelectClassifierName(null)}
            className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to fixtures
          </button>
          {selectedItem && (
            <div className="mb-3">
              <FixtureItemRow item={selectedItem} benchmark={benchmark} />
            </div>
          )}
          <OccurrencesList
            occurrences={filteredOccurrences}
            benchmark={benchmark}
            showClassifierName={false}
            totalBeforeFilter={
              occurrences.filter(
                (o) =>
                  (o.classifierName ?? '').toLowerCase().trim() ===
                  selectedClassifierName.toLowerCase().trim(),
              ).length
            }
            anomalyOnly={anomalyOnly}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FixtureRow — expandable row summary. Used by BuildingDetail hero and the
// dedicated Fixtures page.
// ─────────────────────────────────────────────────────────────────────────────

export interface FixtureRowProps {
  row: FixtureEfficiencyRowData
  expanded: boolean
  onToggle: () => void
  /** When true, the row starts in By-fixture mode on first expand. */
  defaultExpandedMode?: FixtureExpandedMode
}

export default function FixtureRow({
  row,
  expanded,
  onToggle,
  defaultExpandedMode = 'occurrences',
}: FixtureRowProps) {
  const [mode, setMode] = useState<FixtureExpandedMode>(defaultExpandedMode)
  const [anomalyOnly, setAnomalyOnly] = useState(false)
  const [selectedClassifierName, setSelectedClassifierName] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) {
      setMode(defaultExpandedMode)
      setAnomalyOnly(false)
      setSelectedClassifierName(null)
    }
  }, [expanded, defaultExpandedMode])

  const { type, avgLitresPerSession, avgFlowLpm, benchmark, tier } = row

  if (!benchmark) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/40 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/30">
        <FixtureTypeIcon type={type} size="h-11 w-11" padding="p-2.5" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-gray-900 dark:text-white">{type}</p>
          <p className="mt-0.5 text-sm text-gray-400">No benchmark available for this type.</p>
        </div>
      </div>
    )
  }

  const measured =
    benchmark.kind === 'volume_per_use' ? avgLitresPerSession : avgFlowLpm
  const unit = benchmark.unit


  const borderAccent = 'border-gray-100 dark:border-gray-700'

  const meanTier = measured != null ? tierForValue(measured, benchmark.tiers) : null

  const total = row.sessionCount > 0 ? row.sessionCount : 1

  return (
    <div className={`rounded-lg border bg-gray-50/60 dark:bg-gray-900/40 ${borderAccent}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className="flex w-full cursor-pointer items-center gap-4 rounded-lg px-4 py-4 text-left transition-colors hover:bg-gray-100/60 dark:hover:bg-gray-900/60"
        aria-expanded={expanded}
      >
        <FixtureTypeIcon type={type} size="h-12 w-12" padding="p-2.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {type}
                </p>
                {measured != null && meanTier && (
                  <p className="text-lg font-bold tabular-nums">
                    <span className={TIER_TEXT[meanTier]}>{measured.toFixed(1)}</span>
                    <span className="ml-0.5 text-sm font-normal text-gray-500">{unit} avg</span>
                  </p>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {row.sessionCount.toLocaleString()} sessions
                {row.totalLitres != null && ` · ${formatLitres(row.totalLitres)} L this month`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mini pie chart + legend */}
              <div className="flex items-center gap-2.5">
                <TierPie tierCounts={row.tierCounts} total={total} size={64} />
                <div className="flex flex-col gap-0.5">
                  {TIER_ORDER.map((t) => {
                    const count = row.tierCounts[t] ?? 0
                    if (count === 0) return null
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={t} className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TIER_BG_HEX[t] }} />
                        <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                          {TIER_LABEL[t]} {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-4 dark:border-gray-700">
          <FixtureExpandedBody
            row={row}
            mode={mode}
            onModeChange={setMode}
            anomalyOnly={anomalyOnly}
            onAnomalyOnlyChange={setAnomalyOnly}
            selectedClassifierName={selectedClassifierName}
            onSelectClassifierName={setSelectedClassifierName}
          />
        </div>
      )}
    </div>
  )
}
