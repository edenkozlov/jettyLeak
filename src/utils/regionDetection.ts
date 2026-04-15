/**
 * Region detection from a free-form address string.
 *
 * We default to Canada since that's the product's primary market. US gets
 * picked up when the address clearly contains a US state or zip. Anything
 * ambiguous falls back to Canada.
 */

export type Region = 'CA' | 'US' | 'GLOBAL'

// Canadian postal code: A1A 1A1 (space optional)
const CANADIAN_POSTAL_CODE = /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d\b/i

const CA_PROVINCES = [
  'ontario', 'quebec', 'british columbia', 'alberta', 'manitoba',
  'saskatchewan', 'nova scotia', 'new brunswick', 'newfoundland',
  'prince edward island', 'yukon', 'northwest territories', 'nunavut',
]

const CA_PROVINCE_ABBR = [
  ' ON ', ' QC ', ' BC ', ' AB ', ' MB ', ' SK ', ' NS ', ' NB ',
  ' NL ', ' PE ', ' YT ', ' NT ', ' NU ',
]

const US_STATES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina',
  'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
  'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas',
  'utah', 'vermont', 'virginia', 'washington', 'west virginia',
  'wisconsin', 'wyoming',
]

// US zip code: 5 digits, optionally with -4 extension
const US_ZIP = /\b\d{5}(-\d{4})?\b/

/**
 * Classify an address as Canada, US, or other.
 * Defaults to Canada when we can't tell.
 */
export function detectRegionFromAddress(address: string | null | undefined): Region {
  if (!address) return 'CA'
  const lower = address.toLowerCase()

  // Explicit country hits first
  if (lower.includes('canada')) return 'CA'
  if (lower.includes('united states') || lower.includes(', usa') || lower.endsWith(' usa') || lower.includes(', us')) return 'US'

  // Canadian postal code pattern is very distinctive
  if (CANADIAN_POSTAL_CODE.test(address)) return 'CA'

  // Provinces (full names)
  for (const p of CA_PROVINCES) {
    if (lower.includes(p)) return 'CA'
  }

  // Province abbreviations (with surrounding spaces to avoid false matches)
  const padded = ` ${address.toUpperCase()} `
  for (const abbr of CA_PROVINCE_ABBR) {
    if (padded.includes(abbr)) return 'CA'
  }

  // US states (full names)
  for (const s of US_STATES) {
    if (lower.includes(s)) return 'US'
  }

  // US zip code pattern (5 digits). Only trust this if we haven't already
  // matched a Canadian signal.
  if (US_ZIP.test(address)) return 'US'

  // Default — most of our users are in Canada
  return 'CA'
}

export function regionDisplayName(region: Region): string {
  if (region === 'CA') return 'Canada'
  if (region === 'US') return 'United States'
  return 'International'
}
