/**
 * Signal extraction — turns a `MapboxFeature` into a deterministic `Signals`
 * object the weights/confidence/explanation stages consume.
 *
 * Everything here is:
 *   - **pure** (no I/O, no randomness),
 *   - **deterministic** (same feature → same signals),
 *   - **fast** (O(1) lookups, executes in microseconds).
 *
 * When real data sources arrive (parcel / permits / FEMA — see README),
 * they layer in via new branches inside `buildSignals` without touching
 * anything downstream.
 */

import type {
  AddressType,
  BuildEra,
  GeocodePrecision,
  MapboxFeature,
  MapboxFeatureContext,
  Signals,
} from './types'

/* -------------------------------------------------------------------------- */
/*  Regional priors                                                            */
/* -------------------------------------------------------------------------- */

interface RegionPrior {
  freeze: number              // [0, 1] freeze-thaw exposure
  drought: number             // [0, 1]
  coastal: number             // [0, 1]
  flood: number               // [0, 1] flood / stormwater exposure
  hardWater: number           // [0, 1]
  combinedSewer: number       // [0, 1] likelihood of combined sewer service
  /** [0, 1] higher = older overall building stock / older mains. */
  infrastructureAge: number
  /** [0, 1] how much trust we place in this region's priors. */
  coverage: number
  /** i18n key for the "region signal" chip. */
  signalKey: string
}

const DEFAULT_PRIOR: RegionPrior = {
  freeze: 0.3,
  drought: 0.25,
  coastal: 0.1,
  flood: 0.2,
  hardWater: 0.35,
  combinedSewer: 0.1,
  infrastructureAge: 0.45,
  coverage: 0.4,
  signalKey: 'generalRegion',
}

/**
 * Short-code keyed region priors. Lower-case to match Mapbox's convention.
 * Keep this table tight; refine with real climate/permit data later.
 */
