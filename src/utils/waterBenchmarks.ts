/**
 * Region-aware fixture efficiency benchmarks.
 *
 * Canadian benchmarks follow the National Plumbing Code of Canada (NPC) 2020,
 * which harmonized with EPA WaterSense on toilet flush volumes (4.8 L/flush
 * maximum) and similarly updated flow-rate fixtures. Older federal codes and
 * pre-1994 fixtures produce the "acceptable" / "high" / "excessive" tiers.
 *
 * US benchmarks follow EPA WaterSense specifications and the US federal
 * Energy Policy Act 1992 post-1994 standards.
 *
 * Each fixture type is graded on a 5-tier fluid scale — no binary good/bad —
 * so a slightly-above-code toilet shows up as "acceptable" rather than
 * getting flagged as an alarm.
 *
 * Source references are documented per benchmark and shown in the UI.
 */

import type { Region } from '@/utils/regionDetection'

// ─────────────────────────────────────────────────────────────────────────────
// Tier model
// ─────────────────────────────────────────────────────────────────────────────

export type EfficiencyTier = 'excellent' | 'good' | 'acceptable' | 'high' | 'excessive'

/** Ordered worst-first for UI sorting. */
export const TIER_RANK: Record<EfficiencyTier, number> = {
  excessive: 0,
  high: 1,
  acceptable: 2,
  good: 3,
  excellent: 4,
}

export const TIER_LABEL: Record<EfficiencyTier, string> = {
  excellent: 'Excellent',
  good: 'Good',
  acceptable: 'Acceptable',
  high: 'High',
  excessive: 'Excessive',
}

