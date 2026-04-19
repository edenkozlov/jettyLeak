import { useCallback, useEffect, useRef, useState } from 'react'
import Map, { Marker, type MapRef } from 'react-map-gl/mapbox'
import type { Map as MapboxMap } from 'mapbox-gl'

import { MAPBOX_TOKEN } from '@/globals/constants'

/* eslint-disable no-console */
const DEBUG = true
const log = (...args: unknown[]) => {
  if (DEBUG) console.log('[PropertyMap]', ...args)
}

interface PropertyMapProps {
  latitude?: number
  longitude?: number
  active?: boolean
  className?: string
  /** Kept for API compat; currently no-op. */
  idle?: boolean
  /** Map style variant. */
  styleVariant?: 'streets' | 'light'
  /** Pixels occluded on each side by overlay UI (e.g. a side panel). */
  occludedPadding?: { top?: number; right?: number; bottom?: number; left?: number }
}

const DEFAULT_CENTER = {
  longitude: -73.5673,
  latitude: 45.5017,
  zoom: 14.2,
  pitch: 55,
  bearing: -18,
}

const FLY_ZOOM = 18.5
const FLY_PITCH = 58
const FLY_BEARING = -18
const FLY_DURATION = 2200

const BUILDING_SOURCE = 'composite'
const BUILDING_SOURCE_LAYER = 'building'
const BUILDING_LAYER_ID = 'intel-3d-buildings'