const REGION_PRIORS: Record<string, RegionPrior> = {
  // --- US Northeast (old stock, freeze, combined sewers) -------------------
  'us-ny': { freeze: 0.85, drought: 0.1, coastal: 0.5, flood: 0.55, hardWater: 0.35, combinedSewer: 0.85, infrastructureAge: 0.9, coverage: 0.92, signalKey: 'northeastLegacy' },
  'us-ma': { freeze: 0.85, drought: 0.15, coastal: 0.6, flood: 0.45, hardWater: 0.3, combinedSewer: 0.8, infrastructureAge: 0.85, coverage: 0.9, signalKey: 'northeastLegacy' },
  'us-pa': { freeze: 0.8, drought: 0.15, coastal: 0.25, flood: 0.4, hardWater: 0.45, combinedSewer: 0.8, infrastructureAge: 0.85, coverage: 0.88, signalKey: 'northeastLegacy' },
  'us-nj': { freeze: 0.7, drought: 0.15, coastal: 0.65, flood: 0.6, hardWater: 0.35, combinedSewer: 0.7, infrastructureAge: 0.75, coverage: 0.87, signalKey: 'northeastLegacy' },
  'us-ct': { freeze: 0.8, drought: 0.2, coastal: 0.55, flood: 0.4, hardWater: 0.3, combinedSewer: 0.7, infrastructureAge: 0.78, coverage: 0.85, signalKey: 'northeastLegacy' },
  'us-ri': { freeze: 0.8, drought: 0.2, coastal: 0.75, flood: 0.45, hardWater: 0.3, combinedSewer: 0.7, infrastructureAge: 0.78, coverage: 0.82, signalKey: 'northeastLegacy' },
  'us-md': { freeze: 0.55, drought: 0.2, coastal: 0.45, flood: 0.4, hardWater: 0.4, combinedSewer: 0.7, infrastructureAge: 0.7, coverage: 0.85, signalKey: 'midAtlantic' },
  'us-dc': { freeze: 0.55, drought: 0.15, coastal: 0.3, flood: 0.45, hardWater: 0.45, combinedSewer: 0.85, infrastructureAge: 0.82, coverage: 0.88, signalKey: 'midAtlantic' },
  'us-va': { freeze: 0.45, drought: 0.2, coastal: 0.35, flood: 0.4, hardWater: 0.4, combinedSewer: 0.45, infrastructureAge: 0.6, coverage: 0.85, signalKey: 'midAtlantic' },

  // --- US Midwest (freeze, industrial legacy, hard water) -----------------
  'us-il': { freeze: 0.85, drought: 0.15, coastal: 0, flood: 0.45, hardWater: 0.8, combinedSewer: 0.8, infrastructureAge: 0.8, coverage: 0.9, signalKey: 'midwestLegacy' },
  'us-mi': { freeze: 0.85, drought: 0.1, coastal: 0.25, flood: 0.4, hardWater: 0.75, combinedSewer: 0.75, infrastructureAge: 0.82, coverage: 0.85, signalKey: 'midwestLegacy' },
  'us-oh': { freeze: 0.8, drought: 0.15, coastal: 0.1, flood: 0.4, hardWater: 0.75, combinedSewer: 0.75, infrastructureAge: 0.75, coverage: 0.85, signalKey: 'midwestLegacy' },
  'us-in': { freeze: 0.8, drought: 0.15, coastal: 0, flood: 0.45, hardWater: 0.8, combinedSewer: 0.7, infrastructureAge: 0.7, coverage: 0.82, signalKey: 'midwestLegacy' },
  'us-mn': { freeze: 0.95, drought: 0.2, coastal: 0, flood: 0.35, hardWater: 0.75, combinedSewer: 0.45, infrastructureAge: 0.6, coverage: 0.85, signalKey: 'uppermid' },
  'us-wi': { freeze: 0.95, drought: 0.2, coastal: 0, flood: 0.35, hardWater: 0.8, combinedSewer: 0.55, infrastructureAge: 0.7, coverage: 0.83, signalKey: 'uppermid' },
  'us-mo': { freeze: 0.65, drought: 0.3, coastal: 0, flood: 0.55, hardWater: 0.75, combinedSewer: 0.5, infrastructureAge: 0.65, coverage: 0.8, signalKey: 'midwestLegacy' },

  // --- US Sunbelt (newer stock, drought, heat) ----------------------------
  'us-tx': { freeze: 0.3, drought: 0.7, coastal: 0.35, flood: 0.55, hardWater: 0.8, combinedSewer: 0.15, infrastructureAge: 0.35, coverage: 0.88, signalKey: 'sunbelt' },
  'us-az': { freeze: 0.1, drought: 0.95, coastal: 0, flood: 0.3, hardWater: 0.85, combinedSewer: 0.05, infrastructureAge: 0.3, coverage: 0.85, signalKey: 'desertSw' },
  'us-nv': { freeze: 0.2, drought: 0.95, coastal: 0, flood: 0.25, hardWater: 0.8, combinedSewer: 0.05, infrastructureAge: 0.3, coverage: 0.82, signalKey: 'desertSw' },
  'us-nm': { freeze: 0.4, drought: 0.9, coastal: 0, flood: 0.25, hardWater: 0.85, combinedSewer: 0.1, infrastructureAge: 0.4, coverage: 0.8, signalKey: 'desertSw' },
  'us-fl': { freeze: 0.05, drought: 0.25, coastal: 0.85, flood: 0.85, hardWater: 0.7, combinedSewer: 0.25, infrastructureAge: 0.4, coverage: 0.88, signalKey: 'coastalHumid' },
  'us-ga': { freeze: 0.3, drought: 0.35, coastal: 0.35, flood: 0.5, hardWater: 0.3, combinedSewer: 0.35, infrastructureAge: 0.5, coverage: 0.83, signalKey: 'southeast' },
  'us-nc': { freeze: 0.4, drought: 0.3, coastal: 0.4, flood: 0.55, hardWater: 0.35, combinedSewer: 0.3, infrastructureAge: 0.5, coverage: 0.83, signalKey: 'southeast' },
  'us-sc': { freeze: 0.25, drought: 0.3, coastal: 0.5, flood: 0.55, hardWater: 0.3, combinedSewer: 0.3, infrastructureAge: 0.5, coverage: 0.8, signalKey: 'southeast' },
  'us-tn': { freeze: 0.4, drought: 0.35, coastal: 0, flood: 0.5, hardWater: 0.6, combinedSewer: 0.35, infrastructureAge: 0.55, coverage: 0.8, signalKey: 'southeast' },
  'us-la': { freeze: 0.15, drought: 0.3, coastal: 0.7, flood: 0.85, hardWater: 0.5, combinedSewer: 0.35, infrastructureAge: 0.7, coverage: 0.8, signalKey: 'gulfCoast' },

  // --- US West Coast ------------------------------------------------------
  'us-ca': { freeze: 0.15, drought: 0.85, coastal: 0.6, flood: 0.35, hardWater: 0.7, combinedSewer: 0.35, infrastructureAge: 0.55, coverage: 0.9, signalKey: 'westCoast' },
  'us-wa': { freeze: 0.45, drought: 0.35, coastal: 0.7, flood: 0.45, hardWater: 0.35, combinedSewer: 0.45, infrastructureAge: 0.5, coverage: 0.86, signalKey: 'pacificNw' },
  'us-or': { freeze: 0.45, drought: 0.45, coastal: 0.55, flood: 0.4, hardWater: 0.4, combinedSewer: 0.45, infrastructureAge: 0.55, coverage: 0.83, signalKey: 'pacificNw' },
  'us-co': { freeze: 0.75, drought: 0.7, coastal: 0, flood: 0.3, hardWater: 0.7, combinedSewer: 0.15, infrastructureAge: 0.4, coverage: 0.83, signalKey: 'mountainWest' },
  'us-ut': { freeze: 0.7, drought: 0.85, coastal: 0, flood: 0.25, hardWater: 0.85, combinedSewer: 0.1, infrastructureAge: 0.35, coverage: 0.8, signalKey: 'mountainWest' },

  // --- Canada -------------------------------------------------------------
  'ca-qc': { freeze: 0.98, drought: 0.1, coastal: 0.25, flood: 0.5, hardWater: 0.3, combinedSewer: 0.9, infrastructureAge: 0.9, coverage: 0.9, signalKey: 'quebecLegacy' },
  'ca-on': { freeze: 0.9, drought: 0.1, coastal: 0.15, flood: 0.45, hardWater: 0.5, combinedSewer: 0.75, infrastructureAge: 0.8, coverage: 0.9, signalKey: 'ontarioUrban' },
  'ca-bc': { freeze: 0.35, drought: 0.3, coastal: 0.8, flood: 0.45, hardWater: 0.25, combinedSewer: 0.5, infrastructureAge: 0.55, coverage: 0.88, signalKey: 'pacificCa' },
  'ca-ab': { freeze: 0.95, drought: 0.35, coastal: 0, flood: 0.25, hardWater: 0.8, combinedSewer: 0.3, infrastructureAge: 0.5, coverage: 0.85, signalKey: 'prairieFreeze' },
  'ca-mb': { freeze: 0.98, drought: 0.25, coastal: 0, flood: 0.35, hardWater: 0.85, combinedSewer: 0.55, infrastructureAge: 0.7, coverage: 0.82, signalKey: 'prairieFreeze' },
  'ca-sk': { freeze: 0.98, drought: 0.3, coastal: 0, flood: 0.3, hardWater: 0.85, combinedSewer: 0.3, infrastructureAge: 0.55, coverage: 0.8, signalKey: 'prairieFreeze' },
  'ca-ns': { freeze: 0.75, drought: 0.15, coastal: 0.85, flood: 0.5, hardWater: 0.3, combinedSewer: 0.55, infrastructureAge: 0.7, coverage: 0.8, signalKey: 'atlanticCa' },
  'ca-nb': { freeze: 0.85, drought: 0.15, coastal: 0.55, flood: 0.45, hardWater: 0.3, combinedSewer: 0.5, infrastructureAge: 0.7, coverage: 0.78, signalKey: 'atlanticCa' },
}

