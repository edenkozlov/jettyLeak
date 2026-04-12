import { useCallback, useMemo, useRef, useState } from 'react'
import Map, { type MapRef } from 'react-map-gl/mapbox'

import { useTheme } from '@/contexts/ThemeContext'
import { MAPBOX_TOKEN } from '@/globals/constants'
import type { BuildingFootprint } from '@/hooks/useBuildingFootprint'

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const ctx =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return ctx != null
  } catch {
    return false
  }
}

interface BuildingMap3DProps {
  latitude: number
  longitude: number
  className?: string
  savedFootprint?: Array<{ lat: number; lon: number }> | null
  onBuildingSelect?: (footprint: BuildingFootprint) => void
}

export default function BuildingMap3D({
  latitude,
  longitude,
  className = '',
  savedFootprint,
  onBuildingSelect,
}: BuildingMap3DProps) {
  const mapRef = useRef<MapRef>(null)
  const onBuildingSelectRef = useRef(onBuildingSelect)
  onBuildingSelectRef.current = onBuildingSelect
  const savedFootprintRef = useRef(savedFootprint)
  savedFootprintRef.current = savedFootprint
  const { mode } = useTheme()
  const [webglError, setWebglError] = useState(false)
  const [webglSupported] = useState(() => isWebGLAvailable())

  const mapStyle =
    mode === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11'

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const layers = map.getStyle().layers

    // Find the first symbol layer to insert 3D buildings beneath labels
    let labelLayerId: string | undefined
    if (layers) {
      for (const layer of layers) {
        if (
          layer.type === 'symbol' &&
          (layer.layout as Record<string, unknown>)?.['text-field']
        ) {
          labelLayerId = layer.id
          break
        }
      }
    }

    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      },
      labelLayerId,
    )

    // Highlight layer for selected building
    map.addSource('selected-building', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    map.addLayer({
      id: 'selected-building-highlight',
      type: 'fill-extrusion',
      source: 'selected-building',
      paint: {
        'fill-extrusion-color': '#6366f1',
        'fill-extrusion-height': ['coalesce', ['get', 'height'], 20],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.8,
      },
    })

    // Restore saved highlight
    const saved = savedFootprintRef.current
    if (saved && saved.length > 0) {
      const ring = saved.map((c) => [c.lon, c.lat])
      // Close the ring if not already closed
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        ring.push([...first])
      }
      const source = map.getSource('selected-building')
      if (source && 'setData' in source) {
        ;(source as { setData: (data: GeoJSON.GeoJSON) => void }).setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [ring] },
              properties: {},
            },
          ],
        })
      }
    }

    // Pointer cursor on hover
    map.on('mouseenter', '3d-buildings', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', '3d-buildings', () => {
      map.getCanvas().style.cursor = ''
    })

    // Click to select building
    map.on('click', '3d-buildings', (e) => {
      if (!e.features || e.features.length === 0) return
      const feature = e.features[0]!

      // Update highlight
      const source = map.getSource('selected-building')
      if (source && 'setData' in source) {
        ;(source as { setData: (data: GeoJSON.GeoJSON) => void }).setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: feature.geometry,
              properties: feature.properties,
            },
          ],
        })
      }

      // Extract footprint coordinates
      const geom = feature.geometry
      if (geom.type === 'Polygon') {
        const ring = (geom as GeoJSON.Polygon).coordinates[0]
        if (ring) {
          onBuildingSelectRef.current?.({
            id: typeof feature.id === 'number' ? feature.id : Date.now(),
            coordinates: ring.map((coord) => ({
              lat: coord[1]!,
              lon: coord[0]!,
            })),
          })
        }
      }
    })
  }, [])

  // Center on saved footprint centroid if available
  const center = useMemo(() => {
    if (savedFootprint && savedFootprint.length > 0) {
      const avgLat =
        savedFootprint.reduce((s, c) => s + c.lat, 0) / savedFootprint.length
      const avgLon =
        savedFootprint.reduce((s, c) => s + c.lon, 0) / savedFootprint.length
      return { latitude: avgLat, longitude: avgLon }
    }
    return { latitude, longitude }
  }, [savedFootprint, latitude, longitude])

  const staticFallbackUrl = useMemo(() => {
    if (!MAPBOX_TOKEN) return null
    const { latitude: lat, longitude: lng } = center
    return (
      `https://api.mapbox.com/styles/v1/mapbox/${mode === 'dark' ? 'dark-v11' : 'light-v11'}/static/` +
      `${lng},${lat},17,60,-17.6/600x400@2x?access_token=${MAPBOX_TOKEN}`
    )
  }, [center, mode])

  const onMapError = useCallback(() => {
    setWebglError(true)
  }, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${className}`}
      >
        <p className="text-sm text-gray-400">Mapbox token not configured</p>
      </div>
    )
  }

  if (!webglSupported || webglError) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
      >
        {staticFallbackUrl ? (
          <img
            src={staticFallbackUrl}
            alt="Building location"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
            <p className="text-sm text-gray-400">3D view unavailable</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
          Static view — WebGL not available
        </div>
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: center.latitude,
          longitude: center.longitude,
          zoom: 17,
          pitch: 60,
          bearing: -17.6,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onLoad={onLoad}
        onError={onMapError}
        antialias
      />
    </div>
  )
}
