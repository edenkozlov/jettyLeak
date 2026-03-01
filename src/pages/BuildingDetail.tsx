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
  CREATE_FIXTURE,
  DELETE_FIXTURE,
  UPDATE_FIXTURE_POSITION,
} from '@/mutations/fixtureMutations'
import {
  CREATE_SENSOR,
  UPDATE_SENSOR_AREA,
  UPDATE_SENSOR_POSITION,
} from '@/mutations/sensorMutations'
import type { Fixture, FixtureType, Sensor } from '@/types'

// Ray-casting point-in-polygon test
function pointInPolygon(
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>,
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x, yi = polygon[i]!.y
    const xj = polygon[j]!.x, yj = polygon[j]!.y
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

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

  // Local fixture state for optimistic updates
  const [localFixtures, setLocalFixtures] = useState<Fixture[] | null>(null)
  const fixtures = localFixtures ?? building?.fixtures ?? []

  const [localFloors, setLocalFloors] = useState<number | null>(null)
  const numberOfFloors = localFloors ?? building?.number_of_floors ?? 1

  const [localName, setLocalName] = useState<string | null | undefined>(undefined)
  const displayName = localName !== undefined ? localName : building?.name ?? null

  const [footprintExpanded, setFootprintExpanded] = useState(false)

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
  const { executeQuery: createFixture } = useGraphQL<{
    insert_fixtures_one: Fixture
  }>(CREATE_FIXTURE)
  const { executeQuery: updateFixturePosition } = useGraphQL(UPDATE_FIXTURE_POSITION)
  const { executeQuery: deleteFixture } = useGraphQL(DELETE_FIXTURE)

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

  // Escape key closes expanded footprint
  useEffect(() => {
    if (!footprintExpanded) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFootprintExpanded(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [footprintExpanded])

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

  const handleFixtureCreate = useCallback(
    async (type: FixtureType, floor: number) => {
      if (!building) return
      const result = await createFixture({
        building_id: building.id,
        floor_number: floor,
        type,
      })
      if (result?.insert_fixtures_one) {
        setLocalFixtures((prev) => [
          ...(prev ?? building.fixtures ?? []),
          result.insert_fixtures_one,
        ])
      }
    },
    [building, createFixture],
  )

  const handleFixturePlaced = useCallback(
    (fixtureId: number, position: { x: number; y: number }) => {
      // Find the fixture to get its floor
      const allFixtures = localFixtures ?? building?.fixtures ?? []
      const fixture = allFixtures.find((f) => f.id === fixtureId)
      const floor = fixture?.floor_number

      // Find sensor whose area contains this position on the same floor
      const matchingSensor = sensors.find(
        (s) =>
          s.floor_number === floor &&
          s.area_covered &&
          s.area_covered.length >= 3 &&
          pointInPolygon(position, s.area_covered),
      )
      const sensorId = matchingSensor?.id ?? null

      setLocalFixtures((prev) => {
        const list = prev ?? building?.fixtures ?? []
        return list.map((f) =>
          f.id === fixtureId
            ? { ...f, location_on_floor: position, sensor_id: sensorId }
            : f,
        )
      })
      updateFixturePosition({
        id: fixtureId,
        location_on_floor: position,
        sensor_id: sensorId,
      })
    },
    [building?.fixtures, localFixtures, sensors, updateFixturePosition],
  )

  const handleFixtureRemoved = useCallback(
    (fixtureId: number) => {
      setLocalFixtures((prev) => {
        const list = prev ?? building?.fixtures ?? []
        return list.filter((f) => f.id !== fixtureId)
      })
      deleteFixture({ id: fixtureId })
    },
    [building?.fixtures, deleteFixture],
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
        {!footprintExpanded && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Building Footprint
                <span className="ml-2 font-normal text-gray-400">
                  Drag sensors onto the floor plan
                </span>
              </h2>
              <button
                onClick={() => setFootprintExpanded(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Expand"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
            </div>
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
                fixtures={fixtures}
                onFixtureCreate={handleFixtureCreate}
                onFixturePlaced={handleFixturePlaced}
                onFixtureRemoved={handleFixtureRemoved}
                className="h-72 sm:h-96"
              />
            )}
          </div>
        )}
      </div>

      {/* Expanded footprint overlay */}
      {footprintExpanded && (
        <div className="fixed inset-0 z-20 lg:left-64">
          <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Building Footprint
                <span className="ml-2 font-normal text-gray-400">
                  Drag sensors onto the floor plan
                </span>
              </h2>
              <button
                onClick={() => setFootprintExpanded(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Collapse"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m7 9l5 5m0 0v-4m0 4h-4M9 15l-5 5m0 0h4m-4 0v-4m11-7l5-5m0 0h-4m4 0v4" />
                </svg>
              </button>
            </div>
            <div className="flex-1 px-4 pb-4">
              <BuildingFootprint
                footprints={displayFootprints}
                sensors={sensors}
                numberOfFloors={numberOfFloors}
                onSensorPlaced={handleSensorPlaced}
                onFloorsChange={handleFloorsChange}
                onSensorCreate={handleSensorCreate}
                onSensorRemoved={handleSensorRemoved}
                onAreaDrawn={handleAreaDrawn}
                fixtures={fixtures}
                onFixtureCreate={handleFixtureCreate}
                onFixturePlaced={handleFixturePlaced}
                onFixtureRemoved={handleFixtureRemoved}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
