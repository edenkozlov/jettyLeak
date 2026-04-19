/**
 * Rough building geometry helpers.
 *
 * We only have a lat/lon polygon footprint and a number of floors — no sqft in
 * the DB — so any "floor area" we report is explicitly an estimate based on the
 * footprint × floors. Used for the BOMA-style water intensity benchmark.
 */

export interface LatLon {
  lat: number
  lon: number
}

/** Accept multiple polygon input shapes: {lat,lon}, {latitude,longitude}, [lng,lat]. */
function toLatLon(raw: unknown): LatLon | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    // GeoJSON style: [lng, lat]
    const lng = Number(raw[0])
    const lat = Number(raw[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) return { lat, lon: lng }
    return null
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const lat = Number(obj.lat ?? obj.latitude)
    const lon = Number(obj.lon ?? obj.lng ?? obj.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
  }
  return null
}

/**
 * Shoelace formula on a lat/lon polygon, using a local equirectangular
 * projection around the first vertex. Good to ~1% for buildings under a few
 * hundred metres, which is all we need.
 *
 * Accepts multiple raw polygon shapes (plain {lat,lon}, {latitude,longitude},
 * or GeoJSON [lng,lat] tuples). Returns 0 for any degenerate or unrecognized
 * input so a malformed footprint never crashes the page.
 */
export function polygonAreaM2(coords: unknown): number {
  if (!Array.isArray(coords) || coords.length < 3) return 0

  const pts: LatLon[] = []
  for (const raw of coords) {
    const p = toLatLon(raw)
    if (p) pts.push(p)
  }
  if (pts.length < 3) return 0

  const refLat = (pts[0]!.lat * Math.PI) / 180
  const metersPerDegLat = 110_574
  const metersPerDegLon = 111_320 * Math.cos(refLat)

  const proj = pts.map((c) => ({
    x: c.lon * metersPerDegLon,
    y: c.lat * metersPerDegLat,
  }))

  let area = 0
  for (let i = 0; i < proj.length; i++) {
    const a = proj[i]!
    const b = proj[(i + 1) % proj.length]!
    area += a.x * b.y - b.x * a.y
  }
  return Math.abs(area / 2)
}

/**
 * Estimated total usable floor area for the building: footprint × floors.
 * Returns `null` when we don't have enough geometry to make even a rough guess.
 */
export function estimateFloorAreaM2(
  footprint: unknown,
  numberOfFloors: number | null | undefined,
): number | null {
  const area = polygonAreaM2(footprint)
  if (area <= 0) return null
  const floors = Math.max(1, Math.floor(numberOfFloors ?? 1))
  return area * floors
}
