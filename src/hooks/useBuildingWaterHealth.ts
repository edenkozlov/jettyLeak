import { useEffect, useMemo, useState } from 'react'

import {
  displayFixtureType,
  useBuildingFixtures,
  type FixtureTypeGroup,
  type FixtureWithSignals,
} from '@/hooks/useBuildingFixtures'
import { parseSignalValue, type SignalValue } from '@/types/signal'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'
import {
  getBuildingPeakFlow,
  type PeakFlowStats,
} from '@/queries/getBuildingPeakFlow'
import type { AnalyticsData, BuildingHealth } from '@/hooks/useBuildingAnalytics'
import { estimateFloorAreaM2, type LatLon } from '@/utils/buildingGeometry'
import {
  WUI_EXCELLENT_MAX,
  WUI_TYPICAL_MAX,
  getBenchmark,
  gradeAgainstBenchmark,
  isTierConcerning,
  type EfficiencyTier,
  type FixtureBenchmark,
} from '@/utils/waterBenchmarks'
import { detectRegionFromAddress, type Region } from '@/utils/regionDetection'
// WHI weighting done inline from local sub-scores for breakdown consistency
// import { computeWHI as computeWHICanonical } from '@beluga/core'
import { GET_BUILDING_ANALYTICS_SUMMARY, type BuildingAnalyticsSummary } from '@/queries/getBuildingAnalyticsSummary'

// ─────────────────────────────────────────────────────────────────────────────
// Water Health Index (WHI) — 3 real, measurable pillars.
//
// Weights mirror what BOMA BEST, LEED v4.1, and ENERGY STAR Portfolio Manager
// actually score for indoor commercial water management:
//
//   50% Water Use Intensity  ← the single biggest metric in BOMA BEST / LEED
//   35% Leak Integrity       ← biggest driver of avoidable loss
//   15% Consumption Trend    ← LEED credits reward sustained reduction
//
// Fixture efficiency is shown below the score as reference data (measured
// average L/session vs WaterSense), but NOT included in the weighted score —
// because attributing building-level volume to fixture types by duration share
// is approximate, and a weighted score based on an approximation would lie to
// the user. Once we store per-session volumes upstream (signal.value.volume_l),
// fixture efficiency can become a true scored pillar.
// ─────────────────────────────────────────────────────────────────────────────

export type WaterHealthGrade = 'excellent' | 'good' | 'watch' | 'poor' | 'unknown'

export interface WaterHealthSubScore {
  score: number | null          // null when we can't compute yet
  available: boolean
  headline: string
  detail: string
}

export interface FixtureOccurrence {
  signalId: number
  startMs: number
  durationS: number
  /** Estimated litres for this single session, from duration × avg L/s for the type. */
  impliedLitres: number
  /** Raw classifier fixture_name for this session. β — may be inaccurate. */
  classifierName: string | null
  /** Which of the 5 tiers this session falls into (null when there's no benchmark). */
  tier: EfficiencyTier | null
  /** Convenience — true when tier is `high` or `excessive`. */
  needsReview: boolean
  /** True for statistical outliers (> 2σ above the type mean). Secondary signal. */
  isOutlier: boolean
}

export interface FixturePerItemStats {
  fixtureId: number
  /** Authoritative name from the DB `fixtures.name` column. Primary display label. */
  dbName: string | null
  /** Floor from the DB `fixtures.floor_number` column — used to disambiguate identically-named fixtures. */
  floorNumber: number | null
  /** Sensor this fixture is attached to. Shown as context so users can tell rows apart. */
  sensorId: number | null
  /** β — the classifier's fixture_name from the latest signal. Shown only as a small sub-label when it differs from the DB name. */
  classifierName: string | null
  sessionCount: number
  avgLitresPerSession: number | null
  avgFlowLpm: number | null
  totalLitres: number | null
  tier: EfficiencyTier | null
  lastSignalAt: string | null
}

