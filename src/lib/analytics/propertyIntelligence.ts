/**
 * Property Intelligence analytics.
 *
 * Fire-and-forget logging of every /property-intelligence search into
 * `public.property_intelligence_searches` for traffic, score-distribution,
 * and /quote-conversion analysis.
 *
 * The insert is RLS-gated to `anon` role (landing page is unauthenticated).
 * Migration lives at `supabase/migrations/007_property_intelligence_searches.sql`.
 *
 * Never blocks the UI — all failures are silenced.
 */

import { supabase } from '@/lib/supabase'
import type { MapboxFeature, PropertyScore } from '@/lib/scoring'

export type SearchSource = 'landing_hero' | 'intelligence_page'

const SESSION_STORAGE_KEY = 'beluga_pi_session'
const LAST_SEARCH_ID_KEY = 'beluga_pi_last_search_id'

/**
 * Stable per-browser session id, persisted in localStorage. Used so we can
 * attribute the /quote CTA click back to the search that produced it.
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let id = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(SESSION_STORAGE_KEY, id)
    }
    return id
  } catch {
    return 'no-storage'
  }
}

function findContext(feature: MapboxFeature, prefix: string) {
  return feature.context?.find((c) => c.id.startsWith(prefix))
}

/* eslint-disable no-console */

/**
 * Log a single search + scored result. Never throws, never awaits meaningfully
 * — always call it with `void logPropertySearch(...)`.
 */
export async function logPropertySearch(
  feature: MapboxFeature,
  score: PropertyScore,
  source: SearchSource,
): Promise<void> {
  console.log('[analytics] logPropertySearch called', {
    source,
    address: feature.place_name,
    overall: score.overall,
    supabaseReady: Boolean(supabase),
  })

  if (!supabase) {
    console.warn('[analytics] supabase client is null — env vars not loaded?')
    return
  }

  try {
    const [lng, lat] = feature.center
    const country = findContext(feature, 'country')
    const region = findContext(feature, 'region')
    const postcode = findContext(feature, 'postcode')
    const place = findContext(feature, 'place')

    const eraSignal = score.signalKeys.find((k) => k.startsWith('era.'))
    const buildEra = eraSignal ? eraSignal.slice('era.'.length) : null

    // Generate the row id client-side so we don't need to .select() it back
    // under RLS (anon has no SELECT policy).
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`

    const payload = {
      id,
      session_id: getSessionId(),
      search_source: source,
      locale:
        typeof document !== 'undefined'
          ? document.documentElement.lang || null
          : null,
      referrer:
        typeof document !== 'undefined' ? document.referrer || null : null,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent : null,

      mapbox_feature_id: feature.id,
      place_name: feature.place_name,
      primary_text: feature.text ?? null,
      place_type: feature.place_type?.[0] ?? null,
      latitude: lat,
      longitude: lng,
      country_code: country?.short_code?.toUpperCase() ?? null,
      region_code: region?.short_code?.toUpperCase() ?? null,
      region_name: region?.text ?? null,
      postal_code: postcode?.text ?? null,
      city: place?.text ?? null,

      overall_score: score.overall,
      band: score.band,
      confidence: score.confidence,
      category_scores: score.categories,
      signal_keys: score.signalKeys,
      build_era: buildEra,
    }

    const { error } = await supabase
      .from('property_intelligence_searches')
      .insert(payload)

    if (error) {
      console.warn('[analytics] insert failed', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return
    }
    console.log('[analytics] insert ok — id =', id)
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(LAST_SEARCH_ID_KEY, id)
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn('[analytics] logPropertySearch threw', e)
  }
}

/**
 * Mark the most recent search from this session as having clicked through to
 * /quote. Fire-and-forget.
 */
export async function markQuoteClicked(): Promise<void> {
  if (!supabase) return
  if (typeof window === 'undefined') return
  try {
    const id = window.sessionStorage.getItem(LAST_SEARCH_ID_KEY)
    if (!id) return
    await supabase
      .from('property_intelligence_searches')
      .update({ clicked_quote: true, clicked_quote_at: new Date().toISOString() })
      .eq('id', id)
  } catch {
    /* ignore */
  }
}
