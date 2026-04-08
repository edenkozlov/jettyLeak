import type { WaterAlert, WaterAlertGeometry, WaterAlertStats } from '@/types'

const GEOJSON_DIRECT =
  'https://donnees.montreal.ca/dataset/556c84af-aebf-4ca9-9a9c-2f246601674c/resource/d249e452-46f5-422f-91ae-898c98eea6cc/download/avis-alertes.geojson'

// In dev, Vite proxies this to avoid CORS issues
const GEOJSON_PROXY = '/api/montreal-feed/avis-alertes.geojson'

const GEOJSON_URL = import.meta.env.DEV ? GEOJSON_PROXY : GEOJSON_DIRECT

const WATER_TYPES = ['Eau et aqueduc']
const WATER_KEYWORDS = ['eau', 'ébullition', 'ebullition', 'aqueduc']

const RESOLVED_PREFIXES = ['fin de', 'réouverture', 'reouverture', 'annulé', 'annule', 'annulation']

interface FeedFeature {
  type: 'Feature'
  properties: {
    titre: string
    date_debut: string
    date_fin: string
    type: string
    service_publieur: string
    lien: string
  }
  geometry: { type: string; coordinates: unknown }
}

interface FeedCollection {
  type: 'FeatureCollection'
  features: FeedFeature[]
}

// ── Borough extraction (lightweight client-side version) ───────────────

const BOROUGH_RE =
  /(?:arrondissement\s+(?:de\s+|d['''])?|arr\.?\s+(?:de\s+|d['''])?)([\w\u00C0-\u024F][\w\u00C0-\u024F/–\-\s]*)/i

const KNOWN_BOROUGHS = [
  'Ahuntsic-Cartierville', 'Anjou', 'Côte-des-Neiges–Notre-Dame-de-Grâce',
  'CDN/NDG', 'Lachine', 'LaSalle', 'Le Plateau-Mont-Royal', 'Le Sud-Ouest',
  "L'Île-Bizard–Sainte-Geneviève", 'Mercier–Hochelaga-Maisonneuve',
  'Montréal-Nord', 'Outremont', 'Pierrefonds-Roxboro',
  'Rivière-des-Prairies–Pointe-aux-Trembles', 'Rosemont–La Petite-Patrie',
  'Saint-Laurent', 'Saint-Léonard', 'Verdun', 'Ville-Marie',
  'Villeray–Saint-Michel–Parc-Extension',
]

function extractBorough(title: string): string | null {
  const m = BOROUGH_RE.exec(title)
  if (m) return m[1]!.replace(/,.*$/, '').trim()

  for (const b of KNOWN_BOROUGHS) {
    if (title.includes(b)) return b
  }
  return null
}

// ── Status derivation ──────────────────────────────────────────────────

// Water cuts resolve in hours; boil advisories in a few days.
// The city publishes a "Fin de" notice when resolved, but we also
// age-out alerts that are past a reasonable TTL.
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000       // 48 h for normal water alerts
const BOIL_ADVISORY_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 d for boil water advisories

const BOIL_KEYWORDS = ['ébullition', 'ebullition', 'boil']