export interface FixtureEfficiencyRow {
  type: string
  sessionCount: number
  avgLitresPerSession: number | null
  avgFlowLpm: number | null
  /** Median of the session-level measured values (more robust to outliers than the mean). */
  medianLitresPerSession: number | null
  medianFlowLpm: number | null
  /** Estimated total litres attributed to this type this month. */
  totalLitres: number | null
  /** Session-to-session spread, measured as coefficient of variation (stddev/mean). */
  cvPct: number | null
  /** Stddev of the measured per-session values. */
  stdDev: number | null
  /** 5-tier compliance breakdown — each session lands in exactly one bucket. */
  tierCounts: Record<EfficiencyTier, number>
  /** Sessions flagged as "needs review" = high + excessive tiers. */
  reviewCount: number
  /** Statistical outliers — sessions > 2σ above the type mean. Secondary signal. */
  outlierCount: number
  /** True if this type has the highest estimated total volume in the building. */
  isHighestUsage: boolean
  /** True when reviewCount > 0 — gentle "needs a look" flag. */
  needsReview: boolean
  benchmark: FixtureBenchmark | null
  /** Tier of the type-level mean (or null when there's no benchmark). */
  tier: EfficiencyTier | null
  /** Individual fixtures (β — relies on classifier fixture_name matching). */
  items: FixturePerItemStats[]
  /** Every individual session in the fetched window — the raw occurrences. */
  occurrences: FixtureOccurrence[]
}

export interface WaterHealthIndex {
  score: number
  grade: WaterHealthGrade
  loading: boolean
  error: string | null

  intensity: WaterHealthSubScore & {
    areaM2: number | null
    annualLitres: number | null
    lPerM2PerYear: number | null
  }
  leak: WaterHealthSubScore
  trend: WaterHealthSubScore & { percentChange: number | null }

  /** Reference data only — not part of the weighted score. */
  fixtureRows: FixtureEfficiencyRow[]
  fixtureSummary: string

