/**
 * Explanations — selects the `rationaleKey` shown under each category by
 * looking at which signal contributed the most (in absolute magnitude) to
 * that category's score.
 *
 * All keys are i18n — resolved in the UI as
 * `intelligence.categories.<cat>.rationale.<key>`.
 *
 * The key set is finite and documented alongside the EN/FR landing.json
 * additions. If the dominant signal doesn't have a mapped rationale, we
 * fall back to `default`.
 */

import type { Contribution } from './weights'
import type { CategoryKey, Signals } from './types'

/**
 * Some signals resolve to different rationale keys depending on whether the
 * effect was positive or negative (e.g. `buildEra` → `preWar` vs `recent`).
 */
function resolveRationale(
  cat: CategoryKey,
  top: Contribution | undefined,
  s: Signals,
): string {
  if (!top) return 'default'

  switch (top.signal) {
    case 'buildEra':
      if (s.buildEra === 'pre1940') return 'preWar'
      if (s.buildEra === '1940-1970') return 'midCentury'
      if (s.buildEra === '1970-2000') return 'modern'
      return 'recent'

    case 'combinedSewer':
      return 'combinedSewer'

    case 'freezeClimate':
      return 'freezeThaw'

    case 'droughtClimate':
      return top.delta > 0 ? 'droughtEfficient' : 'droughtExposed'

    case 'coastalExposure':
      return 'coastalExposure'

    case 'floodExposure':
      return 'floodExposure'

    case 'hardWater':
      return 'hardWater'

    case 'infrastructureAge':
      return top.delta < 0 ? 'agingMains' : 'modernMains'

    case 'urbanCore':
      return cat === 'pressureStability' ? 'denseUrban' : 'urbanCore'

    case 'addressUse':
      if (s.addressType === 'commercial') return 'commercialUse'
      return 'residentialUse'

    default:
      return 'default'
  }
}

/**
 * Minimum |delta| (on the 0–100 scale) for a signal to qualify as the
 * dominant rationale. Below this we fall back to a build-era rationale
 * (which every category understands) or to the `default` key, avoiding
 * misleading "freeze-thaw dominates" blurbs in a Phoenix result.
 */
const DOMINANT_THRESHOLD = 2.5

/**
 * Build the per-category rationale keys. `contributions` comes from
 * `applyContributions` and is already sorted by |delta| desc.
 *
 * The `scoreConfidence` rationale is set separately in `confidence.ts`.
 */
export function buildExplanations(
  signals: Signals,
  contributions: Record<CategoryKey, Contribution[]>,
): Record<CategoryKey, string> {
  const out: Record<CategoryKey, string> = {
    pipeCondition: 'default',
    leakResilience: 'default',
    drainReliability: 'default',
    fixtureCondition: 'default',
    pressureStability: 'default',
    waterEfficiency: 'default',
    scoreConfidence: 'default',
  }

  const cats: CategoryKey[] = [
    'pipeCondition',
    'leakResilience',
    'drainReliability',
    'fixtureCondition',
    'pressureStability',
    'waterEfficiency',
  ]

  for (const cat of cats) {
    const list = contributions[cat]
    // Pick the strongest signal that actually moved the needle; otherwise
    // find the first buildEra contribution (every category has one), else
    // fall back to `default`.
    const strong = list.find((c) => Math.abs(c.delta) >= DOMINANT_THRESHOLD)
    if (strong) {
      out[cat] = resolveRationale(cat, strong, signals)
    } else {
      const era = list.find((c) => c.signal === 'buildEra')
      out[cat] = era ? resolveRationale(cat, era, signals) : 'default'
    }
  }

  return out
}
