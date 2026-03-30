import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import MapGL, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

import LiveFlowIndicator from '@/components/LiveFlowIndicator'
import { useTheme } from '@/contexts/ThemeContext'
import { useBuildingsPage } from '@/hooks/useBuildingsPage'
import { useAppSelector } from '@/hooks/useAppSelector'
import { prefetchBuilding } from '@/utils/prefetchBuilding'
import type { Building } from '@/types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const MONTREAL = { latitude: 45.5017, longitude: -73.5673 }
const DEFAULT_ZOOM = 11.5

const STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12'
const STYLE_DARK = 'mapbox://styles/mapbox/dark-v11'

const PRIMARY = '#0ea5e9'

// ---------------------------------------------------------------------------
// BHI helpers
// ---------------------------------------------------------------------------

const BHI_COLORS: Record<string, string> = {
  healthy: '#10b981',
  watch: '#f59e0b',
  investigate: '#f97316',
  critical: '#ef4444',
}

const BHI_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  investigate: 'Investigate',
  critical: 'Critical',
}

function pinColor(b: Building): string {
  return BHI_COLORS[b.bhi_label ?? ''] ?? PRIMARY
}

// ---------------------------------------------------------------------------
// Custom pin marker
// ---------------------------------------------------------------------------

function PinMarker({
  building,
  isSelected,
  onClick,
}: {
  building: Building
  isSelected: boolean
  onClick: () => void
}) {
  const color = pinColor(building)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="group relative flex cursor-pointer flex-col items-center outline-none"
      style={{ transform: isSelected ? 'scale(1.25)' : 'scale(1)', transition: 'transform 180ms cubic-bezier(.4,0,.2,1)' }}
    >
      <div
        className="absolute bottom-0 h-2 w-5 rounded-full opacity-25 blur-[3px]"
        style={{ backgroundColor: color }}
      />
      <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={`ds-${building.id}`} x="-25%" y="-10%" width="150%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={color} floodOpacity="0.35" />
          </filter>
          <linearGradient id={`g-${building.id}`} x1="16" y1="0" x2="16" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor={color} />
            <stop offset="1" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          filter={`url(#ds-${building.id})`}
          d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z"
          fill={`url(#g-${building.id})`}
        />
        <circle cx="16" cy="15" r="6.5" fill="#fff" fillOpacity="0.95" />
        <circle cx="16" cy="15" r="3.5" fill={color} fillOpacity="0.55" />
      </svg>
      {isSelected && (
        <div
          className="absolute -inset-1 -z-10 animate-ping rounded-full opacity-20"
          style={{ backgroundColor: color }}
        />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Popup card
// ---------------------------------------------------------------------------

function PopupContent({
  building,
  onViewMore,
}: {
  building: Building
  onViewMore: () => void
}) {
  const clientName = building.client
    ? [building.client.first_name, building.client.last_name].filter(Boolean).join(' ')
    : null
  const bhiLabel = BHI_LABELS[building.bhi_label ?? '']
  const bhiColor = BHI_COLORS[building.bhi_label ?? '']
  const sensors = building.sensors_aggregate?.aggregate?.count ?? 0

  return (
    <div className="min-w-[240px] font-[Inter,system-ui,sans-serif]">
      <h3 className="text-[14px] font-semibold leading-tight text-gray-900">
        {building.name ?? 'Unnamed Building'}
      </h3>
      {building.full_address && (
        <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{building.full_address}</p>
      )}
      {clientName && <p className="mt-0.5 text-[11px] text-gray-400">{clientName}</p>}

      <div className="mt-2.5 flex items-center gap-3">
        {building.bhi != null && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: bhiColor }}
            />
            <span className="text-[14px] font-bold tabular-nums text-gray-800">{building.bhi}</span>
            {bhiLabel && (
              <span className="text-[10px] font-medium text-gray-500">{bhiLabel}</span>
            )}
          </div>
        )}
        <LiveFlowIndicator buildingId={building.id} compact />
      </div>

      {sensors > 0 && (
        <p className="mt-1.5 text-[11px] text-gray-400">
          {sensors} sensor{sensors !== 1 ? 's' : ''}
        </p>
      )}

      <button
        onClick={onViewMore}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-indigo-600"
      >
        View Details
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function BuildingsMap() {
  const navigate = useNavigate()
  const { buildings, loading, error } = useBuildingsPage()
  const { mode } = useTheme()
  const token = useAppSelector((s) => s.login.token)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const mappable = useMemo(
    () => buildings.filter((b) => b.latitude != null && b.longitude != null),
    [buildings],
  )

  const selected = useMemo(
    () => (selectedId != null ? mappable.find((b) => b.id === selectedId) ?? null : null),
    [selectedId, mappable],
  )

  const handlePrefetch = useCallback((id: number) => prefetchBuilding(id, token), [token])

  const fitBounds = useCallback(
    (map: mapboxgl.Map) => {
      if (mappable.length === 0) return
      if (mappable.length === 1) {
        const first = mappable[0]!
        map.flyTo({ center: [first.longitude!, first.latitude!], zoom: 15, duration: 800 })
        return
      }
      const lngs = mappable.map((b) => b.longitude!)
      const lats = mappable.map((b) => b.latitude!)
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 15, duration: 800 },
      )
    },
    [mappable],
  )

  const onMapLoad = useCallback(
    (e: { target: mapboxgl.Map }) => {
      mapRef.current = e.target
      fitBounds(e.target)
    },
    [fitBounds],
  )

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20">
            <svg className="h-4.5 w-4.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold sm:text-2xl">Map</h1>
        </div>
        {!loading && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            {mappable.length} / {buildings.length} mapped
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-indigo-200/60 dark:ring-indigo-500/20">
        {loading ? (
          <div className="flex h-[500px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
              <svg className="h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-indigo-400">Loading buildings…</p>
          </div>
        ) : (
          <MapGL
            initialViewState={{ ...MONTREAL, zoom: DEFAULT_ZOOM }}
            style={{ width: '100%', height: '100%', minHeight: 500 }}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={mode === 'dark' ? STYLE_DARK : STYLE_LIGHT}
            onLoad={onMapLoad}
            onClick={() => setSelectedId(null)}
            reuseMaps
            attributionControl={false}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {mappable.map((b) => (
              <Marker
                key={b.id}
                latitude={b.latitude!}
                longitude={b.longitude!}
                anchor="bottom"
              >
                <PinMarker
                  building={b}
                  isSelected={selectedId === b.id}
                  onClick={() => {
                    setSelectedId(b.id)
                    handlePrefetch(b.id)
                  }}
                />
              </Marker>
            ))}

            {selected && (
              <Popup
                latitude={selected.latitude!}
                longitude={selected.longitude!}
                anchor="bottom"
                offset={46}
                closeButton={true}
                closeOnClick={false}
                onClose={() => setSelectedId(null)}
                className="map-popup"
                maxWidth="320px"
              >
                <PopupContent
                  building={selected}
                  onViewMore={() =>
                    navigate(`/dashboard/buildings/${selected.id}`, {
                      state: { bhi: selected.bhi, bhiLabel: selected.bhi_label },
                    })
                  }
                />
              </Popup>
            )}
          </MapGL>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 overflow-hidden rounded-lg border border-indigo-100/80 bg-white/95 shadow-lg backdrop-blur-md dark:border-indigo-500/15 dark:bg-gray-900/95">
          <div className="border-b border-indigo-100/60 bg-indigo-50/60 px-3 py-1.5 dark:border-indigo-500/10 dark:bg-indigo-500/10">
            <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Building Health</p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-[11px]">
            {(['healthy', 'watch', 'investigate', 'critical'] as const).map((label) => (
              <span key={label} className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: BHI_COLORS[label] }}
                />
                {BHI_LABELS[label]}
              </span>
            ))}
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <span className="inline-block h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: PRIMARY }} />
              No data
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
