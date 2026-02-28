import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { MAPBOX_TOKEN } from '@/globals/constants'
import { useGraphQL } from '@/hooks/useGraphQL'
import { useBuildingsPage } from '@/hooks/useBuildingsPage'
import { CREATE_BUILDING } from '@/mutations/buildingMutations'
import { GET_CLIENTS } from '@/queries/getClients'
import type { Client } from '@/types'
import { formatDate } from '@/utils/formatDate'

interface ClientsResponse {
  client: Client[]
}

export default function Buildings() {
  const navigate = useNavigate()
  const { buildings, loading, error } = useBuildingsPage()

  const [showForm, setShowForm] = useState(false)
  const [address, setAddress] = useState('')
  const [clientId, setClientId] = useState('')

  const { data: clientsData, executeQuery: fetchClients } =
    useGraphQL<ClientsResponse>(GET_CLIENTS)
  const clients = useMemo(() => clientsData?.client ?? [], [clientsData])

  const { executeQuery: createBuilding } = useGraphQL<{
    insert_building_one: { id: number }
  }>(CREATE_BUILDING)

  useEffect(() => {
    if (showForm) fetchClients()
  }, [showForm, fetchClients])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = address.trim()
      if (!trimmed) return

      // Geocode address via Mapbox
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
          // Geocoding failed, create without coordinates
        }
      }

      const result = await createBuilding({
        full_address: trimmed,
        client_id: clientId || null,
        latitude,
        longitude,
      })
      if (result?.insert_building_one) {
        navigate(`/dashboard/buildings/${result.insert_building_one.id}`)
      }
    },
    [address, clientId, createBuilding, navigate],
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Buildings</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ Add Building'}
        </button>
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
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create Building
            </button>
          </div>
        </form>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 sm:px-6">Name</th>
              <th className="px-4 py-3 sm:px-6">Address</th>
              <th className="px-4 py-3 sm:px-6">Client</th>
              <th className="px-4 py-3 sm:px-6">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {buildings.map((building) => (
              <tr
                key={building.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => navigate(`/dashboard/buildings/${building.id}`)}
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                  {building.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {building.full_address ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {building.client
                    ? [building.client.first_name, building.client.last_name]
                        .filter(Boolean)
                        .join(' ')
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {formatDate(building.created_at)}
                </td>
              </tr>
            ))}
            {buildings.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  No buildings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {buildings.map((building) => (
          <div
            key={building.id}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
            onClick={() => navigate(`/dashboard/buildings/${building.id}`)}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {building.name ?? '—'}
            </p>
            {building.full_address && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {building.full_address}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {building.client
                  ? [building.client.first_name, building.client.last_name]
                      .filter(Boolean)
                      .join(' ')
                  : '—'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(building.created_at)}
              </span>
            </div>
          </div>
        ))}
        {buildings.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No buildings found
          </p>
        )}
      </div>
    </div>
  )
}