export function PropertyMap({
  latitude,
  longitude,
  active = false,
  className = '',
  idle: _idle = false,
  styleVariant = 'streets',
  occludedPadding,
}: PropertyMapProps) {
  void _idle
  const mapRef = useRef<MapRef>(null)
  const paddingRef = useRef(occludedPadding)
  paddingRef.current = occludedPadding
  const selectedIdRef = useRef<number | string | null>(null)
  /** Coordinates we want to fly to but haven't been able to yet (map not loaded). */
  const pendingRef = useRef<[number, number] | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mapStyle =
    styleVariant === 'streets'
      ? 'mapbox://styles/mapbox/streets-v12'
      : 'mapbox://styles/mapbox/light-v11'

  /* -------------------------------------------------------------------------- */
  /*  Building layer install + highlight                                         */
  /* -------------------------------------------------------------------------- */

  const installBuildingLayer = useCallback((map: MapboxMap) => {
    if (map.getLayer(BUILDING_LAYER_ID)) return
    let labelLayerId: string | undefined
    for (const layer of map.getStyle().layers ?? []) {
      if (
        layer.type === 'symbol' &&
        (layer.layout as Record<string, unknown> | undefined)?.['text-field']
      ) {
        labelLayerId = layer.id
        break
      }
    }
    try {
      map.addLayer(
        {
          id: BUILDING_LAYER_ID,
          source: BUILDING_SOURCE,
          'source-layer': BUILDING_SOURCE_LAYER,
          filter: ['!=', ['get', 'underground'], 'true'],
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              '#0ea5e9',
              [
                'interpolate', ['linear'], ['zoom'],
                14, '#dbeafe',
                16, '#cbd5e1',
                18, '#94a3b8',
              ],
            ],
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['zoom'],
              14, 0,
              15.05, ['coalesce', ['get', 'height'], 6],
            ],
            'fill-extrusion-base': [
              'interpolate', ['linear'], ['zoom'],
              14, 0,
              15.05, ['coalesce', ['get', 'min_height'], 0],
            ],
            'fill-extrusion-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.95,
              0.75,
            ],
          },
        },
        labelLayerId,
      )
      log('installBuildingLayer ok')
    } catch (err) {
      log('installBuildingLayer failed', err)
    }
  }, [])

  const clearSelected = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    if (selectedIdRef.current == null) return
    try {
      map.setFeatureState(
        { source: BUILDING_SOURCE, sourceLayer: BUILDING_SOURCE_LAYER, id: selectedIdRef.current },
        { selected: false },
      )
    } catch {
      /* ignore */
    }
    selectedIdRef.current = null
  }, [])

  /** Returns true if a building was found and highlighted. */
  const highlightBuildingAt = useCallback((map: MapboxMap, lng: number, lat: number): boolean => {
    if (!map.getLayer(BUILDING_LAYER_ID)) return false
    const pt = map.project([lng, lat])
    for (const r of [8, 16, 28, 48]) {
      const box: [[number, number], [number, number]] = [
        [pt.x - r, pt.y - r],
        [pt.x + r, pt.y + r],
      ]
      let feats
      try {
        feats = map.queryRenderedFeatures(box, { layers: [BUILDING_LAYER_ID] })
      } catch {
        return false
      }
      const f = feats.find((x) => x.id != null)
      if (f && f.id != null) {
        if (selectedIdRef.current != null && selectedIdRef.current !== f.id) {
          clearSelected()
        }
        selectedIdRef.current = f.id
        try {
          map.setFeatureState(
            { source: BUILDING_SOURCE, sourceLayer: BUILDING_SOURCE_LAYER, id: f.id },
            { selected: true },
          )
        } catch {
          return false
        }
        log('highlighted building', { id: f.id, radiusUsed: r })
        return true
      }
    }
    return false
  }, [clearSelected])

  /* -------------------------------------------------------------------------- */
  /*  Fly-to — the core interaction                                              */
  /* -------------------------------------------------------------------------- */

  const flyToAndHighlight = useCallback(
    (map: MapboxMap, lng: number, lat: number) => {
      installBuildingLayer(map)
      const pad = paddingRef.current ?? {}
      log('flyTo →', { lng, lat, pad })
      map.flyTo({
        center: [lng, lat],
        zoom: FLY_ZOOM,
        pitch: FLY_PITCH,
        bearing: FLY_BEARING,
        duration: FLY_DURATION,
        curve: 1.42,
        essential: true,
        padding: {
          top: pad.top ?? 0,
          right: pad.right ?? 0,
          bottom: pad.bottom ?? 0,
          left: pad.left ?? 0,
        },
      })

      // Poll for the building — z18 tiles keep streaming past moveend, so
      // queryRenderedFeatures often returns 0 on the first try.
      const deadline = Date.now() + 4000
      let cancelled = false
      let timer: number | null = null
      const poll = () => {
        if (cancelled) return
        if (highlightBuildingAt(map, lng, lat)) return
        if (Date.now() > deadline) return
        timer = window.setTimeout(poll, 150)
      }
      const onMoveEnd = () => {
        log('flyTo moveend — starting poll')
        poll()
      }
      const onIdle = () => {
        highlightBuildingAt(map, lng, lat)
      }
      map.once('moveend', onMoveEnd)
      map.on('idle', onIdle)
      poll()

      return () => {
        cancelled = true
        if (timer != null) window.clearTimeout(timer)
        map.off('moveend', onMoveEnd)
        map.off('idle', onIdle)
      }
    },
    [installBuildingLayer, highlightBuildingAt],
  )

  const flyRef = useRef(flyToAndHighlight)
  flyRef.current = flyToAndHighlight

  /**
   * onLoad — fires when the map's style finishes loading. Installs our layer,
   * wires the style.load listener (for future style swaps), and fires any
   * pending fly-to request that came in before the map was ready.
   */
  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    log('onLoad fired')
    installBuildingLayer(map)
    map.on('style.load', () => {
      log('style.load — reinstalling building layer')
      installBuildingLayer(map)
    })
    const pending = pendingRef.current
    if (pending) {
      log('onLoad draining pending flyTo', pending)
      pendingRef.current = null
      flyRef.current(map, pending[0], pending[1])
    }
  }, [installBuildingLayer])

  /**
   * The main effect: when latitude/longitude changes, fly. If the map isn't
   * fully loaded yet, stash the intent and let `onLoad` handle it.
   */
  useEffect(() => {
    if (latitude == null || longitude == null) {
      clearSelected()
      pendingRef.current = null
      return
    }
    const map = mapRef.current?.getMap()
    if (map && map.isStyleLoaded()) {
      return flyToAndHighlight(map, longitude, latitude)
    }
    log('map not loaded yet — stashing pending flyTo', [longitude, latitude])
    pendingRef.current = [longitude, latitude]
    return () => {
      // If this effect re-runs before onLoad fires, drop the pending intent
      // (next render will write its own).
      pendingRef.current = null
    }
  }, [latitude, longitude, flyToAndHighlight, clearSelected])

  /* -------------------------------------------------------------------------- */
  /*  Error banner                                                               */
  /* -------------------------------------------------------------------------- */

  const onError = useCallback((e: { error?: { message?: string } }) => {
    const msg = e?.error?.message ?? 'Unknown map error'
    if (msg.includes(BUILDING_LAYER_ID) || msg.includes('does not exist in the map')) {
      log('onError (silenced)', msg)
      return
    }
    log('onError', msg, e)
    setErrorMsg(msg)
  }, [])

  /* -------------------------------------------------------------------------- */
  /*  Render                                                                     */
  /* -------------------------------------------------------------------------- */

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {!MAPBOX_TOKEN ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-rose-50 px-6 text-center text-[13px] font-semibold text-rose-700">
          Mapbox token is missing (VITE_MAPBOX_TOKEN). Check .env and restart dev server.
        </div>
      ) : null}
      {errorMsg ? (
        <div className="absolute inset-x-0 top-0 z-20 bg-rose-600/90 px-4 py-2 text-center text-[12px] font-medium text-white">
          Map error: {errorMsg}
        </div>
      ) : null}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={onLoad}
        onError={onError}
        initialViewState={{
          longitude: DEFAULT_CENTER.longitude,
          latitude: DEFAULT_CENTER.latitude,
          zoom: DEFAULT_CENTER.zoom,
          pitch: DEFAULT_CENTER.pitch,
          bearing: DEFAULT_CENTER.bearing,
        }}
        mapStyle={mapStyle}
        attributionControl={false}
        dragRotate
        pitchWithRotate
        scrollZoom={active}
        dragPan={active}
        doubleClickZoom={active}
        touchZoomRotate={active}
        style={{ width: '100%', height: '100%', minHeight: 400 }}
      >
        {latitude != null && longitude != null ? (
          <Marker longitude={longitude} latitude={latitude} anchor="bottom">
            <MapPin />
          </Marker>
        ) : null}
      </Map>
    </div>
  )
}

function MapPin() {
  return (
    <div className="relative -translate-y-1 animate-[fade-scale_0.45s_ease-out_both]">
      <div
        className="absolute -bottom-1 left-1/2 h-3 w-6 -translate-x-1/2 rounded-full bg-sky-900/40 blur-md"
        aria-hidden
      />
      <div className="relative flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-sky-400/30 animate-ping" aria-hidden />
        <span className="absolute inset-1 rounded-full bg-sky-500/20" aria-hidden />
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow-lg shadow-sky-500/40">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </div>
    </div>
  )
}
