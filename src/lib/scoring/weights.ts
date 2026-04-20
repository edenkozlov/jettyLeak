/**
 * Weights — the deterministic scoring math.
 *
 * Two things live here:
 *   1. `CATEGORY_WEIGHTS`  — how each category rolls into the overall score.
 *   2. `SIGNAL_CONTRIBUTIONS` — how each signal shifts each category.
 *
 * Every shift is an explicit number. The engine applies them once and
 * clamps. No randomness, no hidden state.
 *
 * ### Baseline
 * Categories start at `BASELINE = 72` on a 0–100 scale — the "healthy
 * modern property" starting point. Signals then push up or down from there.
 * 72 chosen so that:
 *   - a new-build in a clean region lands around 85–90 (display 9),
 *   - a pre-war combined-sewer freeze-belt address lands around 38–48
 *     (display 4–5),
 *   - nothing saturates at the extremes.
 */

import type { CategoryKey, Signals } from './types'

/* -------------------------------------------------------------------------- */
/*  Category rollup weights                                                    */
/* -------------------------------------------------------------------------- */

/** Weights sum to 1. `scoreConfidence` contributes a small amount so better
 *  known addresses get a mild lift without inflating unknown ones. */
export const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  pipeCondition: 0.22,
  leakResilience: 0.2,
  drainReliability: 0.17,
  fixtureCondition: 0.13,
  pressureStability: 0.11,
  waterEfficiency: 0.09,
  scoreConfidence: 0.08,
}

/* -------------------------------------------------------------------------- */
/*  Signal contributions                                                       */
/* -------------------------------------------------------------------------- */

export const BASELINE = 72

/** A signal's deltas across categories. Missing categories = no effect. */
export type CategoryDelta = Partial<Record<CategoryKey, number>>

/**
 * Each contribution is a function of the signals object. The name is used
 * by `explanations.ts` to decide which signal dominated a category.
 */
export interface SignalContribution {
  name: string
  apply: (s: Signals) => CategoryDelta
}

/**
 * Contributions are additive. Magnitudes are bounded so that ~3 strong
 * adverse signals cannot drive a score below 1 (display), and ~3 favourable
 * signals cannot push above 10.
 *
 * The `name` values feed directly into i18n rationale keys
 * (`intelligence.categories.<cat>.rationale.<name>`).
 */
