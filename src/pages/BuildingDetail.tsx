import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import BuildingFootprint from '@/components/BuildingFootprint'
import BuildingMap3D from '@/components/BuildingMap3D'
import { MAPBOX_TOKEN } from '@/globals/constants'
import { useBuildingDetail } from '@/hooks/useBuildingDetail'
import {
  useBuildingFootprint,
  type BuildingFootprint as FootprintData,
} from '@/hooks/useBuildingFootprint'
import { useGraphQL } from '@/hooks/useGraphQL'
import {
  UPDATE_BUILDING_COORDINATES,
  UPDATE_BUILDING_FLOORS,
  UPDATE_BUILDING_FOOTPRINT,
  UPDATE_BUILDING_NAME,
} from '@/mutations/buildingMutations'
import {
  CREATE_SENSOR,
  UPDATE_SENSOR_AREA,
  UPDATE_SENSOR_POSITION,
} from '@/mutations/sensorMutations'
import type { Sensor } from '@/types'

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { building, loading, error } = useBuildingDetail(id)

  const [geocodedCoords, setGeocodedCoords] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const effectiveLat = building?.latitude ?? geocodedCoords?.latitude ?? null
  const effectiveLon = building?.longitude ?? geocodedCoords?.longitude ?? null

  const {
    footprints,
    loading: footprintLoading,
    error: footprintError,
  } = useBuildingFootprint(effectiveLat, effectiveLon)

  const [selectedFootprint, setSelectedFootprint] =
    useState<FootprintData | null>(null)

  // Local sensor state for optimistic updates
  const [localSensors, setLocalSensors] = useState<Sensor[] | null>(null)
  const sensors = localSensors ?? building?.sensors ?? []

  const [localFloors, setLocalFloors] = useState<number | null>(null)
  const numberOfFloors = localFloors ?? building?.number_of_floors ?? 1

  const [localName, setLocalName] = useState<string | null | undefined>(undefined)
  const displayName = localName !== undefined ? localName : building?.name ?? null

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const { executeQuery: updateBuildingName } = useGraphQL(UPDATE_BUILDING_NAME)
  const { executeQuery: updateBuildingCoordinates } = useGraphQL(
    UPDATE_BUILDING_COORDINATES,
  )
  const { executeQuery: updateBuildingFootprint } = useGraphQL(
    UPDATE_BUILDING_FOOTPRINT,
  )
  const { executeQuery: updateBuildingFloors } = useGraphQL(
    UPDATE_BUILDING_FLOORS,
  )
  const { executeQuery: updateSensorPosition } = useGraphQL(
    UPDATE_SENSOR_POSITION,
  )
  const { executeQuery: createSensor } = useGraphQL<{
    insert_sensor_one: Sensor
  }>(CREATE_SENSOR)
  const { executeQuery: updateSensorArea } = useGraphQL(UPDATE_SENSOR_AREA)

  // Geocode address if building has no coordinates
  useEffect(() => {
    if (
      !building ||
      building.latitude != null ||
      building.longitude != null ||
      !building.full_address ||
      !MAPBOX_TOKEN
    )
      return
    const addr = building.full_address
    let cancelled = false
    ;(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
        const res = await fetch(url)
        if (!res.ok || cancelled) return
        const data = await res.json()
        const coords = data?.features?.[0]?.center
        if (coords && !cancelled) {
          const [lon, lat] = coords as [number, number]
          setGeocodedCoords({ latitude: lat, longitude: lon })
          updateBuildingCoordinates({
            id: building.id,
            latitude: lat,
            longitude: lon,
          })
        }
      } catch {
        // Geocoding failed silently
      }
    })()
    return () => {
      cancelled = true
    }
  }, [building, updateBuildingCoordinates])

  const handleBuildingSelect = useCallback(
    (footprint: FootprintData) => {
      setSelectedFootprint(footprint)
      if (building) {
        updateBuildingFootprint({
          id: building.id,
          footprint: footprint.coordinates,
        })
      }
    },
    [building, updateBuildingFootprint],
  )

  const handleSensorPlaced = useCallback(
    (sensorId: number, floor: number, position: { x: number; y: number }) => {
      // Optimistic update
      setLocalSensors((prev) => {
        const list = prev ?? building?.sensors ?? []
        return list.map((s) =>
          s.id === sensorId
            ? { ...s, floor_number: floor, location_on_floor: position }
            : s,
        )
      })
      // Persist
      updateSensorPosition({
        id: sensorId,
        floor_number: floor,
        location_on_floor: position,
      })
    },
    [building?.sensors, updateSensorPosition],
  )

  const handleFloorsChange = useCallback(
    (floors: number) => {
      setLocalFloors(floors)
      if (building) {
        updateBuildingFloors({ id: building.id, number_of_floors: floors })
      }
    },
    [building, updateBuildingFloors],
  )

  const handleSensorCreate = useCallback(
    async (name: string) => {
      if (!building) return
      const result = await createSensor({
        name,
        building_id: building.id,
      })
      if (result?.insert_sensor_one) {
        setLocalSensors((prev) => [
          ...(prev ?? building.sensors ?? []),
          {
            ...result.insert_sensor_one,
            floor_number: null,
            location_on_floor: null,
            area_covered: null,
            mappings: null,
          },
        ])
      }
    },
    [building, createSensor],
  )

  const handleAreaDrawn = useCallback(
    (sensorId: number, area: Array<{ x: number; y: number }>) => {
      // Optimistic update
      setLocalSensors((prev) => {
        const list = prev ?? building?.sensors ?? []
        return list.map((s) =>
          s.id === sensorId ? { ...s, area_covered: area } : s,
        )
      })
      // Persist
      updateSensorArea({ id: sensorId, area_covered: area })
    },
    [building?.sensors, updateSensorArea],
  )

  const handleSensorRemoved = useCallback(
    (sensorId: number) => {
      setLocalSensors((prev) => {
        const list = prev ?? building?.sensors ?? []
        return list.map((s) =>
          s.id === sensorId
            ? { ...s, floor_number: null, location_on_floor: null, area_covered: null }
            : s,
        )
      })
      updateSensorPosition({
        id: sensorId,
        floor_number: null,
        location_on_floor: null,
      })
      updateSensorArea({ id: sensorId, area_covered: null })
    },
    [building?.sensors, updateSensorPosition, updateSensorArea],
  )

  // Priority: user selection > saved in DB > Overpass API result
  const displayFootprints = selectedFootprint
    ? [selectedFootprint]
    : building?.footprint
      ? [{ id: building.id, coordinates: building.footprint }]
      : footprints

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

  if (!building) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
        Building not found
      </div>
    )
  }

  const clientName = building.client
    ? [building.client.first_name, building.client.last_name]
        .filter(Boolean)
        .join(' ')
    : null

  return (
    <div>
      {/* Back button + Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/dashboard/buildings')}
          className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Buildings
        </button>

        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => {
              const trimmed = nameValue.trim() || null
              setEditingName(false)
              setLocalName(trimmed)
              updateBuildingName({ id: building.id, name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                setNameValue(displayName ?? '')
                setEditingName(false)
              }
            }}
            className="w-full border-b-2 border-indigo-500 bg-transparent text-xl font-bold outline-none sm:text-2xl"
            autoFocus
          />
        ) : (
          <h1
            className="cursor-pointer text-xl font-bold sm:text-2xl"
            onClick={() => {
              setNameValue(displayName ?? '')
              setEditingName(true)
            }}
            title="Click to rename"
          >
            {displayName ?? (
              <span className="text-gray-400">Unnamed Building</span>
            )}
          </h1>
        )}

        {building.full_address && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {building.full_address}
          </p>
        )}

        {clientName && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Client: {clientName}
          </p>
        )}
      </div>

      {/* Map views */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* 3D Mapbox View */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            3D View
            <span className="ml-2 font-normal text-gray-400">
              Click a building to select it
            </span>
          </h2>
          {effectiveLat != null && effectiveLon != null ? (
            <BuildingMap3D
              latitude={effectiveLat}
              longitude={effectiveLon}
              className="h-72 sm:h-96"
              savedFootprint={building.footprint}
              onBuildingSelect={handleBuildingSelect}
            />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 sm:h-96">
              <p className="text-sm text-gray-400">No coordinates available</p>
            </div>
          )}
        </div>

        {/* 2D Footprint View with sensor placement */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Building Footprint
            <span className="ml-2 font-normal text-gray-400">
              Drag sensors onto the floor plan
            </span>
          </h2>
          {footprintLoading && !selectedFootprint && !building.footprint ? (
            <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 sm:h-96">
              <p className="text-sm text-gray-400">Loading footprint…</p>
            </div>
          ) : footprintError && !selectedFootprint && !building.footprint ? (
            <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-red-50 dark:border-gray-700 dark:bg-red-900/20 sm:h-96">
              <p className="text-sm text-red-500">{footprintError}</p>
            </div>
          ) : (
            <BuildingFootprint
              footprints={displayFootprints}
              sensors={sensors}
              numberOfFloors={numberOfFloors}
              onSensorPlaced={handleSensorPlaced}
              onFloorsChange={handleFloorsChange}
              onSensorCreate={handleSensorCreate}
              onSensorRemoved={handleSensorRemoved}
              onAreaDrawn={handleAreaDrawn}
              className="h-72 sm:h-96"
            />
          )}
        </div>
      </div>
    </div>
  )
}