/** Short plain-English explanation of each tier, shared across fixture types. */
export const TIER_DESCRIPTION: Record<EfficiencyTier, string> = {
  excellent: 'Best-in-class efficiency — beats modern code targets.',
  good: 'Meets current code. No action needed.',
  acceptable: 'Older equipment. Still usable but worth upgrading eventually.',
  high: 'Above modern code. Consider replacement when budget allows.',
  excessive: 'Wasteful fixture — should be replaced to avoid large ongoing loss.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmark shape
// ─────────────────────────────────────────────────────────────────────────────

export type BenchmarkKind = 'volume_per_use' | 'flow_rate'

/**
 * A fixture benchmark defines 4 upper bounds that carve the measured value
 * space into 5 tiers:
 *
 *   measured ≤ excellentMax  → excellent
 *   ≤ goodMax                → good
 *   ≤ acceptableMax          → acceptable
 *   ≤ highMax                → high
 *   > highMax                → excessive
 */
export interface FixtureBenchmark {
  type: string
  kind: BenchmarkKind
  /** "L/flush" for volume-per-use, "L/min" for flow-rate */
  unit: string
  region: Region
  /** Short citation of where these numbers come from. */
  source: string
  description: string
  tiers: {
    excellentMax: number
    goodMax: number
    acceptableMax: number
    highMax: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canadian benchmarks — National Plumbing Code 2020
// ─────────────────────────────────────────────────────────────────────────────

// Tolerance factors applied on top of the code targets so we're not rigid:
//  - `good` threshold = code × (1 + TOLERANCE_GOOD) — a slightly-over-code
//    measurement (e.g. 5.2 L on a 4.8 code toilet) still reads as "good"
//  - `acceptable` threshold covers older equipment up to code × ACCEPT_FACTOR
//    with extra tolerance — e.g. a 6.3 L toilet lands in "acceptable"
// These absorb measurement error from our duration-based volume estimate and
// give older-but-functional fixtures a reasonable bucket.
const TOLERANCE_GOOD = 0.10          // +10% on top of code
const ACCEPTABLE_TOLERANCE = 0.25    // +25% on top of the older-code reference

const CA_BENCHMARKS: Record<string, FixtureBenchmark> = {
  Toilet: {
    type: 'Toilet',
    kind: 'volume_per_use',
    unit: 'L/flush',
    region: 'CA',
    source: 'National Plumbing Code of Canada 2020',
    description:
      'NPC 2020 caps toilets at 4.8 L/flush (harmonized with EPA WaterSense). Older code allowed 6 L/flush; pre-1994 fixtures used 13 L/flush or more. A ±10% tolerance on the code threshold absorbs measurement noise.',
    tiers: {
      excellentMax: 3.8,                             // dual-flush low / WaterSense HET
      goodMax: 4.8 * (1 + TOLERANCE_GOOD),           // 5.28 — NPC 2020 + tolerance
      acceptableMax: 6.0 * (1 + ACCEPTABLE_TOLERANCE), // 7.50 — older 6 L code + tolerance
      highMax: 13.0,                                  // pre-1994 fixtures
    },
  },
  Urinal: {
    type: 'Urinal',
    kind: 'volume_per_use',
    unit: 'L/flush',
    region: 'CA',
    source: 'National Plumbing Code of Canada 2020',
    description:
      'NPC 2020 caps urinals at 1.9 L/flush. Waterless or pint-flush (0.5 L) urinals earn best-in-class. Tolerance absorbs measurement noise.',
    tiers: {
      excellentMax: 1.0,
      goodMax: 1.9 * (1 + TOLERANCE_GOOD),           // 2.09
      acceptableMax: 3.8 * (1 + ACCEPTABLE_TOLERANCE), // 4.75
      highMax: 6.0,
    },
  },
  Sink: {
    type: 'Sink',
    kind: 'flow_rate',
    unit: 'L/min',
    region: 'CA',
    source: 'NPC 2020 — Public Lavatory',
    description:
      'NPC 2020 caps public lavatory faucets at 1.9 L/min. Private lavatories may run up to 5.7 L/min. Older federal codes allowed 8.3 L/min. Tolerance absorbs measurement noise on our duration-based flow estimate.',
    tiers: {
      excellentMax: 1.5,
      goodMax: 2.3,                                   // 1.9 + tolerance — public lavatory
      acceptableMax: 5.7 * (1 + ACCEPTABLE_TOLERANCE), // 7.13 — private lavatory + tolerance
      highMax: 10.0,                                  // older federal + margin
    },
  },
  Faucet: {
    type: 'Faucet',
    kind: 'flow_rate',
    unit: 'L/min',
    region: 'CA',
    source: 'NPC 2020 — Kitchen Faucet',
    description:
      'NPC 2020 caps kitchen faucets at 8.3 L/min. WaterSense-level faucets flow at 5.7 L/min.',
    tiers: {
      excellentMax: 4.5,
      goodMax: 5.7 * (1 + TOLERANCE_GOOD),            // 6.27
      acceptableMax: 8.3 * (1 + ACCEPTABLE_TOLERANCE), // 10.38 — code + tolerance
      highMax: 13.0,
    },
  },
  Shower: {
    type: 'Shower',
    kind: 'flow_rate',
    unit: 'L/min',
    region: 'CA',
    source: 'NPC 2020 — Showerheads',
    description:
      'NPC 2020 caps showerheads at 7.6 L/min (2.0 GPM, harmonized with EPA WaterSense). Older US federal code allowed 9.5 L/min. Tolerance absorbs measurement noise.',
    tiers: {
      excellentMax: 6.0,
      goodMax: 7.6 * (1 + TOLERANCE_GOOD),            // 8.36
      acceptableMax: 9.5 * (1 + ACCEPTABLE_TOLERANCE), // 11.88 — older federal + tolerance
      highMax: 14.0,
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// US benchmarks — EPA WaterSense + Energy Policy Act 1992
// ─────────────────────────────────────────────────────────────────────────────

const US_BENCHMARKS: Record<string, FixtureBenchmark> = {
  Toilet: {
    type: 'Toilet',
    kind: 'volume_per_use',
    unit: 'L/flush',
    region: 'US',
    source: 'EPA WaterSense · EPAct 1992',
    description:
      'WaterSense HET toilets use 4.8 L/flush (1.28 GPF). Federal EPAct 1992 max is 6.0 L/flush (1.6 GPF). Tolerance absorbs measurement noise.',
    tiers: {
      excellentMax: 4.8,
      goodMax: 6.0 * (1 + TOLERANCE_GOOD),           // 6.60
      acceptableMax: 9.5 * (1 + ACCEPTABLE_TOLERANCE), // 11.88
      highMax: 15.0,
    },
  },
  Urinal: {
    type: 'Urinal',
    kind: 'volume_per_use',
    unit: 'L/flush',
    region: 'US',
    source: 'EPA WaterSense',
    description:
      'WaterSense urinals use 1.9 L/flush (0.5 GPF). Federal maximum is 3.8 L/flush (1.0 GPF).',
    tiers: {
      excellentMax: 1.0,
      goodMax: 1.9 * (1 + TOLERANCE_GOOD),           // 2.09
      acceptableMax: 3.8 * (1 + ACCEPTABLE_TOLERANCE), // 4.75
      highMax: 6.0,
    },
  },
  Sink: {
    type: 'Sink',
    kind: 'flow_rate',
    unit: 'L/min',
    region: 'US',
    source: 'EPA WaterSense — Public Lavatory',
    description:
      'WaterSense public lavatory faucets capped at 1.9 L/min (0.5 GPM). Private lavatory max 5.7 L/min (1.5 GPM). Tolerance absorbs duration-based flow estimation noise.',
    tiers: {
      excellentMax: 1.5,
      goodMax: 2.3,                                   // 1.9 + tolerance
      acceptableMax: 5.7 * (1 + ACCEPTABLE_TOLERANCE), // 7.13
      highMax: 10.0,
    },
  },
  Faucet: {
    type: 'Faucet',
    kind: 'flow_rate',
    unit: 'L/min',
    region: 'US',
    source: 'EPA WaterSense',
    description:
      'WaterSense faucets flow at 5.7 L/min (1.5 GPM). Federal maximum is 8.3 L/min (2.2 GPM).',
    tiers: {
      excellentMax: 4.5,
      goodMax: 5.7 * (1 + TOLERANCE_GOOD),            // 6.27
      acceptableMax: 8.3 * (1 + ACCEPTABLE_TOLERANCE), // 10.38
      highMax: 13.0,
    },
  },
  Shower: {
    type: 'Shower',
    kind: 'flow_rate',
    unit: 'L/min',
    region: 'US',
    source: 'EPA WaterSense',
    description:
      'WaterSense showerheads flow at 7.6 L/min (2.0 GPM). Federal maximum is 9.5 L/min (2.5 GPM).',
    tiers: {
      excellentMax: 6.0,
      goodMax: 7.6 * (1 + TOLERANCE_GOOD),            // 8.36
      acceptableMax: 9.5 * (1 + ACCEPTABLE_TOLERANCE), // 11.88
      highMax: 14.0,
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Public lookup API
// ─────────────────────────────────────────────────────────────────────────────

export function getBenchmark(type: string, region: Region): FixtureBenchmark | null {
  const map = region === 'US' ? US_BENCHMARKS : CA_BENCHMARKS
  return map[type] ?? null
}

/** Grade a measured value against a benchmark, returning the matching tier. */
export function gradeAgainstBenchmark(
  measured: number,
  benchmark: FixtureBenchmark,
): EfficiencyTier {
  const t = benchmark.tiers
  if (measured <= t.excellentMax) return 'excellent'
  if (measured <= t.goodMax) return 'good'
  if (measured <= t.acceptableMax) return 'acceptable'
  if (measured <= t.highMax) return 'high'
  return 'excessive'
}

/** Tiers that count as "needs review" — high and excessive. Everything else is fine. */
export function isTierConcerning(tier: EfficiencyTier): boolean {
  return tier === 'high' || tier === 'excessive'
}

// ─────────────────────────────────────────────────────────────────────────────
// Building water-use intensity (WUI) bands — L/m²/year
// Unchanged from before (commercial-office typical range).
// ─────────────────────────────────────────────────────────────────────────────

export const WUI_EXCELLENT_MAX = 270
export const WUI_TYPICAL_MAX = 520

export function wuiBandLabel(lPerM2PerYear: number): 'excellent' | 'typical' | 'high' {
  if (lPerM2PerYear <= WUI_EXCELLENT_MAX) return 'excellent'
  if (lPerM2PerYear <= WUI_TYPICAL_MAX) return 'typical'
  return 'high'
}