/* -------------------------------------------------------------------------- */
/*  Metro-specific overrides (urban core + era bumps)                          */
/* -------------------------------------------------------------------------- */

/**
 * Metros where the housing stock strongly skews a particular era, beyond
 * what the region prior captures. Keys match lower-cased place text.
 */
const METRO_ERAS: Record<string, { era: BuildEra; combinedSewer?: number; infrastructureAge?: number }> = {
  // Pre-war cores
  'new york': { era: 'pre1940', combinedSewer: 0.95, infrastructureAge: 0.95 },
  'brooklyn': { era: 'pre1940', combinedSewer: 0.95, infrastructureAge: 0.95 },
  'manhattan': { era: 'pre1940', combinedSewer: 0.95, infrastructureAge: 0.98 },
  'bronx': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.9 },
  'boston': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.92 },
  'philadelphia': { era: 'pre1940', combinedSewer: 0.95, infrastructureAge: 0.92 },
  'chicago': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.9 },
  'detroit': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.92 },
  'baltimore': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.92 },
  'pittsburgh': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.88 },
  'cleveland': { era: 'pre1940', combinedSewer: 0.9, infrastructureAge: 0.88 },
  'st. louis': { era: 'pre1940', combinedSewer: 0.85, infrastructureAge: 0.85 },
  'st louis': { era: 'pre1940', combinedSewer: 0.85, infrastructureAge: 0.85 },
  'washington': { era: 'pre1940', combinedSewer: 0.85, infrastructureAge: 0.85 },
  'san francisco': { era: 'pre1940', combinedSewer: 0.65, infrastructureAge: 0.8 },
  'montréal': { era: 'pre1940', combinedSewer: 0.95, infrastructureAge: 0.95 },
  'montreal': { era: 'pre1940', combinedSewer: 0.95, infrastructureAge: 0.95 },
  'toronto': { era: 'pre1940', combinedSewer: 0.8, infrastructureAge: 0.85 },
  'ottawa': { era: '1940-1970', combinedSewer: 0.7, infrastructureAge: 0.75 },
  'québec': { era: 'pre1940', combinedSewer: 0.85, infrastructureAge: 0.9 },
  'quebec': { era: 'pre1940', combinedSewer: 0.85, infrastructureAge: 0.9 },

  // Mid-century
  'los angeles': { era: '1940-1970', combinedSewer: 0.2, infrastructureAge: 0.65 },
  'san diego': { era: '1940-1970', combinedSewer: 0.2, infrastructureAge: 0.6 },
  'seattle': { era: '1940-1970', combinedSewer: 0.7, infrastructureAge: 0.7 },
  'minneapolis': { era: '1940-1970', combinedSewer: 0.5, infrastructureAge: 0.7 },
  'denver': { era: '1940-1970', combinedSewer: 0.25, infrastructureAge: 0.6 },

  // Modern Sunbelt
  'houston': { era: '1970-2000', combinedSewer: 0.15, infrastructureAge: 0.4 },
  'dallas': { era: '1970-2000', combinedSewer: 0.1, infrastructureAge: 0.4 },
  'austin': { era: '2000+', combinedSewer: 0.05, infrastructureAge: 0.3 },
  'phoenix': { era: '1970-2000', combinedSewer: 0.05, infrastructureAge: 0.3 },
  'las vegas': { era: '2000+', combinedSewer: 0.02, infrastructureAge: 0.2 },
  'miami': { era: '1970-2000', combinedSewer: 0.35, infrastructureAge: 0.45 },
  'atlanta': { era: '1970-2000', combinedSewer: 0.4, infrastructureAge: 0.5 },
  'charlotte': { era: '2000+', combinedSewer: 0.1, infrastructureAge: 0.3 },
  'raleigh': { era: '2000+', combinedSewer: 0.1, infrastructureAge: 0.3 },
  'tampa': { era: '1970-2000', combinedSewer: 0.15, infrastructureAge: 0.45 },
  'orlando': { era: '2000+', combinedSewer: 0.1, infrastructureAge: 0.3 },
  'nashville': { era: '1970-2000', combinedSewer: 0.4, infrastructureAge: 0.5 },
}

