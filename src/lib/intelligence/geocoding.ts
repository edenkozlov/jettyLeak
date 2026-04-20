import { MAPBOX_TOKEN } from '@/globals/constants'
import type { MapboxFeature } from '@/lib/scoring'

/**
 * Thin wrapper over the Mapbox Geocoding v5 `/mapbox.places` endpoint.
 *
 * Structured as a single function so we can later swap in the newer
 * Search Box API (or a Beluga backend proxy) without touching UI code.
 */
export interface SearchOptions {
  signal?: AbortSignal
  limit?: number
  /** ISO country codes, comma-separated. Defaults to US + CA for Beluga's markets. */
  countries?: string
  /** `lng,lat` proximity bias. */
  proximity?: string
  language?: string
}

const DEFAULT_PROXIMITY = '-73.5673,45.5017' // Montreal HQ

export async function searchAddresses(
  query: string,
  opts: SearchOptions = {},
): Promise<MapboxFeature[]> {
  const q = query.trim()
  if (q.length < 3 || !MAPBOX_TOKEN) return []

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    autocomplete: 'true',
    limit: String(opts.limit ?? 6),
    types: 'address,postcode,place,locality,neighborhood',
    country: opts.countries ?? 'us,ca',
    proximity: opts.proximity ?? DEFAULT_PROXIMITY,
    language: opts.language ?? 'en',
  })

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`

  const res = await fetch(url, { signal: opts.signal })
  if (!res.ok) return []
  const data = (await res.json()) as { features?: MapboxFeature[] }
  return data.features ?? []
}
