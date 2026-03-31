import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MAPBOX_TOKEN } from '@/globals/constants'
import { useGraphQL } from '@/hooks/useGraphQL'
import { DELETE_BUILDING, UPDATE_BUILDING } from '@/mutations/buildingMutations'
import { GET_CLIENTS } from '@/queries/getClients'
import type { Building, Client } from '@/types'

interface Props {
  building: Building
  onSaved: (updates: Partial<Building>) => void
  onClose: () => void
  onDeleted?: () => void
}

interface ClientsResponse {
  client: Client[]
}

interface GeoSuggestion {
  place_name: string
  center: [number, number]
}

export default function BuildingEditPanel({ building, onSaved, onClose, onDeleted }: Props) {
  const [name, setName] = useState(building.name ?? '')
  const [address, setAddress] = useState(building.full_address ?? '')
  const [clientId, setClientId] = useState(building.client_id ?? '')
  const [floors, setFloors] = useState(building.number_of_floors ?? 1)
  const [lat, setLat] = useState(building.latitude?.toString() ?? '')
  const [lng, setLng] = useState(building.longitude?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const addressWrapRef = useRef<HTMLDivElement>(null)

  const { executeQuery: updateBuilding } = useGraphQL(UPDATE_BUILDING)
  const updateBuildingRef = useRef(updateBuilding)
  updateBuildingRef.current = updateBuilding

  const { executeQuery: deleteBuilding } = useGraphQL(DELETE_BUILDING)
  const deleteBuildingRef = useRef(deleteBuilding)
  deleteBuildingRef.current = deleteBuilding

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await deleteBuildingRef.current({ id: building.id })
    setDeleting(false)
    onDeleted?.()
  }, [confirmDelete, building.id, onDeleted])
  const {
    data: clientsData,
    executeQuery: fetchClients,
  } = useGraphQL<ClientsResponse>(GET_CLIENTS)
  const fetchClientsRef = useRef(fetchClients)
  fetchClientsRef.current = fetchClients

  useEffect(() => {
    fetchClientsRef.current()
  }, [])

  const searchAddress = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 3 || !MAPBOX_TOKEN) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=address,poi&proximity=-73.5673,45.5017`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const results: GeoSuggestion[] = (data.features ?? []).map(
          (f: { place_name: string; center: [number, number] }) => ({
            place_name: f.place_name,
            center: f.center,
          }),
        )
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setHighlightIdx(-1)
      } catch {
        /* ignore */
      }
    }, 300)
  }, [])

  const pickSuggestion = useCallback((s: GeoSuggestion) => {
    setAddress(s.place_name)
    setLng(s.center[0].toFixed(6))
    setLat(s.center[1].toFixed(6))
    setSuggestions([])
    setShowSuggestions(false)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addressWrapRef.current && !addressWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const clients = useMemo(() => clientsData?.client ?? [], [clientsData])

  const hasChanges = useMemo(() => {
    return (
      (name || null) !== (building.name ?? null) ||
      (address || null) !== (building.full_address ?? null) ||
      (clientId || null) !== (building.client_id ?? null) ||
      floors !== (building.number_of_floors ?? 1) ||
      (lat || null) !== (building.latitude?.toString() ?? null) ||
      (lng || null) !== (building.longitude?.toString() ?? null)
    )
  }, [name, address, clientId, floors, lat, lng, building])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaved(false)

    const parsedLat = lat ? parseFloat(lat) : null
    const parsedLng = lng ? parseFloat(lng) : null

    const vars = {
      id: building.id,
      name: name || null,
      full_address: address || null,
      client_id: clientId || null,
      number_of_floors: floors,
      latitude: parsedLat,
      longitude: parsedLng,
    }

    await updateBuildingRef.current(vars)
    setSaving(false)
    setSaved(true)

    const matchedClient = clients.find((c) => c.id === clientId) ?? null
    onSaved({
      name: name || null,
      full_address: address || null,
      client_id: clientId || null,
      number_of_floors: floors,
      latitude: parsedLat,
      longitude: parsedLng,
      client: matchedClient
        ? { id: matchedClient.id, created_at: matchedClient.created_at, email: matchedClient.email, first_name: matchedClient.first_name, last_name: matchedClient.last_name }
        : undefined,
    })

    setTimeout(() => setSaved(false), 2000)
  }, [building.id, name, address, clientId, floors, lat, lng, clients, onSaved])

  const inputCls =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500'

  const labelCls = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/60 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
          Edit Building Details
        </h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Name */}
        <div>
          <label className={labelCls}>Building Name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. KMG Headquarters"
          />
        </div>

        {/* Address — searchable */}
        <div className="relative sm:col-span-2 lg:col-span-2" ref={addressWrapRef}>
          <label className={labelCls}>Address</label>
          <div className="relative">
            <input
              className={inputCls}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                searchAddress(e.target.value)
              }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
              onKeyDown={(e) => {
                if (!showSuggestions) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlightIdx((i) => Math.max(i - 1, 0))
                } else if (e.key === 'Enter' && highlightIdx >= 0 && suggestions[highlightIdx]) {
                  e.preventDefault()
                  pickSuggestion(suggestions[highlightIdx])
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false)
                }
              }}
              placeholder="Search for an address…"
            />
            {/* search icon */}
            <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition ${
                      i === highlightIdx
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60'
                    }`}
                    onMouseEnter={() => setHighlightIdx(i)}
                    onClick={() => pickSuggestion(s)}
                  >
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                    </svg>
                    <span className="line-clamp-2">{s.place_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Client */}
        <div>
          <label className={labelCls}>Client</label>
          <select
            className={inputCls}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.id}
              </option>
            ))}
          </select>
        </div>

        {/* Floors */}
        <div>
          <label className={labelCls}>Floors</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            max={200}
            value={floors}
            onChange={(e) => setFloors(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        {/* Latitude */}
        <div>
          <label className={labelCls}>Latitude</label>
          <input
            className={inputCls}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="45.5017"
          />
        </div>

        {/* Longitude */}
        <div>
          <label className={labelCls}>Longitude</label>
          <input
            className={inputCls}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-73.5673"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>

        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          Cancel
        </button>

        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Saved
          </span>
        )}

        {/* Delete — pushed to the right */}
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
