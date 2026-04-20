/**
 * Score engine — the public entry point.
 *
 * Wires: signalBuilder → weights → confidence → explanations → PropertyScore.
 * Deterministic, synchronous, sub-millisecond. No network, no RNG.
 *
 * Replaces `src/lib/intelligence/scoring.ts`. See README.md in this folder
 * for architecture rationale and data-source roadmap.
 */

import { overallConfidence, categoryConfidence, scoreConfidenceInternal } from './confidence'
import { buildExplanations } from './explanations'
import { buildSignals } from './signalBuilder'
import type {
  CategoryKey,
  CategoryScore,
  MapboxFeature,
  PropertyScore,
  ScoreBand,
  Signals,
} from './types'
import { CATEGORY_WEIGHTS, applyContributions } from './weights'

const SCORABLE: CategoryKey[] = [
  'pipeCondition',
  'leakResilience',
  'drainReliability',
  'fixtureCondition',
  'pressureStability',
  'waterEfficiency',
]

/**
 * Map 0–100 internal → 1–10 display.
 * `ceil(x / 10)` clamped to [1, 10] — gives a natural non-zero floor so
 * bands/colors always land in a meaningful bucket.
 */
function toDisplay(internal: number): number {
  const n = Math.ceil(internal / 10)
  return n < 1 ? 1 : n > 10 ? 10 : n
}

function bandFor(display: number): ScoreBand {
  if (display >= 9) return 'excellent'
  if (display >= 7) return 'good'
  if (display >= 5) return 'watch'
  return 'action'
}

/**
 * The single public entry point. Given a Mapbox feature, returns the full
 * scored property object the UI consumes.
 *
 * @example
 * ```ts
 * const score = estimatePropertyScore(feature)
 * // score.overall       → 6   (display 1..10)
 * // score.band          → 'watch'
 * // score.confidence    → 0.81
 * // score.categories    → 7 CategoryScore objects
 * // score.signalKeys    → ['quebecLegacy', 'era.pre1940', 'combinedSewer', ...]
 * ```
 */
export function estimatePropertyScore(feature: MapboxFeature): PropertyScore {
  const signals = buildSignals(feature)
  const { internal, contributions } = applyContributions(signals)

  // scoreConfidence is its own category — computed from signals, not weights.
  const confidenceResult = scoreConfidenceInternal(signals)
  internal.scoreConfidence = confidenceResult.internal

  const rationales = buildExplanations(signals, contributions)
  rationales.scoreConfidence = confidenceResult.rationaleKey

  // Per-category confidence (0..1)
  const perCatConfidence: Record<CategoryKey, number> = {
    pipeCondition: categoryConfidence('pipeCondition', signals),
    leakResilience: categoryConfidence('leakResilience', signals),
    drainReliability: categoryConfidence('drainReliability', signals),
    fixtureCondition: categoryConfidence('fixtureCondition', signals),
    pressureStability: categoryConfidence('pressureStability', signals),
    waterEfficiency: categoryConfidence('waterEfficiency', signals),
    scoreConfidence: confidenceResult.internal / 100,
  }

  const categories: CategoryScore[] = (
    ['pipeCondition', 'leakResilience', 'drainReliability', 'fixtureCondition',
     'pressureStability', 'waterEfficiency', 'scoreConfidence'] as CategoryKey[]
  ).map((key) => ({
    key,
    internal: internal[key],
    score: toDisplay(internal[key]),
    confidence: perCatConfidence[key],
    rationaleKey: rationales[key],
  }))

  // Overall rollup on internal scale, weighted.
  const weightedInternal = SCORABLE.reduce(
    (acc, k) => acc + internal[k] * CATEGORY_WEIGHTS[k],
    internal.scoreConfidence * CATEGORY_WEIGHTS.scoreConfidence,
  )
  const overall = toDisplay(weightedInternal)
  const band = bandFor(overall)

  const confidence = overallConfidence(perCatConfidence, confidenceResult.internal / 100)

  return {
    overall,
    band,
    confidence,
    categories,
    signalKeys: signals.signalKeys,
  }
}

/** Re-exported for tests / analytics — rarely needed by UI. */
export function debugSignals(feature: MapboxFeature): Signals {
  return buildSignals(feature)
}
