/**
 * Confidence model.
 *
 * Two things:
 *   1. Per-category confidence — how certain we are about *that* category's
 *      score given the signals available.
 *   2. The dedicated `scoreConfidence` category — the meta-score the user
 *      sees that says "how much of this is grounded in hard signal vs.
 *      regional priors".
 *
 * Both are bounded [0, 1] externally (0–100 internally) and never use RNG.
 */

import type { CategoryKey, Signals } from './types'

/* -------------------------------------------------------------------------- */
/*  Per-category confidence                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Per-category confidence on 0..1.
 *
 * Starts from the region coverage (since every category leans on regional
 * priors today), then adjusts:
 *   - street-level geocode:     +0.10
 *   - US/CA country:            +0.05
 *   - category has strong, category-specific signals: +0.05–0.10
 *   - geocode precision below postcode: heavy penalty.
 */
export function categoryConfidence(cat: CategoryKey, s: Signals): number {
  let c = s.regionCoverage

  // Country / precision base adjustments
  if (s.countryCode !== 'OTHER') c += 0.05
  if (s.geocodePrecision === 'street') c += 0.1
  else if (s.geocodePrecision === 'postcode') c += 0.02
  else if (s.geocodePrecision === 'place') c -= 0.1
  else c -= 0.25

  // Category-specific boosts when we have a concrete signal driving it
  switch (cat) {
    case 'pipeCondition':
      if (s.buildEra === 'pre1940' || s.buildEra === '2000+') c += 0.08
      if (s.infrastructureAge >= 0.8 || s.infrastructureAge <= 0.3) c += 0.05
      break
    case 'leakResilience':
      if (s.freezeExposure >= 0.7 || s.freezeExposure <= 0.2) c += 0.08
      break
    case 'drainReliability':
      if (s.combinedSewerLikelihood >= 0.7 || s.combinedSewerLikelihood <= 0.1) c += 0.1
      if (s.floodStormwaterExposure >= 0.7) c += 0.04
      break
    case 'fixtureCondition':
      if (s.hardWaterLikelihood >= 0.7 || s.hardWaterLikelihood <= 0.2) c += 0.06
      if (s.buildEra === '2000+' || s.buildEra === 'pre1940') c += 0.04
      break
    case 'pressureStability':
      if (s.isUrbanCore || s.addressType === 'commercial') c += 0.06
      break
    case 'waterEfficiency':
      if (s.buildEra === '2000+' || s.droughtExposure >= 0.7) c += 0.05
      break
    case 'scoreConfidence':
      // Computed directly — see below.
      break
  }

  // Clamp 0..1
  return c < 0 ? 0 : c > 1 ? 1 : c
}

/* -------------------------------------------------------------------------- */
/*  scoreConfidence — the user-visible meta-category                           */
/* -------------------------------------------------------------------------- */

/**
 * Internal 0–100 for the `scoreConfidence` category card and the "dominant
 * rationale" it shows.
 *
 * Higher means: we have solid regional priors, a precise geocode, a known
 * country, and several signals meaningfully moved a category. Lower means:
 * this is mostly guesswork.
 */
export function scoreConfidenceInternal(s: Signals): {
  internal: number
  rationaleKey: string
} {
  let v = 0

  // Geocode precision — the single biggest lever
  if (s.geocodePrecision === 'street') v += 45
  else if (s.geocodePrecision === 'postcode') v += 30
  else if (s.geocodePrecision === 'place') v += 18
  else v += 6

  // Country coverage
  if (s.countryCode === 'US' || s.countryCode === 'CA') v += 15
  else v += 4

  // Regional prior coverage
  v += Math.round(s.regionCoverage * 25)

  // Signal density — how many signals actually fired
  const strongSignals = s.signalKeys.filter(
    (k) =>
      k === 'combinedSewer' ||
      k === 'freezeClimate' ||
      k === 'droughtClimate' ||
      k === 'coastalExposure' ||
      k === 'floodExposure' ||
      k === 'hardWater' ||
      k === 'urbanCore' ||
      k === 'commercialUse' ||
      k.startsWith('era.'),
  ).length
  v += Math.min(strongSignals * 2, 12)

  const internal = v < 1 ? 1 : v > 99 ? 99 : v

  const rationaleKey =
    s.geocodePrecision !== 'street' && s.geocodePrecision !== 'postcode'
      ? 'areaOnly'
      : s.countryCode === 'OTHER'
      ? 'limitedRegion'
      : internal >= 80
      ? 'richSignals'
      : internal >= 60
      ? 'goodCoverage'
      : 'partialCoverage'

  return { internal, rationaleKey }
}

/* -------------------------------------------------------------------------- */
/*  Overall confidence                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Overall 0..1 confidence displayed under the overall score.
 *
 * Weighted mean of category confidence, nudged toward `scoreConfidence` so
 * the number the user sees tracks the meta-category they can also click.
 */
export function overallConfidence(
  perCategory: Record<CategoryKey, number>,
  scoreConfidence0to1: number,
): number {
  const cats: CategoryKey[] = [
    'pipeCondition',
    'leakResilience',
    'drainReliability',
    'fixtureCondition',
    'pressureStability',
    'waterEfficiency',
  ]
  const mean = cats.reduce((a, c) => a + perCategory[c], 0) / cats.length
  const blended = mean * 0.55 + scoreConfidence0to1 * 0.45
  return blended < 0 ? 0 : blended > 1 ? 1 : blended
}
