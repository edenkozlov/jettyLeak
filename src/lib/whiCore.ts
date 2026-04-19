/**
 * Local stub for the canonical WHI computation that lived in the (unshipped)
 * `@beluga/core` package. Preserves the call signature used by the consumer so
 * the web app builds without that private dependency.
 *
 * Returns `score: null` ("unknown") — the consumer already gracefully renders
 * that state. Replace with the real implementation when `@beluga/core` is
 * either published or inlined into this repo.
 */

export interface WhiInput {
  monthLitres: number
  footprint?: unknown
  numberOfFloors?: number | null
  totalSqft?: number | null
  thisWeek?: number
  lastWeek?: number
  leak?: { score?: number | null } | null
}

export interface WhiResult {
  score: number | null
}

export function computeWHI(_input: WhiInput): WhiResult {
  return { score: null }
}
