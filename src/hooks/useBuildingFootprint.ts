import { useCallback, useEffect, useState } from 'react'

import { logger } from '@/utils/logger/logger'

export interface FootprintCoordinate {
  lat: number
  lon: number
}

export interface BuildingFootprint {
  id: number
  coordinates: FootprintCoordinate[]
}

interface OverpassElement {
  type: string
  id: number
  geometry?: Array<{ lat: number; lon: number }>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

export function useBuildingFootprint(
  latitude: number | null,
  longitude: number | null,
) {
  const [footprints, setFootprints] = useState<BuildingFootprint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFootprint = useCallback(async () => {
    if (latitude == null || longitude == null) return

    setLoading(true)
    setError(null)

    try {
      const query = `[out:json];way["building"](around:30,${latitude},${longitude});out geom;`
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`)
      }

      const data: OverpassResponse = await response.json()

      const all = data.elements
        .filter(
          (el): el is OverpassElement & { geometry: Array<{ lat: number; lon: number }> } =>
            el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 0,
        )
        .map((el) => ({
          id: el.id,
          coordinates: el.geometry.map((g) => ({ lat: g.lat, lon: g.lon })),
        }))

      // Pick the closest building by comparing centroid distance to the target
      if (all.length > 1) {
        all.sort((a, b) => {
          const distA = centroidDistance(a.coordinates, latitude, longitude)
          const distB = centroidDistance(b.coordinates, latitude, longitude)
          return distA - distB
        })
      }

      setFootprints(all.slice(0, 1))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch footprint'
      logger.error('OVERPASS', message, err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [latitude, longitude])

  useEffect(() => {
    fetchFootprint()
  }, [fetchFootprint])

  return {
    footprints,
    loading,
    error,
  }
}

function centroidDistance(
  coords: FootprintCoordinate[],
  lat: number,
  lon: number,
): number {
  const cLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length
  const cLon = coords.reduce((s, c) => s + c.lon, 0) / coords.length
  return (cLat - lat) ** 2 + (cLon - lon) ** 2
}

export default useBuildingFootprint