  peakFlow: PeakFlowStats | null
  /** Resolved region for benchmark selection. */
  region: Region
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score computations
// ─────────────────────────────────────────────────────────────────────────────

/** Leak sub-score reuses the well-calibrated night-flow logic in buildingHealth.ts. */
function computeLeakSub(health: BuildingHealth | null): WaterHealthSubScore {
  if (!health) {
    return {
      score: null,
      available: false,
      headline: 'Learning overnight baseline',
      detail: 'We need a few nights of sensor data to know what quiet-hour flow looks like here.',
    }
  }
  const s = health.subScores.leak
  const score = s.score
  let headline: string
  if (score >= 85) headline = 'No leak signs'
  else if (score >= 70) headline = 'Minor overnight flow'
  else if (score >= 50) headline = 'Possible leak'
  else headline = 'Leak likely — investigate'
  return {
    score,
    available: true,
    headline,
    detail: s.summary,
  }
}

/**
 * Fixture efficiency reference rows (not scored).
 *
 * For each fixture type we estimate an average volume per session by
 * attributing the building's monthly volume to types by each type's share of
 * active time:
 *
 *     type_volume_L      = month_total_L × (type_active_s / total_active_s_all)
 *     avg_L_per_session  = type_volume_L / type_session_count
 *
 * For volume-per-use fixtures (toilets, urinals) we compare avg_L/session to
 * the WaterSense/standard litres-per-flush. For flow-rate fixtures (sinks,
 * faucets, showers) we convert to L/min via the average session duration.
 *
 * This is an estimate (duration share ≠ volume share exactly), so it's shown
 * as reference data only — never rolled into the weighted WHI score.
 */
function stddev(values: number[], mean: number): number {
  if (values.length < 2) return 0
  let sum = 0
  for (const v of values) sum += (v - mean) * (v - mean)
  return Math.sqrt(sum / (values.length - 1))
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : sorted[mid] ?? null
}

/**
 * Normalize a classifier fixture name for matching to a DB fixture name.
 * Lowercase + strip non-alphanumerics so "augustus toulet" and "Augustus Toilet" match.
 */
function normalizeName(raw: string | null | undefined): string {
  return (raw ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

interface ParsedSession {
  signalId: number
  durationS: number
  classifierName: string
  startMs: number
  /** Authoritative per-session volume from signal.volume_l (computed server-side
   * by counting mag_report peaks in the signal's time range and dividing by the
   * sensor's multiplier). Null when the trigger / backfill hasn't run yet. */
  storedVolumeL: number | null
  /** Authoritative average L/min from signal.avg_flow_lpm. */
  storedFlowLpm: number | null
}

/**
 * Collect every unique signal in a type group, filtered so that only signals
 * whose classifier `signal_type` matches the group's display type are kept.
 *
 * This is critical because a sensor covering multiple physical fixtures will
 * emit signals of different types (e.g. a sensor near a restroom block reports
 * toilet + urinal + sink events). Without this filter, a "Sink" group would
 * pick up toilet-classified signals and show rows like "men left toilet" under
 * Sink — which is wrong.
 *
 * Dedupe is by signal.id since the same signal appears on every DB fixture
 * that shares the sensor.
 */
function uniqueSessions(group: FixtureTypeGroup): ParsedSession[] {
  const seen = new Set<number>()
  const out: ParsedSession[] = []
  for (const fws of group.items) {
    for (const sig of fws.signals) {
      if (seen.has(sig.id)) continue
      seen.add(sig.id)
      const parsed: SignalValue | null = parseSignalValue(sig.value)
      if (parsed?.duration_s == null || !Number.isFinite(parsed.duration_s) || parsed.duration_s <= 0) {
        continue
      }
      // ── Hard filter: signal must belong to this type ──
      const sigType = displayFixtureType(
        parsed.signal_type != null ? String(parsed.signal_type) : null,
      )
      if (sigType !== group.type) continue
      const startMs = sig.start_time
        ? Date.parse(sig.start_time)
        : sig.created_at
          ? Date.parse(sig.created_at)
          : 0
      // Prefer the server-computed volume (from the signal row); fall back to
      // `value.volume_l` in case the backfill hasn't run yet but the signal
      // emitter filled it in the JSON blob.
      const storedVolumeL =
        sig.volume_l != null && Number.isFinite(sig.volume_l) && sig.volume_l > 0
          ? sig.volume_l
          : parsed.volume_l != null && Number.isFinite(parsed.volume_l) && parsed.volume_l > 0
            ? parsed.volume_l
            : null
      const storedFlowLpm =
        sig.avg_flow_lpm != null && Number.isFinite(sig.avg_flow_lpm) && sig.avg_flow_lpm > 0
          ? sig.avg_flow_lpm
          : parsed.avg_flow_lpm != null && Number.isFinite(parsed.avg_flow_lpm) && parsed.avg_flow_lpm > 0
            ? parsed.avg_flow_lpm
            : null
      out.push({
        signalId: sig.id,
        durationS: parsed.duration_s,
        classifierName: (parsed.fixture_name ?? '').trim(),
        startMs: Number.isFinite(startMs) ? startMs : 0,
        storedVolumeL,
        storedFlowLpm,
      })
    }
  }
  return out
}

const EMPTY_TIER_COUNTS: () => Record<EfficiencyTier, number> = () => ({
  excellent: 0,
  good: 0,
  acceptable: 0,
  high: 0,
  excessive: 0,
})

function computeFixtureRows(
  groups: FixtureTypeGroup[],
  monthVolumeLitres: number,
  region: Region,
  /** Scale factor to apply to sampled counts — `totalSignalCount / sampleCount`
   * when the sample hit PostgREST's max-rows cap. Defaults to 1 (no scaling). */
  countScaleFactor: number = 1,
): { rows: FixtureEfficiencyRow[]; summary: string } {
  const scale = countScaleFactor > 1 ? countScaleFactor : 1
  // ── Type-level active time uses UNIQUE sessions only ─────────────────
  // FixtureTypeGroup.items each carry the full signal list for their sensor,
  // so if two DB fixtures share a sensor we'd double-count every signal.
  // We dedupe by signal.id up front.
  const perGroupSessions = new Map<string, ParsedSession[]>()
  let totalActiveS = 0
  for (const g of groups) {
    const sessions = uniqueSessions(g)
    perGroupSessions.set(g.type, sessions)
    for (const s of sessions) totalActiveS += s.durationS
  }

  // Pass 1: compute type-level volume.
  //
  // Building total is always `monthVolumeLitres` from flow_hourly — the
  // server-side hourly rollup counts each mag peak ONCE regardless of how many
  // overlapping classifier signals cover it. signal.volume_l, by contrast,
  // suffers from massive double-counting because the classifier emits many
  // overlapping candidate signals per real water event (we've seen up to ~48
  // overlapping signals per signal). Summing them inflates totals by ~8×.
  //
  // To split the building total across fixture types, we use the RATIO of
  // stored volumes per type (or duration share as a fallback). Ratios are
  // robust to overlap because the overlap factor cancels out when dividing.
  //
  // Per-session averages, medians, tiers and occurrences all still use the
  // raw signal.volume_l — those are individually correct, it's only the sum
  // across overlapping signals that goes wrong.

  // First compute stored sums and total stored sum across all types
  const storedSumByType = new Map<string, number>()
  let totalStoredSumAllTypes = 0
  for (const g of groups) {
    const sessions = perGroupSessions.get(g.type) ?? []
    let storedSum = 0
    for (const s of sessions) {
      if (s.storedVolumeL != null) storedSum += s.storedVolumeL
    }
    storedSumByType.set(g.type, storedSum)
    totalStoredSumAllTypes += storedSum
  }

  const typeVolumes: Array<{
    type: string
    totalL: number
    fromStored: boolean
    storedCoverage: number
  }> = []
  for (const g of groups) {
    const sessions = perGroupSessions.get(g.type) ?? []
    const storedSum = storedSumByType.get(g.type) ?? 0
    let storedCount = 0
    for (const s of sessions) if (s.storedVolumeL != null) storedCount++

    let totalL = 0
    let fromStored = false
    if (totalStoredSumAllTypes > 0 && storedCount > 0) {
      // Stored-ratio attribution: building total × this type's share of the
      // overlap-inflated stored sum. Overlap cancels out of the ratio.
      const share = storedSum / totalStoredSumAllTypes
      totalL = monthVolumeLitres * share
      fromStored = true
    } else {
      // Duration-share fallback when no type has stored volumes yet
      const groupDurationS = sessions.reduce((a, s) => a + s.durationS, 0)
      const durationShare = totalActiveS > 0 ? groupDurationS / totalActiveS : 0
      totalL = monthVolumeLitres * durationShare
    }

    typeVolumes.push({
      type: g.type,
      totalL,
      fromStored,
      storedCoverage: sessions.length > 0 ? storedCount / sessions.length : 0,
    })
  }
  const typeVolumeByType = new Map(typeVolumes.map((tv) => [tv.type, tv]))
  const highestUsageType =
    typeVolumes.reduce<{ type: string; totalL: number } | null>(
      (best, cur) => (best == null || cur.totalL > best.totalL ? cur : best),
      null,
    )?.type ?? null

  const rows: FixtureEfficiencyRow[] = []

  for (const g of groups) {
    const benchmark = getBenchmark(g.type, region)
    const sessions = perGroupSessions.get(g.type) ?? []
    const groupDurationS = sessions.reduce((a, s) => a + s.durationS, 0)
    const sessionCount = sessions.length
    const volumeInfo = typeVolumeByType.get(g.type) ?? {
      totalL: 0,
      fromStored: false,
      storedCoverage: 0,
    }
    const typeVolumeL = volumeInfo.totalL
    const useStoredVolumes = volumeInfo.fromStored
    const isHighestUsage = g.type === highestUsageType

    // Early-exit only when we genuinely can't compute anything useful:
    //   - no benchmark for this type, OR
    //   - fewer than 3 sessions in the sample, OR
    //   - no stored volumes AND no monthly volume to attribute from.
    const canComputeFromStored = sessions.some((s) => s.storedVolumeL != null)
    const canComputeFromAttribution =
      totalActiveS > 0 && monthVolumeLitres > 0
    if (
      !benchmark ||
      sessionCount < 3 ||
      (!canComputeFromStored && !canComputeFromAttribution)
    ) {
      rows.push({
        type: g.type,
        sessionCount: Math.max(sessionCount, Math.round(sessionCount * scale)),
        avgLitresPerSession: null,
        avgFlowLpm: null,
        medianLitresPerSession: null,
        medianFlowLpm: null,
        totalLitres: typeVolumeL > 0 ? typeVolumeL : null,
        cvPct: null,
        stdDev: null,
        tierCounts: EMPTY_TIER_COUNTS(),
        reviewCount: 0,
        outlierCount: 0,
        isHighestUsage,
        needsReview: false,
        benchmark,
        tier: null,
        items: [],
        occurrences: [],
      })
      continue
    }

    // Averages.
    //
    // When individual signals carry stored volumes, each value is the per-session
    // ground truth (what the classifier says that single session used). Averaging
    // them gives a correct "typical session" value that isn't affected by the
    // overlapping-signal inflation — overlap only hurts when summing.
    //
    // When no stored values are available, fall back to `typeVolumeL / true count`
    // from monthly attribution.
    const trueSessionCount = Math.max(1, Math.round(sessionCount * scale))
    const trueGroupDurationS = groupDurationS * scale
    const avgDurationS = groupDurationS / sessionCount

    const storedSessions = sessions.filter((s) => s.storedVolumeL != null)

    const avgLitresPerSession = useStoredVolumes
      ? storedSessions.length > 0
        ? storedSessions.reduce((a, s) => a + (s.storedVolumeL ?? 0), 0) / storedSessions.length
        : null
      : typeVolumeL / trueSessionCount

    const avgFlowLpm = useStoredVolumes
      ? (() => {
          const rates: number[] = []
          for (const s of storedSessions) {
            if (s.storedFlowLpm != null) {
              rates.push(s.storedFlowLpm)
            } else if (s.storedVolumeL != null && s.durationS > 0) {
              rates.push((s.storedVolumeL / s.durationS) * 60)
            }
          }
          if (rates.length === 0) return null
          return rates.reduce((a, b) => a + b, 0) / rates.length
        })()
      : trueGroupDurationS > 0
        ? (typeVolumeL / trueGroupDurationS) * 60
        : null

    const measured =
      benchmark.kind === 'volume_per_use'
        ? avgLitresPerSession
        : avgFlowLpm
    const typeTier =
      measured != null && Number.isFinite(measured)
        ? gradeAgainstBenchmark(measured, benchmark)
        : null

    // ── Variance across deduped sessions ────────────────────────────────
    // If we have real per-session volumes, use them directly so the spread
    // reflects actual session-to-session variation. Otherwise fall back to
    // (duration × type constant) which collapses to constant variance 0.
    const litresPerSecond =
      avgDurationS > 0 && avgLitresPerSession != null
        ? avgLitresPerSession / avgDurationS
        : 0
    const perSessionValues: number[] = useStoredVolumes
      ? sessions
          .map((s) => s.storedVolumeL)
          .filter((v): v is number => v != null)
      : sessions.map((s) => s.durationS * litresPerSecond)

    const mean = perSessionValues.length > 0
      ? perSessionValues.reduce((a, b) => a + b, 0) / perSessionValues.length
      : 0
    const sd = stddev(perSessionValues, mean)
    const cvPct = mean > 0 ? (sd / mean) * 100 : null

    // ── Per-fixture breakdown — bucket sessions by classifier fixture_name ─
    // This is the right level of granularity: one row per classifier-identified
    // fixture (augustus toilet, men right toilet, women right toilet, etc.),
    // counted from the signals themselves. Matched to a DB fixtures row when
    // the normalized name aligns.
    interface Bucket {
      classifierName: string
      sessions: ParsedSession[]
    }
    const bucketMap = new Map<string, Bucket>()
    for (const s of sessions) {
      const key = normalizeName(s.classifierName) || '__unknown__'
      const existing = bucketMap.get(key)
      if (existing) existing.sessions.push(s)
      else bucketMap.set(key, { classifierName: s.classifierName, sessions: [s] })
    }

    // Build a lookup of DB fixtures by normalized name for matching
    const dbByName = new Map<string, FixtureWithSignals>()
    for (const it of g.items) {
      const key = normalizeName(it.fixture.name)
      if (key && !dbByName.has(key)) dbByName.set(key, it)
    }

    const items: FixturePerItemStats[] = Array.from(bucketMap.values())
      .map((bucket) => {
        const itemCount = bucket.sessions.length
        const itemDurationTotal = bucket.sessions.reduce((a, s) => a + s.durationS, 0)
        const shareOfType = groupDurationS > 0 ? itemDurationTotal / groupDurationS : 0
        const itemTotalL = typeVolumeL * shareOfType
        const itemAvgL = itemCount > 0 ? itemTotalL / itemCount : null
        const itemAvgDurS = itemCount > 0 ? itemDurationTotal / itemCount : 0
        const itemFlowLpm =
          itemAvgDurS > 0 && itemAvgL != null ? (itemAvgL / itemAvgDurS) * 60 : null
        const itemMeasured =
          benchmark.kind === 'volume_per_use' ? itemAvgL : itemFlowLpm
        const itemTier =
          itemMeasured != null && itemCount >= 3
            ? gradeAgainstBenchmark(itemMeasured, benchmark)
            : null

        // Match classifier name to a DB fixture when possible
        const matched = dbByName.get(normalizeName(bucket.classifierName))

        const lastSignalMs = bucket.sessions.reduce(
          (m, s) => (s.startMs > m ? s.startMs : m),
          0,
        )

        return {
          fixtureId: matched?.fixture.id ?? -1,
          dbName: matched?.fixture.name ?? null,
          floorNumber: matched?.fixture.floor_number ?? null,
          sensorId: matched?.fixture.sensor_id ?? null,
          classifierName: bucket.classifierName || null,
          sessionCount: itemCount,
          avgLitresPerSession: itemAvgL,
          avgFlowLpm: itemFlowLpm,
          totalLitres: itemTotalL > 0 ? itemTotalL : null,
          tier: itemTier,
          lastSignalAt: lastSignalMs > 0 ? new Date(lastSignalMs).toISOString() : null,
        }
      })
      // Most-used first so the user sees the biggest contributors at the top
      .sort((a, b) => b.sessionCount - a.sessionCount)

    // ── Occurrences list + 5-tier breakdown ─────────────────────────────
    // Each session is classified into one of 5 tiers (excellent → excessive)
    // against the region-appropriate benchmark. Volume-per-use fixtures
    // (toilets/urinals) are compared in L/flush; flow-rate fixtures are
    // compared in L/min (impliedL × 60 / duration).
    const outlierThreshold = sd > 0 ? mean + 2 * sd : Number.POSITIVE_INFINITY
    const isVolumeUse = benchmark.kind === 'volume_per_use'

    const tierCounts: Record<EfficiencyTier, number> = EMPTY_TIER_COUNTS()
    let outlierCount = 0

    const occurrences: FixtureOccurrence[] = sessions
      .map((s) => {
        // Prefer the server-computed volume for this session when available,
        // so each row reflects its own real measurement instead of a type
        // constant. Fall back to `duration × type litresPerSecond` only when
        // the signal hasn't been processed by the trigger/backfill yet.
        const impliedL =
          s.storedVolumeL != null ? s.storedVolumeL : s.durationS * litresPerSecond
        const sessionFlowLpm =
          s.storedFlowLpm != null
            ? s.storedFlowLpm
            : s.durationS > 0
              ? (impliedL * 60) / s.durationS
              : 0

        const measuredVsBenchmark = isVolumeUse ? impliedL : sessionFlowLpm
        const tier = gradeAgainstBenchmark(measuredVsBenchmark, benchmark)
        tierCounts[tier]++
        const isOutlier = impliedL > outlierThreshold
        if (isOutlier) outlierCount++

        return {
          signalId: s.signalId,
          startMs: s.startMs,
          durationS: s.durationS,
          impliedLitres: impliedL,
          classifierName: s.classifierName || null,
          tier,
          needsReview: isTierConcerning(tier),
          isOutlier,
        }
      })
      .sort((a, b) => b.startMs - a.startMs)

    // ── Median stats (more robust than mean) ───────────────────────────
    const medianL = median(occurrences.map((o) => o.impliedLitres))
    const medianFlowLpm =
      !isVolumeUse
        ? median(
            // Each occurrence's own flow rate — uses the real stored rate when
            // available so sessions with different real flows show real spread
            // instead of collapsing to a single type constant.
            occurrences
              .filter((o) => o.durationS > 0)
              .map((o) => (o.impliedLitres * 60) / o.durationS),
          )
        : null

    // Scale sampled counts up to the true total when our sample was capped.
    // The proportions (tier distribution) are preserved — only the absolute
    // counts grow. Averages/medians are untouched.
    const scaledSessionCount = Math.round(sessionCount * scale)
    const scaledTierCounts: Record<EfficiencyTier, number> = {
      excellent: Math.round(tierCounts.excellent * scale),
      good: Math.round(tierCounts.good * scale),
      acceptable: Math.round(tierCounts.acceptable * scale),
      high: Math.round(tierCounts.high * scale),
      excessive: Math.round(tierCounts.excessive * scale),
    }
    const scaledReviewCount = scaledTierCounts.high + scaledTierCounts.excessive
    const scaledOutlierCount = Math.round(outlierCount * scale)

    rows.push({
      type: g.type,
      sessionCount: scaledSessionCount,
      avgLitresPerSession,
      avgFlowLpm,
      medianLitresPerSession: medianL,
      medianFlowLpm,
      totalLitres: typeVolumeL,
      cvPct,
      stdDev: sd > 0 ? sd : null,
      tierCounts: scaledTierCounts,
      reviewCount: scaledReviewCount,
      outlierCount: scaledOutlierCount,
      isHighestUsage,
      needsReview: scaledReviewCount > 0,
      benchmark,
      tier: typeTier,
      items,
      occurrences,
    })
  }

  // Sort: types needing review first, then by usage, then alphabetical
  rows.sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    if (a.isHighestUsage !== b.isHighestUsage) return a.isHighestUsage ? -1 : 1
    return a.type.localeCompare(b.type)
  })

  const graded = rows.filter((r) => r.tier != null)
  const needsReviewTypes = graded.filter((r) => r.needsReview).length
  const excellentTypes = graded.filter((r) => r.tier === 'excellent').length
  let summary: string
  if (graded.length === 0) {
    summary = 'Need at least three classified sessions per fixture type for a comparison.'
  } else if (needsReviewTypes > 0) {
    summary = `${needsReviewTypes} of ${graded.length} types need a look — estimated.`
  } else if (excellentTypes === graded.length) {
    summary = `All ${graded.length} types in the excellent tier — estimated.`
  } else {
    summary = `All ${graded.length} types at or above code — estimated.`
  }
  return { rows, summary }
}

/**
 * Water Use Intensity sub-score: L/m²/year vs commercial benchmarks.
 * Score ramps linearly from 100 at WUI_EXCELLENT_MAX to 50 at WUI_TYPICAL_MAX,
 * then to 0 at 2× WUI_TYPICAL_MAX.
 */
function computeIntensitySub(
  analytics: AnalyticsData | null,
  footprint: LatLon[] | null | undefined,
  numberOfFloors: number | null | undefined,
  totalSqft?: number | null,
): WaterHealthSubScore & {
  areaM2: number | null
  annualLitres: number | null
  lPerM2PerYear: number | null
} {
  // Prefer explicit sqft from DB, fall back to polygon estimate
  const areaM2 = (totalSqft && totalSqft > 0)
    ? totalSqft * 0.092903
    : estimateFloorAreaM2(footprint, numberOfFloors)

  if (!areaM2 || !analytics || !Number.isFinite(analytics.thisMonth) || analytics.thisMonth <= 0) {
    return {
      score: null,
      available: false,
      headline: 'Water Use Intensity',
      detail: !areaM2
        ? 'Add a building footprint and floor count in settings to enable the L/m²/year benchmark.'
        : 'Need at least a month of usage data to estimate annual water use intensity.',
      areaM2,
      annualLitres: null,
      lPerM2PerYear: null,
    }
  }

  const annualLitres = analytics.thisMonth * 12
  const wui = annualLitres / areaM2

  let score: number
  if (wui <= WUI_EXCELLENT_MAX) {
    score = 100
  } else if (wui <= WUI_TYPICAL_MAX) {
    const t = (wui - WUI_EXCELLENT_MAX) / (WUI_TYPICAL_MAX - WUI_EXCELLENT_MAX)
    score = 100 - t * 50
  } else {
    const t = Math.min(1, (wui - WUI_TYPICAL_MAX) / WUI_TYPICAL_MAX)
    score = 50 - t * 50
  }

  let headline: string
  let detail: string
  if (wui <= WUI_EXCELLENT_MAX) {
    headline = `${Math.round(wui)} L/m²/yr — excellent`
    detail = `Below ${WUI_EXCELLENT_MAX} L/m²/year. In the top tier for commercial offices — comparable to LEED/BOMA BEST high performers.`
  } else if (wui <= WUI_TYPICAL_MAX) {
    headline = `${Math.round(wui)} L/m²/yr — typical`
    detail = `Within the typical commercial office range of ${WUI_EXCELLENT_MAX}–${WUI_TYPICAL_MAX} L/m²/year.`
  } else {
    headline = `${Math.round(wui)} L/m²/yr — high`
    detail = `Above the typical commercial range of ${WUI_EXCELLENT_MAX}–${WUI_TYPICAL_MAX} L/m²/year. Fixture upgrades can move this meaningfully.`
  }

  return {
    score,
    available: true,
    headline,
    detail,
    areaM2,
    annualLitres,
    lPerM2PerYear: wui,
  }
}

/**
 * Consumption trend: week-over-week % change.
 * LEED credits reward sustained reduction, so negative change = high score.
 */
function computeTrendSub(
  analytics: AnalyticsData | null,
): WaterHealthSubScore & { percentChange: number | null } {
  if (!analytics || analytics.lastWeek <= 0) {
    return {
      score: null,
      available: false,
      headline: 'Consumption trend',
      detail: 'Need at least two full weeks of data to show week-over-week change.',
      percentChange: null,
    }
  }
  const pct = ((analytics.thisWeek - analytics.lastWeek) / analytics.lastWeek) * 100

  // Score: -20% → 100, 0% → 80, +20% → 40, +50% → 0
  let score: number
  if (pct <= -20) score = 100
  else if (pct <= 0) score = 80 + ((-pct) * 20) / 20
  else if (pct <= 20) score = 80 - (pct * 40) / 20
  else score = Math.max(0, 40 - ((pct - 20) * 40) / 30)

  let headline: string
  let detail: string
  if (pct <= -5) {
    headline = `${Math.abs(pct).toFixed(0)}% lower than last week`
    detail = 'Moving in the right direction — LEED credits reward sustained reduction.'
  } else if (pct >= 5) {
    headline = `${pct.toFixed(0)}% higher than last week`
    detail = 'Week-over-week increase. Check the Activity feed for what’s driving it.'
  } else {
    headline = 'Flat vs last week'
    detail = 'Week-over-week consumption is about the same.'
  }

  return {
    score,
    available: true,
    headline,
    detail,
    percentChange: pct,
  }
}

function scoreToGrade(score: number): WaterHealthGrade {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'watch'
  return 'poor'
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

interface Input {
  buildingId: number | null
  analytics: AnalyticsData | null
  health: BuildingHealth | null
  footprint: LatLon[] | null | undefined
  numberOfFloors: number | null | undefined
  totalSqft?: number | null
  /** Building address — used to detect region and pick the right fixture benchmarks. */
  address: string | null | undefined
  loading: boolean
}

export function useBuildingWaterHealth({
  buildingId,
  analytics,
  health,
  footprint,
  numberOfFloors,
  totalSqft,
  address,
  loading,
}: Input): WaterHealthIndex {
  const fixturesState = useBuildingFixtures(buildingId)

  // RPC summary — single source of truth for WHI inputs (same RPC mobile uses)
  const [rpcSummary, setRpcSummary] = useState<BuildingAnalyticsSummary | null>(null)

  useEffect(() => {
    if (buildingId == null) { setRpcSummary(null); return }
    let cancelled = false
    GET_BUILDING_ANALYTICS_SUMMARY(buildingId)
      .then((s) => { if (!cancelled) setRpcSummary(s) })
      .catch(() => { if (!cancelled) setRpcSummary(null) })
    return () => { cancelled = true }
  }, [buildingId])

  // Fetch sensors (for multipliers) + peak flow from dominant_freq_hz
  const [peakFlow, setPeakFlow] = useState<PeakFlowStats | null>(null)
  const [peakLoading, setPeakLoading] = useState(false)

  useEffect(() => {
    if (buildingId == null) {
      setPeakFlow(null)
      return
    }
    let cancelled = false
    setPeakLoading(true)

    GET_SENSORS_BY_BUILDING_ID({ buildingId })
      .then(async (res: any) => {
        if (cancelled) return
        const sensors = ((res?.sensor ?? []) as Array<{
          id: number
          multiplier: number | string | null
        }>).map((s) => ({
          id: s.id,
          multiplier: s.multiplier != null ? Number(s.multiplier) : null,
        }))
        const stats = await getBuildingPeakFlow(sensors, Date.now() - 24 * 3600 * 1000)
        if (!cancelled) setPeakFlow(stats)
      })
      .catch(() => {
        if (!cancelled) setPeakFlow(null)
      })
      .finally(() => {
        if (!cancelled) setPeakLoading(false)
      })

    return () => { cancelled = true }
  }, [buildingId])

  const region = useMemo<Region>(() => detectRegionFromAddress(address), [address])

  return useMemo<WaterHealthIndex>(() => {
    const intensity = computeIntensitySub(analytics, footprint, numberOfFloors, totalSqft)
    // Leak: prefer the RPC's score (single source of truth shared with mobile),
    // fall back to the local night-flow analysis if RPC hasn't loaded yet.
    const localLeak = computeLeakSub(health)
    const leak: typeof localLeak = rpcSummary?.leak_score != null
      ? { ...localLeak, score: rpcSummary.leak_score, available: true }
      : localLeak
    const trend = computeTrendSub(analytics)
    // When the signal fetch was capped, scale the sampled counts up to the
    // true total so headline numbers match reality.
    const countScaleFactor =
      fixturesState.sampleCount > 0 && fixturesState.totalSignalCount > fixturesState.sampleCount
        ? fixturesState.totalSignalCount / fixturesState.sampleCount
        : 1
    const { rows: fixtureRows, summary: fixtureSummary } = computeFixtureRows(
      fixturesState.groups,
      analytics?.thisMonth ?? 0,
      region,
      countScaleFactor,
    )

    // Weighted score from the locally computed sub-scores — these already have
    // the real data (analytics, footprint, health). Using them directly ensures
    // the overall score matches the breakdown the user sees.
    const W_I = 0.50, W_L = 0.35, W_T = 0.15
    const parts: Array<{ w: number; s: number }> = []
    if (intensity.score != null) parts.push({ w: W_I, s: intensity.score })
    if (leak.score != null) parts.push({ w: W_L, s: leak.score })
    if (trend.score != null) parts.push({ w: W_T, s: trend.score })

    // Always produce a score — use neutral 70 only if truly no pillars available
    let score: number
    if (parts.length > 0) {
      const totalW = parts.reduce((a, b) => a + b.w, 0)
      score = Math.round(parts.reduce((a, b) => a + b.w * b.s, 0) / totalW)
    } else {
      score = 70
    }
    const grade: WaterHealthGrade = scoreToGrade(score)

    return {
      score,
      grade,
      loading: loading || fixturesState.loading || peakLoading,
      error: fixturesState.error,
      intensity,
      leak,
      trend,
      fixtureRows,
      fixtureSummary,
      peakFlow,
      region,
    }
  }, [health, fixturesState, analytics, footprint, numberOfFloors, loading, peakFlow, peakLoading, region, rpcSummary])
}