export const SIGNAL_CONTRIBUTIONS: SignalContribution[] = [
  // ──────────────────────── Build era ──────────────────────────────────────
  {
    name: 'buildEra',
    apply: (s) => {
      switch (s.buildEra) {
        case 'pre1940':
          return {
            pipeCondition: -24,
            fixtureCondition: -16,
            drainReliability: -18,
            leakResilience: -14,
            waterEfficiency: -10,
          }
        case '1940-1970':
          return {
            pipeCondition: -12,
            fixtureCondition: -8,
            drainReliability: -10,
            leakResilience: -7,
            waterEfficiency: -5,
          }
        case '1970-2000':
          return {
            pipeCondition: -2,
            fixtureCondition: -1,
            drainReliability: -2,
            leakResilience: -1,
            waterEfficiency: 0,
          }
        case '2000+':
          return {
            pipeCondition: 8,
            fixtureCondition: 10,
            drainReliability: 5,
            leakResilience: 6,
            waterEfficiency: 7,
          }
      }
    },
  },

  // ──────────────────────── Combined sewer ─────────────────────────────────
  {
    name: 'combinedSewer',
    apply: (s) => ({
      drainReliability: -28 * s.combinedSewerLikelihood,
      leakResilience: -4 * s.combinedSewerLikelihood,
    }),
  },

  // ──────────────────────── Freeze-thaw exposure ───────────────────────────
  {
    name: 'freezeClimate',
    apply: (s) => ({
      leakResilience: -20 * s.freezeExposure,
      pipeCondition: -6 * s.freezeExposure,
      pressureStability: -5 * s.freezeExposure,
    }),
  },

  // ──────────────────────── Drought exposure ───────────────────────────────
  {
    name: 'droughtClimate',
    apply: (s) => {
      // In drought-exposed regions, modern stock often comes with mandated
      // efficient fixtures, while older stock penalises efficiency harder.
      const modern = s.buildEra === '2000+' || s.buildEra === '1970-2000'
      return {
        waterEfficiency: modern ? 8 * s.droughtExposure : -16 * s.droughtExposure,
      }
    },
  },

  // ──────────────────────── Coastal / saltwater ────────────────────────────
  {
    name: 'coastalExposure',
    apply: (s) => ({
      pipeCondition: -6 * s.coastalExposure,
      fixtureCondition: -4 * s.coastalExposure,
      drainReliability: -4 * s.coastalExposure,
    }),
  },

  // ──────────────────────── Flood / stormwater ─────────────────────────────
  {
    name: 'floodExposure',
    apply: (s) => ({
      drainReliability: -14 * s.floodStormwaterExposure,
      pipeCondition: -4 * s.floodStormwaterExposure,
    }),
  },

  // ──────────────────────── Hard water ─────────────────────────────────────
  {
    name: 'hardWater',
    apply: (s) => ({
      fixtureCondition: -16 * s.hardWaterLikelihood,
      waterEfficiency: -6 * s.hardWaterLikelihood,
      pipeCondition: -3 * s.hardWaterLikelihood,
    }),
  },

  // ──────────────────────── Infrastructure age (mains) ─────────────────────
  {
    name: 'infrastructureAge',
    apply: (s) => ({
      pipeCondition: -12 * s.infrastructureAge + 4,
      pressureStability: -8 * s.infrastructureAge + 2,
      leakResilience: -6 * s.infrastructureAge + 2,
    }),
  },

  // ──────────────────────── Dense urban core ───────────────────────────────
  {
    name: 'urbanCore',
    apply: (s) =>
      s.isUrbanCore
        ? {
            pressureStability: -10,
            drainReliability: -4,
          }
        : {},
  },

  // ──────────────────────── Address / use type ─────────────────────────────
  {
    name: 'addressUse',
    apply: (s) => {
      if (s.addressType === 'commercial') {
        return {
          fixtureCondition: -10,
          waterEfficiency: -8,
          pressureStability: -6,
        }
      }
      if (s.addressType === 'residential') {
        return {
          fixtureCondition: 2,
          waterEfficiency: 1,
        }
      }
      return {}
    },
  },
]

/* -------------------------------------------------------------------------- */
/*  Application                                                                */
/* -------------------------------------------------------------------------- */

/**
 * What a single signal contributed to a specific category. Used by
 * `explanations.ts` to pick the dominant rationale.
 */
export interface Contribution {
  category: CategoryKey
  signal: string
  delta: number
}

export interface CategoryMath {
  internal: Record<CategoryKey, number>
  /** Per-category list of contributions, largest |delta| first. */
  contributions: Record<CategoryKey, Contribution[]>
}

const SCORABLE_CATEGORIES: CategoryKey[] = [
  'pipeCondition',
  'leakResilience',
  'drainReliability',
  'fixtureCondition',
  'pressureStability',
  'waterEfficiency',
]

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n
}

/**
 * Apply every contribution and return per-category internal scores (0–100)
 * along with the ordered list of contributions that produced them.
 *
 * `scoreConfidence` is not computed here — it's a meta-category handled in
 * `confidence.ts`.
 */
export function applyContributions(signals: Signals): CategoryMath {
  const internal: Record<CategoryKey, number> = {
    pipeCondition: BASELINE,
    leakResilience: BASELINE,
    drainReliability: BASELINE,
    fixtureCondition: BASELINE,
    pressureStability: BASELINE,
    waterEfficiency: BASELINE,
    scoreConfidence: 50, // placeholder, overwritten by confidence.ts
  }
  const contributions: Record<CategoryKey, Contribution[]> = {
    pipeCondition: [],
    leakResilience: [],
    drainReliability: [],
    fixtureCondition: [],
    pressureStability: [],
    waterEfficiency: [],
    scoreConfidence: [],
  }

  for (const contrib of SIGNAL_CONTRIBUTIONS) {
    const deltas = contrib.apply(signals)
    for (const cat of SCORABLE_CATEGORIES) {
      const d = deltas[cat]
      if (d == null || Math.abs(d) < 0.5) continue
      internal[cat] += d
      contributions[cat].push({ category: cat, signal: contrib.name, delta: d })
    }
  }

  // Clamp to [1, 99] so the display mapping can always reach a valid 1..10.
  for (const cat of SCORABLE_CATEGORIES) {
    internal[cat] = clamp(internal[cat], 1, 99)
    contributions[cat].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  }

  return { internal, contributions }
}
