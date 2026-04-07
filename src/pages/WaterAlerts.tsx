import { useCallback, useMemo, useRef, useState } from 'react'
import MapGL, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import type { MapMouseEvent } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

import { useTheme } from '@/contexts/ThemeContext'
import { useWaterAlerts } from '@/hooks/useWaterAlerts'
import type { WaterAlert, WaterAlertStatus } from '@/types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const MONTREAL = { latitude: 45.5017, longitude: -73.5673 }
const DEFAULT_ZOOM = 11

const STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12'
const STYLE_DARK = 'mapbox://styles/mapbox/dark-v11'

const STATUS_COLORS: Record<string, string> = {
  active: '#ef4444',
  upcoming: '#f59e0b',
  expired: '#6b7280',
  unknown: '#9ca3af',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  expired: 'Expired',
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'upcoming':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'expired':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Summary Cards ──────────────────────────────────────────────────────

function SummaryCards({
  stats,
  loading,
}: {
  stats: { active_count: number; last_7_days_count: number; boroughs_affected: number; last_sync_at: string | null } | null
  loading: boolean
}) {
  const cards = [
    {
      label: 'Active Notices',
      value: stats?.active_count ?? '—',
      icon: (
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
      ),
      accent: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Last 7 Days',
      value: stats?.last_7_days_count ?? '—',
      icon: (
        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Boroughs Affected',
      value: stats?.boroughs_affected ?? '—',
      icon: (
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      accent: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Last Sync',
      value: stats?.last_sync_at ? relativeTime(stats.last_sync_at) : '—',
      icon: (
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center gap-2">
            {c.icon}
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
          </div>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${c.accent} ${loading ? 'animate-pulse' : ''}`}>
            {loading ? '…' : c.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Filter Bar ─────────────────────────────────────────────────────────

function FilterBar({
  filters,
  boroughs,
  onFilterChange,
}: {
  filters: { status?: WaterAlertStatus | null; borough?: string | null; q?: string }
  boroughs: string[]
  onFilterChange: (patch: Partial<typeof filters>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Search alerts…"
        value={filters.q ?? ''}
        onChange={(e) => onFilterChange({ q: e.target.value || undefined })}
        className="h-8 w-48 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
      />
      <select
        value={filters.status ?? ''}
        onChange={(e) =>
          onFilterChange({ status: (e.target.value as WaterAlertStatus) || null })
        }
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="upcoming">Upcoming</option>
        <option value="expired">Expired</option>
      </select>
      <select
        value={filters.borough ?? ''}
        onChange={(e) => onFilterChange({ borough: e.target.value || null })}
        className="h-8 max-w-[200px] rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        <option value="">All boroughs</option>
        {boroughs.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
      {(filters.status || filters.borough || filters.q) && (
        <button
          onClick={() => onFilterChange({ status: null, borough: null, q: undefined })}
          className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ── Alert List ─────────────────────────────────────────────────────────

function AlertList({
  alerts,
  selectedId,
  onSelect,
}: {
  alerts: WaterAlert[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  if (alerts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        No alerts match your filters
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {alerts.map((alert) => (
        <button
          key={alert.id}
          onClick={() => onSelect(alert.id)}
          className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
            selectedId === alert.id
              ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 line-clamp-2">
              {alert.title}
            </p>
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(alert.status)}`}
            >
              {STATUS_LABELS[alert.status] ?? alert.status}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            {alert.borough && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                {alert.borough}
              </span>
            )}
            <span>{relativeTime(alert.published_at)}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 capitalize dark:bg-gray-700">
              {alert.category}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Detail Drawer ──────────────────────────────────────────────────────

function DetailDrawer({
  alert,
  onClose,
}: {
  alert: WaterAlert
  onClose: () => void
}) {
  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="min-w-0 flex-1">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(alert.status)}`}
          >
            {STATUS_LABELS[alert.status] ?? alert.status}
          </span>
          <h2 className="mt-2 text-base font-semibold leading-snug text-gray-900 dark:text-white">
            {alert.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <dl className="space-y-4 text-sm">
          <DetailField label="Category" value={alert.category} />
          <DetailField label="Borough" value={alert.borough} />
          <DetailField label="Published" value={formatDate(alert.published_at)} />
          <DetailField label="First Seen" value={formatDate(alert.first_seen_at)} />

          {alert.affected_area_text && (
            <DetailField label="Affected Area" value={alert.affected_area_text} />
          )}

          {alert.reason_text && (
            <DetailField label="Reason" value={alert.reason_text} />
          )}

          {alert.alert_start_at && (
            <DetailField label="Alert Start" value={formatDate(alert.alert_start_at)} />
          )}

          {alert.alert_end_at && (
            <DetailField label="Alert End" value={formatDate(alert.alert_end_at)} />
          )}

          {alert.detail_text_raw && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Raw Details
              </dt>
              <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {alert.detail_text_raw.slice(0, 2000)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <a
          href={alert.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-600"
        >
          View Official Notice
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
        <p className="mt-2 text-center text-[10px] text-gray-400">
          Enrichment: {alert.enrichment_status} &middot; Synced {relativeTime(alert.last_synced_at)}
        </p>
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{value ?? '—'}</dd>
    </div>
  )
}

// ── Map ────────────────────────────────────────────────────────────────

function AlertsMap({
  alerts,
  selectedId,
  onSelect,
}: {
  alerts: WaterAlert[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  const { mode } = useTheme()
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const geojsonData = useMemo(() => {
    const features = alerts
      .filter((a) => a.geometry_json != null)
      .map((a) => ({
        type: 'Feature' as const,
        id: a.id,
        properties: {
          id: a.id,
          title: a.title,
          status: a.status,
          borough: a.borough ?? '',
          color: STATUS_COLORS[a.status] ?? STATUS_COLORS.unknown,
        },
        geometry: a.geometry_json!,
      }))

    return { type: 'FeatureCollection' as const, features }
  }, [alerts])

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const feature = (e as MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }).features?.[0]
      if (feature?.properties?.id) {
        onSelect(feature.properties.id as number)
      } else {
        onSelect(null)
      }
    },
    [onSelect],
  )

  const onLoad = useCallback((e: { target: mapboxgl.Map }) => {
    mapRef.current = e.target
    e.target.getCanvas().style.cursor = 'default'
  }, [])

  // Highlight the selected feature by filtering layers
  const selectedFilter = useMemo(
    () => (selectedId != null ? ['==', ['get', 'id'], selectedId] : ['literal', false]),
    [selectedId],
  )

  return (
    <MapGL
      initialViewState={{ ...MONTREAL, zoom: DEFAULT_ZOOM }}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle={mode === 'dark' ? STYLE_DARK : STYLE_LIGHT}
      onLoad={onLoad}
      onClick={handleMapClick}
      interactiveLayerIds={['water-alerts-fill', 'water-alerts-line', 'water-alerts-circle']}
      reuseMaps
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Source id="water-alerts" type="geojson" data={geojsonData as any}>
        {/* Polygon fills */}
        <Layer
          id="water-alerts-fill"
          type="fill"
          filter={['==', ['geometry-type'], 'Polygon']}
          paint={{
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.2,
          }}
        />
        <Layer
          id="water-alerts-fill-outline"
          type="line"
          filter={['==', ['geometry-type'], 'Polygon']}
          paint={{
            'line-color': ['get', 'color'],
            'line-width': 2,
          }}
        />

        {/* Lines */}
        <Layer
          id="water-alerts-line"
          type="line"
          filter={['==', ['geometry-type'], 'LineString']}
          paint={{
            'line-color': ['get', 'color'],
            'line-width': 4,
            'line-opacity': 0.85,
          }}
        />

        {/* Points */}
        <Layer
          id="water-alerts-circle"
          type="circle"
          filter={['==', ['geometry-type'], 'Point']}
          paint={{
            'circle-radius': 8,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          }}
        />

        {/* Selected highlight ring */}
        <Layer
          id="water-alerts-selected-line"
          type="line"
          filter={selectedFilter as unknown as mapboxgl.FilterSpecification}
          paint={{
            'line-color': '#6366f1',
            'line-width': 6,
            'line-opacity': 0.9,
          }}
        />
        <Layer
          id="water-alerts-selected-circle"
          type="circle"
          filter={['all', ['==', ['geometry-type'], 'Point'], selectedFilter] as unknown as mapboxgl.FilterSpecification}
          paint={{
            'circle-radius': 14,
            'circle-color': 'transparent',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#6366f1',
          }}
        />
      </Source>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 overflow-hidden rounded-lg border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-md dark:border-gray-600/50 dark:bg-gray-900/95">
        <div className="border-b border-gray-200/60 bg-gray-50/60 px-3 py-1.5 dark:border-gray-700/40 dark:bg-gray-800/60">
          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Alert Status</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-[11px]">
          {(['active', 'upcoming', 'expired'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      </div>
    </MapGL>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function WaterAlerts() {
  const {
    alerts,
    stats,
    boroughs,
    loading,
    error,
    filters,
    setFilters,
    selectedId,
    setSelectedId,
    selected,
  } = useWaterAlerts()

  const [showDrawer, setShowDrawer] = useState(false)

  const handleSelect = useCallback(
    (id: number | null) => {
      setSelectedId(id)
      if (id != null) setShowDrawer(true)
    },
    [setSelectedId],
  )

  const handleCloseDrawer = useCallback(() => {
    setShowDrawer(false)
    setSelectedId(null)
  }, [setSelectedId])

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
          <svg className="h-4.5 w-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold sm:text-2xl">Water Alerts — Montréal</h1>
        {!loading && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            {alerts.length} notices
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards stats={stats} loading={loading} />

      {/* Filters */}
      <FilterBar
        filters={filters}
        boroughs={boroughs}
        onFilterChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
      />

      {/* Map + List split */}
      <div className="relative flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Map */}
        <div className="min-h-[400px] flex-[3] overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-700">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-400">Loading alerts…</p>
              </div>
            </div>
          ) : (
            <AlertsMap
              alerts={alerts}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          )}
        </div>

        {/* List panel */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:w-96">
          <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Notices ({alerts.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-1 py-1">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-gray-400">Loading…</p>
              </div>
            ) : (
              <AlertList
                alerts={alerts}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>
        </div>

        {/* Detail drawer overlay */}
        {showDrawer && selected && (
          <DetailDrawer alert={selected} onClose={handleCloseDrawer} />
        )}
      </div>
    </div>
  )
}
