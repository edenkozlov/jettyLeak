/**
 * Beluga Property Intelligence — scoring engine (v2).
 *
 * Deterministic. No RNG. No network. Sub-millisecond.
 * See `./README.md` for architecture and data-source roadmap.
 */

export { estimatePropertyScore, debugSignals } from './scoreEngine'
export type {
  CategoryKey,
  CategoryScore,
  MapboxFeature,
  MapboxFeatureContext,
  PropertyScore,
  ScoreBand,
  Signals,
  GeocodePrecision,
  BuildEra,
  AddressType,
} from './types'