function deriveStatus(title: string, startAt: string | null): WaterAlert['status'] {
  const lower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (RESOLVED_PREFIXES.some((p) => lower.startsWith(p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
    return 'expired'
  }

  if (startAt) {
    const start = new Date(startAt)
    const now = Date.now()

    if (start.getTime() > now) return 'upcoming'

    const age = now - start.getTime()
    const isBoilAdvisory = BOIL_KEYWORDS.some((kw) => lower.includes(kw))
    const ttl = isBoilAdvisory ? BOIL_ADVISORY_TTL_MS : DEFAULT_TTL_MS

    if (age > ttl) return 'expired'
    return 'active'
  }

  return 'unknown'
}

// ── Slug extraction ────────────────────────────────────────────────────

function extractSlug(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? url
  } catch {
    const idx = url.lastIndexOf('/')
    return idx >= 0 ? url.slice(idx + 1) : url
  }
}

// ── Title translation (FR → EN) ───────────────────────────────────────

// Ordered longest-first so longer phrases match before shorter substrings
const TITLE_PHRASES: [RegExp, string][] = [
  [/^Fin de l['']avis pr[ée]ventif d['']?[ée]bullition de l['']eau/i, 'End of preventive boil water advisory'],
  [/^Fin de la coupure d['']eau/i, 'End of water service interruption'],
  [/^Avis pr[ée]ventif d['']?[ée]bullition d['']eau/i, 'Preventive boil water advisory'],
  [/^Interruption temporaire de l['']alimentation en eau/i, 'Temporary water supply interruption'],
  [/^Rin[çc]age du r[ée]seau d['']eau et inspection des bornes fontaines/i, 'Water system flushing & hydrant inspection'],
  [/^Coupure d['']eau/i, 'Water service interruption'],
  [/^MISE [ÀA] JOUR\s*[–\-]\s*/i, 'UPDATE – '],
  [/^PROLONGATION\s*[–\-]\s*/i, 'EXTENSION – '],
  [/^ANNUL[ÉE]\s*[–\-]\s*/i, 'CANCELLED – '],
  [/^ANNULATION\s*[–\-]\s*/i, 'CANCELLATION – '],
  [/^REPORT[ÉE]E?\s*[–\-]\s*/i, 'POSTPONED – '],
  [/^R[ée]ouverture/i, 'Reopening'],
  [/^ERRATUM\s*[–\-]\s*/i, 'ERRATUM – '],
]

const CONNECTOR_PHRASES: [RegExp, string][] = [
  [/,?\s*arrondissement\s+(?:de\s+|d['']|du\s+)/gi, ', '],
  [/,?\s*arr\.?\s+(?:de\s+|d[''])/gi, ', '],
  [/\s+entre\s+(les?\s+)?/gi, ', between '],
  [/\s+et\s+(la\s+|le\s+|les\s+|l[''])?/gi, ' and '],
  [/,\s*le\s+\d{2}\/\d{2}\/\d{4}/gi, ''],  // remove inline dates like ", le 26/03/2026"
  [/\s*[–\-]\s*[Dd]irection\s+[Nn]ord/gi, ' – northbound'],
  [/\s*[–\-]\s*[Dd]irection\s+[Ss]ud/gi, ' – southbound'],
  [/\s*[–\-]\s*[Dd]irection\s+[Ee]st/gi, ' – eastbound'],
  [/\s*[–\-]\s*[Dd]irection\s+[Oo]uest/gi, ' – westbound'],
]

function translateTitle(frTitle: string): string {
  let title = frTitle

  // Apply prefix phrase replacements (first match wins)
  for (const [re, en] of TITLE_PHRASES) {
    if (re.test(title)) {
      title = title.replace(re, en)
      break
    }
  }

  // Apply connector translations
  for (const [re, en] of CONNECTOR_PHRASES) {
    title = title.replace(re, en as string)
  }

  return title.replace(/\s{2,}/g, ' ').trim()
}

/** Keep the original French URL — montreal.ca doesn't serve English pages
 *  for alert slugs, so the /en/alerts/ rewrite results in 404s. */
function toEnglishUrl(frUrl: string): string {
  return frUrl
}

const CATEGORY_MAP: Record<string, string> = {
  'Eau et aqueduc': 'Water & waterworks',
  'Urgence': 'Urgent',
}

// ── Filter helpers ─────────────────────────────────────────────────────

function isWaterRelated(f: FeedFeature): boolean {
  if (WATER_TYPES.includes(f.properties.type)) return true
  if (f.properties.type === 'Urgence') {
    const lower = f.properties.titre.toLowerCase()
    return WATER_KEYWORDS.some((kw) => lower.includes(kw))
  }
  return false
}

function isValidGeometry(geom: FeedFeature['geometry']): boolean {
  if (!geom?.coordinates) return false
  if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates as number[]
    return !(lng === 0 && lat === 0)
  }
  return true
}

// ── Public API ─────────────────────────────────────────────────────────

let _cache: { alerts: WaterAlert[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function fetchLiveWaterAlerts(): Promise<WaterAlert[]> {
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.alerts
  }

  const resp = await fetch(GEOJSON_URL)
  if (!resp.ok) throw new Error(`Feed fetch failed: ${resp.status}`)
  const feed: FeedCollection = await resp.json()

  const waterFeatures = feed.features.filter(isWaterRelated)

  const now = new Date().toISOString()
  const alerts: WaterAlert[] = waterFeatures.map((f, idx) => {
    const p = f.properties
    const slug = extractSlug(p.lien)
    const borough = extractBorough(p.titre)
    const geometry = isValidGeometry(f.geometry)
      ? (f.geometry as WaterAlertGeometry)
      : null
    const status = deriveStatus(p.titre, p.date_debut)

    return {
      id: idx + 1,
      source_slug: slug,
      source_url: toEnglishUrl(p.lien),
      title: translateTitle(p.titre),
      category: CATEGORY_MAP[p.type] ?? p.type,
      borough,
      status,
      published_at: p.date_debut,
      alert_start_at: p.date_debut,
      alert_end_at: null,
      affected_area_text: null,
      reason_text: null,
      detail_text_raw: null,
      geometry_json: geometry,
      geometry_type: geometry?.type ?? null,
      first_seen_at: p.date_debut,
      last_seen_at: now,
      last_synced_at: now,
      enrichment_status: 'live',
      created_at: p.date_debut,
      updated_at: now,
    }
  })

  alerts.sort(
    (a, b) =>
      new Date(b.published_at ?? 0).getTime() -
      new Date(a.published_at ?? 0).getTime(),
  )

  _cache = { alerts, fetchedAt: Date.now() }
  return alerts
}

export function computeStatsFromAlerts(alerts: WaterAlert[]): WaterAlertStats {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  const activeCount = alerts.filter((a) => a.status === 'active').length
  const last7 = alerts.filter(
    (a) => a.published_at && new Date(a.published_at).getTime() >= sevenDaysAgo,
  ).length
  const boroughSet = new Set(
    alerts.filter((a) => a.status === 'active' && a.borough).map((a) => a.borough!),
  )

  return {
    active_count: activeCount,
    last_7_days_count: last7,
    boroughs_affected: boroughSet.size,
    last_sync_at: new Date().toISOString(),
  }
}

export function extractBoroughsFromAlerts(alerts: WaterAlert[]): string[] {
  const set = new Set<string>()
  for (const a of alerts) {
    if (a.borough) set.add(a.borough)
  }
  return [...set].sort()
}
