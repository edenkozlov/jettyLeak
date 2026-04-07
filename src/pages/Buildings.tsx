import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { MAPBOX_TOKEN } from '@/globals/constants'
import { useAppSelector } from '@/hooks/useAppSelector'
import { useGraphQL } from '@/hooks/useGraphQL'
import { useBuildingsPage, type FlowStatusMap } from '@/hooks/useBuildingsPage'
import useAuth from '@/hooks/auth/useAuth'
import { CREATE_BUILDING } from '@/mutations/buildingMutations'
import { GET_CLIENTS } from '@/queries/getClients'
import type { Building, Client } from '@/types'
import { formatDate } from '@/utils/formatDate'
import { prefetchBuilding } from '@/utils/prefetchBuilding'

interface ClientsResponse {
  client: Client[]
}

type ViewMode = 'cards' | 'table'

// ---------------------------------------------------------------------------
// BHI helpers
// ---------------------------------------------------------------------------

const BHI_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  healthy: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  watch: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' },
  investigate: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-800' },
  critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800' },
}

const BHI_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  investigate: 'Investigate',
  critical: 'Critical',
}

function BhiBadge({ bhi, label }: { bhi: number | null; label: string | null }) {
  if (bhi == null) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
  const c = BHI_COLORS[label ?? '']
  if (!c) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {bhi}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${c.bg} ${c.text}`}>
      {bhi}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ICON = 'h-4 w-4 shrink-0'

function BuildingIcon({ className = ICON }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function SensorIcon() {
  return (
    <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
    </svg>
  )
}

function FloorIcon() {
  return (
    <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clientName(building: Building): string | null {
  if (!building.client) return null
  return [building.client.first_name, building.client.last_name]
    .filter(Boolean)
    .join(' ') || null
}

function sensorCount(building: Building): number {
  return building.sensors_aggregate?.aggregate?.count ?? building.sensors?.length ?? 0
}

// ---------------------------------------------------------------------------
// Inline flow badge — uses pre-fetched bulk status, no per-building polling
// ---------------------------------------------------------------------------

function FlowBadge({ buildingId, flowStatus }: { buildingId: number; flowStatus: FlowStatusMap }) {
  const fs = flowStatus[buildingId]
  if (!fs) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600" />
        Loading...
      </span>
    )
  }
  if (fs.mag_sensor_id == null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        No sensor
      </span>
    )
  }
  if (fs.has_activity) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="relative inline-block h-2.5 w-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">Active</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
      0 L/h
    </span>
  )
}

// ---------------------------------------------------------------------------
// Building Card
// ---------------------------------------------------------------------------

function BuildingCard({
  building,
  flowStatus,
  showLiveFlowRow,
  onMouseEnter,
  onClick,
}: {
  building: Building
  flowStatus: FlowStatusMap
  showLiveFlowRow: boolean
  onMouseEnter: () => void
  onClick: () => void
}) {
  const bhiC = BHI_COLORS[building.bhi_label ?? '']
  const bhiLabel = BHI_LABELS[building.bhi_label ?? '']
  const client = clientName(building)
  const sensors = sensorCount(building)
  const floors = building.number_of_floors

  return (
    <div
      className="group min-w-0 max-w-full cursor-pointer rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* Header with BHI accent stripe */}
      <div className={`flex items-start gap-3 rounded-t-xl p-4 pb-3 ${bhiC ? `${bhiC.bg}` : ''}`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          bhiC ? `${bhiC.bg} ${bhiC.text} ring-1 ${bhiC.ring}` : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:ring-gray-600'
        }`}>
          <BuildingIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {building.name ?? 'Unnamed Building'}
          </h3>
          {building.full_address && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {building.full_address}
            </p>
          )}
        </div>
        {building.bhi != null && (
          <div className="shrink-0 text-right">
            <p className={`text-lg font-bold tabular-nums leading-none ${bhiC?.text ?? 'text-gray-500'}`}>
              {building.bhi}
            </p>
            {bhiLabel && (
              <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${bhiC?.text ?? 'text-gray-400'}`}>
                {bhiLabel}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 pb-4 pt-3">
        {showLiveFlowRow && (
          <div className="flex items-center justify-between">
            <FlowBadge buildingId={building.id} flowStatus={flowStatus} />
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          {client && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {client}
            </span>
          )}
          {sensors > 0 && (
            <span className="flex items-center gap-1">
              <SensorIcon />
              {sensors} sensor{sensors !== 1 ? 's' : ''}
            </span>
          )}
          {floors != null && floors > 0 && (
            <span className="flex items-center gap-1">
              <FloorIcon />
              {floors} floor{floors !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/[0.06]'

/** First column stays visible when scrolling the table horizontally */
const STICKY_NAME_TH =
  'sticky left-0 z-[2] bg-gray-50 px-4 py-3 shadow-[4px_0_8px_-2px_rgba(15,23,42,0.12)] sm:px-6 dark:bg-gray-950 dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.45)]'
const STICKY_NAME_TD =
  'sticky left-0 z-[1] bg-white px-4 py-3 font-medium shadow-[4px_0_8px_-2px_rgba(15,23,42,0.08)] group-hover:bg-gray-50 sm:px-6 sm:py-4 dark:bg-gray-800 dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.4)] dark:group-hover:bg-gray-700/50'

function TableSkeleton() {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className={i === 0 ? STICKY_NAME_TH : 'px-4 py-3 sm:px-6'}>
                <div className={`h-3 w-16 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: 8 }).map((_, row) => (
            <tr key={row} className="group">
              {Array.from({ length: 6 }).map((_, col) => (
                <td
                  key={col}
                  className={
                    col === 0
                      ? `${STICKY_NAME_TD} max-w-[10rem] truncate sm:max-w-[14rem] md:max-w-xs`
                      : 'px-4 py-3 sm:px-6 sm:py-4'
                  }
                >
                  <div className={`h-4 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer} ${col === 1 ? 'w-full max-w-md' : 'w-24'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className={`h-10 w-10 shrink-0 rounded-lg bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-32 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
          <div className={`h-3 w-48 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
        </div>
        <div className={`h-6 w-8 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
      </div>
      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className={`h-3.5 w-20 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
        <div className="flex gap-4">
          <div className={`h-3 w-24 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
          <div className={`h-3 w-16 rounded bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Buildings() {
  const navigate = useNavigate()
  const { buildings, flowStatus, loading, error } = useBuildingsPage()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const showMagnetometerFlowUi = role !== 'client'
  const token = useAppSelector((state) => state.login.token)

  const handlePrefetch = useCallback(
    (buildingId: number) => prefetchBuilding(buildingId, token),
    [token],
  )

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showForm, setShowForm] = useState(false)
  const [address, setAddress] = useState('')
  const [clientId, setClientId] = useState('')

  const { data: clientsData, executeQuery: fetchClients } =
    useGraphQL<ClientsResponse>(GET_CLIENTS)
  const fetchClientsRef = useRef(fetchClients)
  fetchClientsRef.current = fetchClients
  const clients = useMemo(() => clientsData?.client ?? [], [clientsData])

  const { executeQuery: createBuilding } = useGraphQL<{
    insert_building_one: { id: number }
  }>(CREATE_BUILDING)
  const createBuildingRef = useRef(createBuilding)
  createBuildingRef.current = createBuilding

  useEffect(() => {
    if (showForm) fetchClientsRef.current()
  }, [showForm])

  const goToBuilding = useCallback(
    (building: Building) =>
      navigate(`/dashboard/buildings/${building.id}`, {
        state: { bhi: building.bhi, bhiLabel: building.bhi_label },
      }),
    [navigate],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = address.trim()
      if (!trimmed) return

      let latitude: number | null = null
      let longitude: number | null = null
      if (MAPBOX_TOKEN) {
        try {
          const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
          const geoRes = await fetch(geoUrl)
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const coords = geoData?.features?.[0]?.center
            if (coords) {
              longitude = coords[0]
              latitude = coords[1]
            }
          }
        } catch {
          // Geocoding failed
        }
      }

      const result = await createBuildingRef.current({
        full_address: trimmed,
        client_id: clientId || null,
        latitude,
        longitude,
      })
      if (result?.insert_building_one) {
        navigate(`/dashboard/buildings/${result.insert_building_one.id}`)
      }
    },
    [address, clientId, navigate],
  )

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">Buildings</h1>
          {!loading && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {buildings.length}
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label="Card view"
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label="Table view"
            >
              <ListIcon />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              {showForm ? 'Cancel' : '+ Add Building'}
            </button>
          )}
        </div>
      </div>

      {/* Add building form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:mb-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Address
              </label>
              <input
                autoFocus
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, Province"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                      c.email ||
                      c.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Create Building
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading &&
        (viewMode === 'table' ? (
          <TableSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ))}

      {/* Card view */}
      {!loading && viewMode === 'cards' && (
        <>
          {buildings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
              <BuildingIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No buildings yet
              </p>
              {isAdmin && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Click "+ Add Building" to get started
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  flowStatus={flowStatus}
                  showLiveFlowRow={showMagnetometerFlowUi}
                  onMouseEnter={() => handlePrefetch(building.id)}
                  onClick={() => goToBuilding(building)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Table View */}
      {!loading && viewMode === 'table' && (
        <>
          {buildings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
              <BuildingIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No buildings yet
              </p>
            </div>
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 bg-white [-webkit-overflow-scrolling:touch] dark:border-gray-700 dark:bg-gray-800">
              <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>
                    <th className={STICKY_NAME_TH}>
                      <span className="inline-flex items-center gap-1.5">
                        <BuildingIcon className="h-3.5 w-3.5" />
                        Name
                      </span>
                    </th>
                    <th className="px-4 py-3 sm:px-6">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        Address
                      </span>
                    </th>
                    <th className="px-4 py-3 sm:px-6">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        Health
                      </span>
                    </th>
                    {showMagnetometerFlowUi && (
                      <th className="px-4 py-3 sm:px-6">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Flow
                        </span>
                      </th>
                    )}
                    <th className="px-4 py-3 sm:px-6">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        Client
                      </span>
                    </th>
                    <th className="px-4 py-3 sm:px-6">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                        Created
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {buildings.map((building) => (
                    <tr
                      key={building.id}
                      className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onMouseEnter={() => handlePrefetch(building.id)}
                      onClick={() => goToBuilding(building)}
                    >
                      <td
                        className={`${STICKY_NAME_TD} max-w-[10rem] truncate sm:max-w-[14rem] md:max-w-xs`}
                      >
                        {building.name ?? '—'}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-gray-500 dark:text-gray-400 sm:max-w-xs sm:px-6 sm:py-4 md:max-w-md lg:max-w-lg">
                        {building.full_address ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <BhiBadge bhi={building.bhi} label={building.bhi_label} />
                      </td>
                      {showMagnetometerFlowUi && (
                        <td className="min-w-[8rem] px-4 py-3 sm:px-6 sm:py-4">
                          <FlowBadge buildingId={building.id} flowStatus={flowStatus} />
                        </td>
                      )}
                      <td className="max-w-[8rem] truncate px-4 py-3 text-gray-500 dark:text-gray-400 sm:max-w-[10rem] sm:px-6 sm:py-4">
                        {clientName(building) ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                        {formatDate(building.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
