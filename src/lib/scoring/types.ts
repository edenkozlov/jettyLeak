/**
 * Shared types for the Beluga Property Intelligence scoring engine (v2).
 *
 * Scoring is **deterministic** — the same address always produces the same
 * output. Internal math runs on a 0–100 scale; values exposed to the UI are
 * 1–10 integers (see `toDisplay` in `scoreEngine.ts`).
 */

/* -------------------------------------------------------------------------- */
/*  Mapbox input                                                               */
/* -------------------------------------------------------------------------- */

/** Minimal shape of a Mapbox Geocoding v5 feature we consume. */
export interface MapboxFeatureContext {
  id: string
  text?: string
  short_code?: string
}

export interface MapboxFeature {
  id: string
  place_name: string
  place_type?: string[]
  center: [number, number]
  bbox?: [number, number, number, number]
  text?: string
  properties?: {
    address?: string
    accuracy?: string
    [key: string]: unknown
  }
  context?: MapboxFeatureContext[]
}

/* -------------------------------------------------------------------------- */
/*  Signals                                                                    */
/* -------------------------------------------------------------------------- */

/** Precision of the geocode match. Higher = richer signals. */
export type GeocodePrecision = 'street' | 'postcode' | 'place' | 'region' | 'country'

/** Rough era bucket. Drives pipe/fixture priors. */
export type BuildEra = 'pre1940' | '1940-1970' | '1970-2000' | '2000+'

/** Use / occupancy inferred from the geocoder. */
export type AddressType = 'residential' | 'commercial' | 'unknown'

/**
 * All signals derived from a single MapboxFeature. Pure data, no behaviour.
 * Every field is either a bounded number in `[0, 1]` or a typed enum so that
 * downstream consumers can reason about magnitudes without surprises.
 *
 * When real data sources are added later (see README), they land in this
 * shape and everything downstream — weights, confidence, explanations — keeps
 * working untouched.
 */
export interface Signals {
  // Geocode metadata
  geocodePrecision: GeocodePrecision
  countryCode: 'US' | 'CA' | 'OTHER'
  regionCode: string | null
  regionName: string | null
  postalCode: string | null
  placeName: string | null

  // Property-level inferences
  buildEra: BuildEra
  addressType: AddressType
  isUrbanCore: boolean

  // Environmental exposures, normalised to [0, 1] (higher = more exposure)
  freezeExposure: number
  droughtExposure: number
  coastalExposure: number
  floodStormwaterExposure: number
  hardWaterLikelihood: number

  // Infrastructure inferences, [0, 1] (higher = older / more vulnerable)
  infrastructureAge: number
  combinedSewerLikelihood: number

  // Meta — how much of our prior library matched this address. [0, 1].
  regionCoverage: number
  /** Count of non-trivial signals that meaningfully influenced scoring. */
  signalCount: number
  /** i18n keys for a terse "Signals used" list in the UI. */
  signalKeys: string[]
}

/* -------------------------------------------------------------------------- */
/*  Scores                                                                     */
/* -------------------------------------------------------------------------- */

export type CategoryKey =
  | 'pipeCondition'
  | 'leakResilience'
  | 'pressureStability'
  | 'fixtureCondition'
  | 'drainReliability'
  | 'waterEfficiency'
  | 'scoreConfidence'

export type ScoreBand = 'excellent' | 'good' | 'watch' | 'action'

export interface CategoryScore {
  key: CategoryKey
  /** Display 1–10 (higher = better/healthier). */
  score: number
  /** Internal 0–100 for future debugging / analytics. */
  internal: number
  /** 0–1 confidence for this category. */
  confidence: number
  /**
   * i18n key suffix resolved as
   * `intelligence.categories.<key>.rationale.<rationaleKey>`.
   */
  rationaleKey: string
}

export interface PropertyScore {
  /** Display 1–10. */
  overall: number
  band: ScoreBand
  /** 0–1 aggregate confidence. */
  confidence: number
  categories: CategoryScore[]
  /** i18n keys for "signals used" chips, resolved as `intelligence.signals.<key>`. */
  signalKeys: string[]
}
