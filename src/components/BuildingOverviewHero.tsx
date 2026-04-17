import { useCallback, useEffect, useRef, useState } from 'react'

import LiveFlowIndicator from '@/components/LiveFlowIndicator'
import FixtureRow from '@/components/FixtureEfficiencyRow'
import type { AnalyticsData, BuildingHealth } from '@/hooks/useBuildingAnalytics'
import {
  useBuildingWaterHealth,
  type WaterHealthGrade,
  type WaterHealthIndex,
} from '@/hooks/useBuildingWaterHealth'
import type { LatLon } from '@/utils/buildingGeometry'
import { formatLitres } from '@/utils/formatVolume'
import {
  WUI_EXCELLENT_MAX,
  WUI_TYPICAL_MAX,
} from '@/utils/waterBenchmarks'
import { regionDisplayName } from '@/utils/regionDetection'

// ─────────────────────────────────────────────────────────────────────────────
// Visual tokens
// ─────────────────────────────────────────────────────────────────────────────

const GRADE_STYLE: Record<WaterHealthGrade, {
  label: string
  text: string
  ring: string
  border: string
  chip: string
}> = {
  excellent: {
    label: 'Excellent',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'stroke-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  good: {
    label: 'Good',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'stroke-sky-500',
    border: 'border-sky-200 dark:border-sky-800/60',
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  },
  watch: {
    label: 'Watch',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'stroke-amber-500',
    border: 'border-amber-200 dark:border-amber-800/60',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  },
  poor: {
    label: 'Poor',
    text: 'text-red-600 dark:text-red-400',
    ring: 'stroke-red-500',
    border: 'border-red-200 dark:border-red-800/60',
    chip: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  },
  unknown: {
    label: 'Learning',
    text: 'text-gray-500 dark:text-gray-400',
    ring: 'stroke-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
}

function subScoreStatus(score: number | null): WaterHealthGrade {
  if (score == null) return 'unknown'
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'watch'
  return 'poor'
}

// ─────────────────────────────────────────────────────────────────────────────
// Delta chip helpers — green when down, red when up
// ─────────────────────────────────────────────────────────────────────────────

type DeltaDirection = 'up' | 'down' | 'flat' | 'none'

interface Delta {
  dir: DeltaDirection
  pct: number | null
  text: string
}

function computeDelta(current: number, reference: number): Delta {
  if (!Number.isFinite(current) || !Number.isFinite(reference) || reference <= 0) {
    return { dir: 'none', pct: null, text: '—' }
  }
  const pct = ((current - reference) / reference) * 100
  if (Math.abs(pct) < 1) return { dir: 'flat', pct, text: 'flat' }
  const dir: DeltaDirection = pct > 0 ? 'up' : 'down'
  return { dir, pct, text: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` }
}

function DeltaChip({ delta, label }: { delta: Delta; label: string }) {
  const color =
    delta.dir === 'up'
      ? 'text-red-500 dark:text-red-400'
      : delta.dir === 'down'
        ? 'text-emerald-500 dark:text-emerald-400'
        : 'text-gray-400 dark:text-gray-500'
  const arrow = delta.dir === 'up' ? '↑' : delta.dir === 'down' ? '↓' : '—'
  if (delta.dir === 'none') {
    return <span className="text-sm text-gray-400">—</span>
  }
  return (
    <span className={`text-sm font-semibold ${color}`}>
      {arrow} {delta.text} {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick stat cell with comparison + projection
// ─────────────────────────────────────────────────────────────────────────────

function StatCell({
  label,
  current,
  unit,
  compareTo,
  compareLabel,
  projected,
  projectedCompareTo,
  projectedCompareLabel,
}: {
  label: string
  current: number | null
  unit: string
  compareTo?: number | null
  compareLabel?: string
  projected?: number | null
  projectedCompareTo?: number | null
  projectedCompareLabel?: string
}) {
  const delta = compareTo != null && current != null ? computeDelta(current, compareTo) : null
  const projDelta =
    projected != null && projectedCompareTo != null
      ? computeDelta(projected, projectedCompareTo)
      : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
        {current != null ? formatLitres(current) : '—'}
        <span className="ml-1.5 text-sm font-normal text-gray-400">{unit}</span>
      </p>
      {delta && (
        <div className="mt-1">
          <DeltaChip delta={delta} label={compareLabel ?? ''} />
        </div>
      )}
      {projected != null && (
        <p className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-500 dark:border-gray-700/60 dark:text-gray-400">
          → <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {formatLitres(projected)} {unit}
          </span>{' '}
          projected
          {projDelta && projDelta.dir !== 'none' && (
            <span className="ml-1 text-xs">
              (
              <DeltaChip delta={projDelta} label={projectedCompareLabel ?? ''} />
              )
            </span>
          )}
        </p>
      )}
    </div>
  )
}

function PeakFlowCell({
  peakLpm,
  buildingId,
}: {
  peakLpm: number | null
  buildingId: number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Peak flow today
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
        {peakLpm != null && peakLpm > 0 ? peakLpm.toFixed(1) : '—'}
        <span className="ml-1.5 text-sm font-normal text-gray-400">L/min</span>
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        instantaneous peak
      </p>
      <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700/60">
        <LiveFlowIndicator buildingId={buildingId} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WHI ring
// ─────────────────────────────────────────────────────────────────────────────

function HealthRing({ score, grade }: { score: number | null; grade: WaterHealthGrade }) {
  const size = 152
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100
  const dash = c * pct
  const style = GRADE_STYLE[grade]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-100 dark:stroke-gray-700"
        />
        {score != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={`${style.ring} transition-[stroke-dashoffset] duration-500`}
            strokeDasharray={`${dash} ${c}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums text-gray-900 dark:text-white">
          {score == null ? '—' : Math.round(score)}
        </span>
        <span className="-mt-0.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          / 100
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Water intensity range bar — lives inside the WUI SubCard footer
// ─────────────────────────────────────────────────────────────────────────────

function IntensityBar({ lPerM2PerYear }: { lPerM2PerYear: number }) {
  const scaleMax = WUI_TYPICAL_MAX * 2
  const excPct = (WUI_EXCELLENT_MAX / scaleMax) * 100
  const typPct = (WUI_TYPICAL_MAX / scaleMax) * 100
  const markerPct = Math.min(100, Math.max(0, (lPerM2PerYear / scaleMax) * 100))
  return (
    <div className="border-t border-gray-100 pt-3 dark:border-gray-700/60">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
        <span>Excellent</span>
        <span>Typical</span>
        <span>High</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-y-0 left-0 bg-emerald-400" style={{ width: `${excPct}%` }} />
        <div
          className="absolute inset-y-0 bg-amber-400"
          style={{ left: `${excPct}%`, width: `${typPct - excPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-red-400"
          style={{ left: `${typPct}%`, width: `${100 - typPct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow dark:border-gray-800"
          style={{ left: `${markerPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-gray-500 tabular-nums dark:text-gray-400">
        <span>0</span>
        <span>{WUI_EXCELLENT_MAX}</span>
        <span>{WUI_TYPICAL_MAX}</span>
        <span>{WUI_TYPICAL_MAX * 2}+</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WHI breakdown modal
// ─────────────────────────────────────────────────────────────────────────────

type PillarKey = 'intensity' | 'leak' | 'trend'

interface PillarDef {
  key: PillarKey
  title: string
  weightPct: number
  source: string
  what: string
  how: string
  /** Plain-English sentence about THIS building's actual numbers. */
  thisBuilding: string
}

const STATIC_PILLARS: Omit<PillarDef, 'thisBuilding'>[] = [
  {
    key: 'intensity',
    title: 'Water Use Intensity',
    weightPct: 50,
    source: 'BOMA BEST · LEED · ENERGY STAR',
    what: 'How much water this building uses relative to its size, expressed as litres per square metre per year. It is the single biggest indoor-water metric in commercial building sustainability programs.',
    how: 'Annualized from this month’s usage (×12), divided by estimated floor area (footprint × floors). Compared to commercial-office bands: under 270 L/m²/year is excellent, 270–520 is typical, above 520 is high.',
  },
  {
    key: 'leak',
    title: 'Leak Integrity',
    weightPct: 35,
    source: 'Overnight flow baseline',
    what: 'Detects sustained water flow during quiet hours (1–5 AM local) when the building should be idle. This is the biggest driver of avoidable water loss in commercial plumbing.',
    how: 'Compares the median overnight flow rate over the last 7 days to this building’s own prior 3-week baseline. A rising ratio drops the score. With little history, a coarser absolute-flow heuristic is used and flagged as an estimate.',
  },
  {
    key: 'trend',
    title: 'Consumption Trend',
    weightPct: 15,
    source: 'LEED Water Efficiency credit',
    what: 'Week-over-week change in total water use. LEED certification rewards buildings that demonstrate sustained reduction against their own baseline.',
    how: 'Percent change from last full week to this week. −20% or more earns a perfect score; flat stays at 80; +20% drops to 40; +50% reaches 0.',
  },
]

/**
 * Build per-building `thisBuilding` sentences from the live sub-scores + analytics,
 * so the modal explains the score in terms of real numbers from the user's own
 * sensors, not just generic definitions.
 */
function buildPillars(whi: WaterHealthIndex, analytics: AnalyticsData | null): PillarDef[] {
  return STATIC_PILLARS.map((p) => {
    let thisBuilding = ''
    if (p.key === 'intensity') {
      const s = whi.intensity
      if (!s.available || s.lPerM2PerYear == null || s.areaM2 == null || s.annualLitres == null) {
        thisBuilding = s.detail
      } else {
        const band =
          s.lPerM2PerYear <= WUI_EXCELLENT_MAX
            ? 'excellent'
            : s.lPerM2PerYear <= WUI_TYPICAL_MAX
              ? 'typical'
              : 'high'
        const vsTypical = ((s.lPerM2PerYear - WUI_TYPICAL_MAX) / WUI_TYPICAL_MAX) * 100
        thisBuilding =
          `At roughly ${formatLitres(s.annualLitres)} L projected over the year ` +
          `across ${Math.round(s.areaM2).toLocaleString()} m² of estimated floor area, ` +
          `this building uses about ${Math.round(s.lPerM2PerYear)} L/m²/year — ` +
          (band === 'excellent'
            ? `well below the ${WUI_EXCELLENT_MAX} L/m²/year excellent threshold.`
            : band === 'typical'
              ? `inside the ${WUI_EXCELLENT_MAX}–${WUI_TYPICAL_MAX} typical office range. Moving below ${WUI_EXCELLENT_MAX} would cross into the excellent band.`
              : `about ${Math.round(vsTypical)}% above the ${WUI_TYPICAL_MAX} L/m²/year typical-office ceiling. Fixture upgrades and leak fixes move this meaningfully.`)
      }
    } else if (p.key === 'leak') {
      const s = whi.leak
      thisBuilding = s.available
        ? `${s.headline} — ${s.detail}`
        : 'Not enough overnight history yet to compare this building against its own baseline.'
    } else if (p.key === 'trend') {
      const s = whi.trend
      if (!s.available || s.percentChange == null || !analytics) {
        thisBuilding = 'Need at least two full weeks of data to show this building’s week-over-week change.'
      } else {
        const pct = s.percentChange
        const thisW = formatLitres(analytics.thisWeek)
        const lastW = formatLitres(analytics.lastWeek)
        if (pct <= -5) {
          thisBuilding =
            `This week's ${thisW} L is ${Math.abs(pct).toFixed(0)}% lower than last week's ${lastW} L. ` +
            `LEED awards credits for sustained reduction like this.`
        } else if (pct >= 5) {
          thisBuilding =
            `This week's ${thisW} L is ${pct.toFixed(0)}% higher than last week's ${lastW} L. ` +
            `Check the Activity feed for which fixture types are driving the increase.`
        } else {
          thisBuilding =
            `This week's ${thisW} L is roughly flat vs last week's ${lastW} L — no meaningful change.`
        }
      }
    }
    return { ...p, thisBuilding }
  })
}

function PillarBlock({
  title,
  weightPct,
  source,
  score,
  headline,
  detail,
  what,
  how,
  thisBuilding,
  accent,
}: {
  title: string
  weightPct: number
  source: string
  score: number | null
  headline: string
  detail: string
  what: string
  how: string
  thisBuilding: string
  accent: React.ReactNode
}) {
  const status = subScoreStatus(score)
  const style = GRADE_STYLE[status]
  return (
    <div className={`rounded-xl border bg-white p-5 dark:bg-gray-800 ${style.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {weightPct}% of score · {source}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {score == null ? '—' : Math.round(score)}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${style.chip}`}>
            {style.label}
          </span>
        </div>
      </div>
      <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{detail}</p>

      {/* Building-specific breakdown — uses real numbers from this building */}
      <div
        className={`mt-4 rounded-lg border-l-4 p-4 ${
          status === 'excellent' || status === 'good'
            ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/15'
            : status === 'watch'
              ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/15'
              : status === 'poor'
                ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/15'
                : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40'
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          What this means for your building
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
          {thisBuilding}
        </p>
      </div>

      <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            What it measures
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{what}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            How it’s calculated
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{how}</p>
        </div>
      </div>

      {accent}
    </div>
  )
}

function WhiBreakdownModal({
  open,
  onClose,
  whi,
  analytics,
  isEstimate,
}: {
  open: boolean
  onClose: () => void
  whi: WaterHealthIndex
  analytics: AnalyticsData | null
  isEstimate: boolean
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  const pillars = buildPillars(whi, analytics)

  const scrollToIdx = useCallback((i: number) => {
    const card = cardRefs.current[i]
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [])

  // Compute which card is closest to the scroller center and mark it active
  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    let closest = 0
    let closestDist = Infinity
    cardRefs.current.forEach((card, i) => {
      if (!card) return
      const cr = card.getBoundingClientRect()
      const cc = cr.left + cr.width / 2
      const d = Math.abs(cc - centerX)
      if (d < closestDist) {
        closestDist = d
        closest = i
      }
    })
    setActiveIdx(closest)
  }, [])

  useEffect(() => {
    if (!open) return
    setActiveIdx(0)
    // Snap to the first pillar when the modal opens (after layout flush)
    const t = setTimeout(() => scrollToIdx(0), 10)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') scrollToIdx(Math.min(pillars.length - 1, activeIdx + 1))
      else if (e.key === 'ArrowLeft') scrollToIdx(Math.max(0, activeIdx - 1))
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, scrollToIdx, activeIdx, pillars.length])

  if (!open) return null

  const pillarData = {
    intensity: whi.intensity,
    leak: whi.leak,
    trend: whi.trend,
  }

  const atFirst = activeIdx === 0
  const atLast = activeIdx === pillars.length - 1
  const overallStyle = GRADE_STYLE[whi.grade]
  const overallHeadline: Record<WaterHealthGrade, string> = {
    excellent: 'Excellent water performance',
    good: 'Good water performance',
    watch: 'A couple of things to watch',
    poor: 'Needs your attention',
    unknown: 'Still learning this building',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whi-breakdown-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Fixed header — shows overall score so users don't forget ──── */}
        <div className="shrink-0 border-b border-gray-200 px-6 pb-5 pt-6 dark:border-gray-700 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-400 backdrop-blur transition-colors hover:bg-gray-100 hover:text-gray-600 dark:bg-gray-900/80 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="flex flex-col gap-5 pr-10 sm:flex-row sm:items-center">
            {/* Score ring — persistent reminder of the overall WHI */}
            <div className="shrink-0">
              <HealthRing score={whi.score} grade={whi.grade} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Water Health Index
                {isEstimate && (
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    LEARNING
                  </span>
                )}
              </p>
              <h2
                id="whi-breakdown-title"
                className={`mt-1 text-2xl font-bold ${overallStyle.text}`}
              >
                {overallHeadline[whi.grade]}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Your building scored <strong className="font-bold text-gray-900 dark:text-white">{whi.score == null ? '—' : Math.round(whi.score)} / 100</strong> across three real,
                measurable pillars of commercial water performance. Swipe through each pillar
                below to see how your building's own sensor data stacks up.
              </p>
              {isEstimate && (
                <p className="mt-2 text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                  We have less than 28 days of sensor history — the score will tighten as data
                  accumulates.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5 sm:px-8">
          {/* Formula visualization */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              The formula
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">WHI =</span>
              {pillars.map((p, i) => (
                <span key={p.key} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-400">+</span>}
                  <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">
                    {p.weightPct}% {p.title}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              If a pillar can't be computed yet, its weight is redistributed pro-rata
              across the others — so the score is never artificially penalized for
              missing data.
            </p>
          </div>

          {/* Dynamic horizontal carousel — centered card grows, neighbors peek in */}
          <div className="mt-5">
            <div className="relative">
              {/* Scrollable track — full width, snap-centered, edge padding so first/last can center */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[15%] pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8"
              >
                {pillars.map((p, i) => {
                  const sub = pillarData[p.key]
                  const isActive = i === activeIdx
                  const accent =
                    p.key === 'intensity' && whi.intensity.lPerM2PerYear != null ? (
                      <div className="mt-4">
                        <IntensityBar lPerM2PerYear={whi.intensity.lPerM2PerYear} />
                      </div>
                    ) : null
                  return (
                    <div
                      key={p.key}
                      ref={(el) => {
                        cardRefs.current[i] = el
                      }}
                      className={`w-[78%] shrink-0 snap-center transition-[transform,opacity,filter] duration-300 ease-out sm:w-[72%] md:w-[68%] lg:w-[62%] ${
                        isActive
                          ? 'scale-100 opacity-100'
                          : 'scale-[0.88] opacity-40 blur-[0.5px]'
                      }`}
                      onClick={() => {
                        if (!isActive) scrollToIdx(i)
                      }}
                      style={{ cursor: isActive ? 'default' : 'pointer' }}
                    >
                      <PillarBlock
                        title={p.title}
                        weightPct={p.weightPct}
                        source={p.source}
                        score={sub.score}
                        headline={sub.headline}
                        detail={sub.detail}
                        what={p.what}
                        how={p.how}
                        thisBuilding={p.thisBuilding}
                        accent={accent}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Edge fade masks so the peeking cards dissolve into the modal bg */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent dark:from-gray-900 sm:w-24" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent dark:from-gray-900 sm:w-24" />
            </div>

            {/* Prev / next + dots */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
                disabled={atFirst}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Previous
              </button>

              <div className="flex items-center gap-2">
                {pillars.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToIdx(i)}
                    aria-label={`Go to pillar ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      i === activeIdx
                        ? 'w-8 bg-indigo-600 dark:bg-indigo-400'
                        : 'w-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollToIdx(Math.min(pillars.length - 1, activeIdx + 1))}
                disabled={atLast}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-600"
              >
                Next
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hero
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  buildingId: number
  health: BuildingHealth | null
  analytics: AnalyticsData | null
  footprint?: LatLon[] | null
  numberOfFloors?: number | null
  totalSqft?: number | null
  address?: string | null
  loading: boolean
}

export default function BuildingOverviewHero({
  buildingId,
  health,
  analytics,
  footprint,
  numberOfFloors,
  totalSqft,
  address,
  loading,
}: Props) {
  const whi: WaterHealthIndex = useBuildingWaterHealth({
    buildingId,
    analytics,
    health,
    footprint,
    numberOfFloors,
    totalSqft,
    address,
    loading,
  })

  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [expandedFixtureType, setExpandedFixtureType] = useState<string | null>(null)

  const style = GRADE_STYLE[whi.grade]

  const headline: Record<WaterHealthGrade, string> = {
    excellent: 'Excellent water performance',
    good: 'Good water performance',
    watch: 'A couple of things to watch',
    poor: 'Needs your attention',
    unknown: 'Still learning this building',
  }
  const subhead: Record<WaterHealthGrade, string> = {
    excellent: 'Intensity, leak integrity, and consumption trend are all within commercial benchmarks.',
    good: 'On the right side of the commercial benchmarks, with minor things to tune.',
    watch: 'At least one of intensity, leaks, or trend is outside the typical range.',
    poor: 'One or more water metrics are well outside commercial norms.',
    unknown: 'We need a few more days of sensor history to score this building against industry benchmarks.',
  }

  // For month we don't have last-month data, but projected vs (thisWeek × 4)
  // is a reasonable monthly expectation signal.
  const monthExpectation = analytics && analytics.lastWeek > 0 ? analytics.lastWeek * 4 : null

  return (
    <div className="space-y-4">
      {/* ── 1. Quick stats at top — with comparisons + projections ─────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCell
          label="Today"
          current={analytics?.today ?? null}
          unit="L"
          compareTo={analytics?.yesterday ?? null}
          compareLabel="vs yesterday"
          projected={analytics?.todayProjected ?? null}
          projectedCompareTo={analytics?.yesterday ?? null}
          projectedCompareLabel="vs yest."
        />
        <StatCell
          label="This week"
          current={analytics?.thisWeek ?? null}
          unit="L"
          compareTo={analytics?.lastWeek ?? null}
          compareLabel="vs last week"
          projected={analytics?.weekProjected ?? null}
          projectedCompareTo={analytics?.lastWeek ?? null}
          projectedCompareLabel="vs last wk"
        />
        <StatCell
          label="This month"
          current={analytics?.thisMonth ?? null}
          unit="L"
          projected={analytics?.monthProjected ?? null}
          projectedCompareTo={monthExpectation}
          projectedCompareLabel="vs 4-wk avg"
        />
        <PeakFlowCell
          peakLpm={whi.peakFlow?.peakLpm ?? null}
          buildingId={buildingId}
        />
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Yesterday
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {analytics ? formatLitres(analytics.yesterday) : '—'}
            <span className="ml-1.5 text-sm font-normal text-gray-400">L</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">full-day total</p>
        </div>
      </div>

      {/* ── 2. WHI banner (pillar details hidden behind a button) ──────── */}
      <div className={`rounded-2xl border bg-white p-6 dark:bg-gray-800 ${style.border}`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <HealthRing score={whi.score} grade={whi.grade} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Water Health Index
              {health?.isEstimate && (
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  LEARNING
                </span>
              )}
            </p>
            <p className={`mt-1.5 text-2xl font-bold ${style.text}`}>
              {loading && whi.score == null ? 'Checking sensors…' : headline[whi.grade]}
            </p>
            <p className="mt-1.5 text-base text-gray-500 dark:text-gray-400">
              {subhead[whi.grade]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBreakdownOpen(true)}
            className="shrink-0 self-start rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300 sm:self-center"
          >
            Show breakdown →
          </button>
        </div>
      </div>

      <WhiBreakdownModal
        open={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        whi={whi}
        analytics={analytics}
        isEstimate={health?.isEstimate ?? false}
      />

      {/* ── 4. Fixture efficiency reference table ─────────────────────── */}
      {whi.fixtureRows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fixture efficiency
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  reference
                </span>
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Benchmarks for <span className="font-semibold text-gray-700 dark:text-gray-300">{regionDisplayName(whi.region)}</span>
                {whi.region === 'CA' ? ' — National Plumbing Code 2020' : whi.region === 'US' ? ' — EPA WaterSense / EPAct 1992' : ''}
              </p>
            </div>
            <p className="text-sm text-gray-400">{whi.fixtureSummary}</p>
          </div>
          <div className="space-y-3">
            {whi.fixtureRows.map((r) => (
              <FixtureRow
                key={r.type}
                row={r}
                expanded={expandedFixtureType === r.type}
                onToggle={() =>
                  setExpandedFixtureType((prev) => (prev === r.type ? null : r.type))
                }
              />
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            Averages are attributed from building-level monthly volume using each type's share of active time.
            This is an estimate (not a scored pillar of the WHI) until per-session volume is stored upstream.
            Toilets / urinals compare to litres-per-flush; sinks, faucets and showers are converted to L/min
            using the session duration.
          </p>
        </div>
      )}
    </div>
  )
}