/** A tight set used purely for the `isUrbanCore` hydraulic-risk signal. */
const URBAN_CORES = new Set([
  'new york', 'brooklyn', 'manhattan', 'bronx', 'boston', 'philadelphia',
  'chicago', 'detroit', 'baltimore', 'pittsburgh', 'cleveland', 'washington',
  'san francisco', 'los angeles', 'seattle', 'montréal', 'montreal', 'toronto',
  'vancouver', 'québec', 'quebec',
])

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function findContext(
  ctx: MapboxFeatureContext[] | undefined,
  prefix: string,
): MapboxFeatureContext | undefined {
  return ctx?.find((c) => c.id.startsWith(prefix))
}

function derivePrecision(placeType: string | undefined): GeocodePrecision {
  switch (placeType) {
    case 'address':
    case 'poi':
      return 'street'
    case 'postcode':
      return 'postcode'
    case 'locality':
    case 'neighborhood':
    case 'place':
      return 'place'
    case 'region':
    case 'district':
      return 'region'
    default:
      return 'country'
  }
}

function deriveAddressType(placeType: string | undefined): AddressType {
  if (placeType === 'poi') return 'commercial'
  if (placeType === 'address') return 'residential'
  return 'unknown'
}

/**
 * Era inference:
 *   - Metro override wins if we know the city.
 *   - Else fall back to region `infrastructureAge` prior, bucketed.
 */
function deriveBuildEra(
  prior: RegionPrior,
  metroEra: BuildEra | undefined,
): BuildEra {
  if (metroEra) return metroEra
  const age = prior.infrastructureAge
  if (age >= 0.8) return 'pre1940'
  if (age >= 0.6) return '1940-1970'
  if (age >= 0.4) return '1970-2000'
  return '2000+'
}

/* -------------------------------------------------------------------------- */
/*  Public                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build the full Signals object from a Mapbox feature. Pure & deterministic.
 *
 * The returned `signalKeys` is ordered by strength so the UI can show the
 * most informative ones first without additional sorting.
 */
export function buildSignals(feature: MapboxFeature): Signals {
  const ctx = feature.context ?? []
  const placeType = feature.place_type?.[0]
  const precision = derivePrecision(placeType)
  const addressType = deriveAddressType(placeType)

  const countryCtx = findContext(ctx, 'country')
  const regionCtx = findContext(ctx, 'region')
  const postcodeCtx = findContext(ctx, 'postcode')
  const placeCtx = findContext(ctx, 'place')

  const countryShort = countryCtx?.short_code?.toUpperCase()
  const countryCode: Signals['countryCode'] =
    countryShort === 'US' ? 'US' : countryShort === 'CA' ? 'CA' : 'OTHER'

  const regionCode = regionCtx?.short_code?.toLowerCase() ?? null
  const regionName = regionCtx?.text ?? null
  const postalCode = postcodeCtx?.text ?? null

  // Prefer the explicit `place` context; fall back to feature text for place_type=place
  const placeTextRaw =
    placeCtx?.text ?? (placeType === 'place' ? feature.text : null)
  const placeName = placeTextRaw ?? null
  const placeKey = placeTextRaw?.toLowerCase() ?? ''

  const prior = (regionCode && REGION_PRIORS[regionCode]) || DEFAULT_PRIOR
  const metro = METRO_ERAS[placeKey]

  const buildEra = deriveBuildEra(prior, metro?.era)
  const combinedSewerLikelihood = clamp01(metro?.combinedSewer ?? prior.combinedSewer)
  const infrastructureAge = clamp01(metro?.infrastructureAge ?? prior.infrastructureAge)
  const isUrbanCore = URBAN_CORES.has(placeKey)

  // Environmental exposures are region-scoped today; Tier-2 data replaces these.
  const freezeExposure = clamp01(prior.freeze)
  const droughtExposure = clamp01(prior.drought)
  const coastalExposure = clamp01(prior.coastal)
  const floodStormwaterExposure = clamp01(prior.flood)
  const hardWaterLikelihood = clamp01(prior.hardWater)

  // Region coverage decays if the precision is below street level or the
  // country is outside our US/CA coverage.
  let regionCoverage = prior.coverage
  if (precision === 'postcode') regionCoverage *= 0.9
  else if (precision === 'place') regionCoverage *= 0.7
  else if (precision === 'region' || precision === 'country') regionCoverage *= 0.4
  if (countryCode === 'OTHER') regionCoverage *= 0.35

  // Build the ordered signal-key list for the UI. Only include signals that
  // meaningfully moved the needle so the list stays honest.
  const signalKeys: string[] = []
  signalKeys.push(prior.signalKey)
  signalKeys.push(`era.${buildEra}`)
  if (combinedSewerLikelihood >= 0.6) signalKeys.push('combinedSewer')
  if (freezeExposure >= 0.7) signalKeys.push('freezeClimate')
  if (droughtExposure >= 0.7) signalKeys.push('droughtClimate')
  if (coastalExposure >= 0.6) signalKeys.push('coastalExposure')
  if (floodStormwaterExposure >= 0.6) signalKeys.push('floodExposure')
  if (hardWaterLikelihood >= 0.7) signalKeys.push('hardWater')
  if (isUrbanCore) signalKeys.push('urbanCore')
  if (addressType === 'commercial') signalKeys.push('commercialUse')
  if (addressType === 'residential') signalKeys.push('residentialUse')
  if (precision === 'street') signalKeys.push('streetLevelMatch')
  else if (precision === 'postcode') signalKeys.push('postalCodeMatch')
  else signalKeys.push('areaOnlyMatch')

  return {
    geocodePrecision: precision,
    countryCode,
    regionCode,
    regionName,
    postalCode,
    placeName,
    buildEra,
    addressType,
    isUrbanCore,
    freezeExposure,
    droughtExposure,
    coastalExposure,
    floodStormwaterExposure,
    hardWaterLikelihood,
    infrastructureAge,
    combinedSewerLikelihood,
    regionCoverage: clamp01(regionCoverage),
    signalCount: signalKeys.length,
    signalKeys,
  }
}
