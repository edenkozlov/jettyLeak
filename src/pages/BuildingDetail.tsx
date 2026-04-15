import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { MagDataSection } from '@/components/BuildingAnalytics'
import BuildingEditPanel from '@/components/BuildingEditPanel'
import BuildingFixturesStrip from '@/components/BuildingFixturesStrip'
import BuildingFlowChart from '@/components/BuildingFlowChart'
import BuildingOverviewHero from '@/components/BuildingOverviewHero'
import BuildingFootprint from '@/components/BuildingFootprint'
import BuildingMap3D from '@/components/BuildingMap3D'
import { useBuildingAnalytics } from '@/hooks/useBuildingAnalytics'
import useAuth from '@/hooks/auth/useAuth'
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
import type { Building, Fixture, FixtureType, Sensor } from '@/types'
import { isCertificationEligible } from '@/utils/certification'

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

const EMPTY_SENSORS: Sensor[] = []
const EMPTY_FIXTURES: Fixture[] = []

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { building, loading, error } = useBuildingDetail(id)
  const { role } = useAuth()
  const showMagnetometerUi = role !== 'client'

  // BHI passed via navigation state from the buildings list — available instantly
  const navState = location.state as { bhi?: number; bhiLabel?: string } | null
  const instantBhi = building?.bhi ?? navState?.bhi ?? null
  const instantBhiLabel = building?.bhi_label ?? navState?.bhiLabel ?? null

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
  const sensors = localSensors ?? building?.sensors ?? EMPTY_SENSORS

  // Local fixture state for optimistic updates
  const [localFixtures, setLocalFixtures] = useState<Fixture[] | null>(null)
  const fixtures = localFixtures ?? building?.fixtures ?? EMPTY_FIXTURES

  const [localFloors, setLocalFloors] = useState<number | null>(null)
  const numberOfFloors = localFloors ?? building?.number_of_floors ?? 1

  const [localName, setLocalName] = useState<string | null | undefined>(undefined)
  const displayName = localName !== undefined ? localName : building?.name ?? null

  const [localAddress, setLocalAddress] = useState<string | null | undefined>(undefined)
  const displayAddress = localAddress !== undefined ? localAddress : building?.full_address ?? null

  const [localClient, setLocalClient] = useState<Building['client'] | undefined>(undefined)
  const displayClient = localClient !== undefined ? localClient : building?.client

  const [footprintExpanded, setFootprintExpanded] = useState(false)

  // Parse building ID from URL param so analytics can start immediately
  const buildingIdNum = id ? parseInt(id, 10) : null
  const validBuildingIdForHook =
    buildingIdNum !== null && !Number.isNaN(buildingIdNum) ? buildingIdNum : null

  // Single analytics + health hook, shared by hero, mag section, and flow chart.
  const {
    data: analyticsData,
    health: healthData,
    magChart,
    loading: analyticsLoading,
  } = useBuildingAnalytics(validBuildingIdForHook)

  const handleEditSaved = useCallback((updates: Partial<Building>) => {
    if (updates.name !== undefined) setLocalName(updates.name ?? null)
    if (updates.full_address !== undefined) setLocalAddress(updates.full_address ?? null)
    if (updates.number_of_floors != null) setLocalFloors(updates.number_of_floors)
    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      setGeocodedCoords(
        updates.latitude != null && updates.longitude != null
          ? { latitude: updates.latitude, longitude: updates.longitude }
          : null,
      )
    }
    if (updates.client !== undefined) setLocalClient(updates.client)
  }, [])

  const [editingPanel, setEditingPanel] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const { executeQuery: updateBuildingName } = useGraphQL(UPDATE_BUILDING_NAME)
  const { executeQuery: updateBuildingCoordinates } = useGraphQL(UPDATE_BUILDING_COORDINATES)
  const { executeQuery: updateBuildingFootprint } = useGraphQL(UPDATE_BUILDING_FOOTPRINT)
  const { executeQuery: updateBuildingFloors } = useGraphQL(UPDATE_BUILDING_FLOORS)
  const { executeQuery: updateSensorPosition } = useGraphQL(UPDATE_SENSOR_POSITION)
  const { executeQuery: createSensor } = useGraphQL<{ insert_sensor_one: Sensor }>(CREATE_SENSOR)
  const { executeQuery: updateSensorArea } = useGraphQL(UPDATE_SENSOR_AREA)
  const { executeQuery: createFixture } = useGraphQL<{ insert_fixtures_one: Fixture }>(CREATE_FIXTURE)
  const { executeQuery: updateFixturePosition } = useGraphQL(UPDATE_FIXTURE_POSITION)
  const { executeQuery: deleteFixture } = useGraphQL(DELETE_FIXTURE)

  const updateBuildingNameRef = useRef(updateBuildingName); updateBuildingNameRef.current = updateBuildingName
  const updateBuildingCoordinatesRef = useRef(updateBuildingCoordinates); updateBuildingCoordinatesRef.current = updateBuildingCoordinates
  const updateBuildingFootprintRef = useRef(updateBuildingFootprint); updateBuildingFootprintRef.current = updateBuildingFootprint
  const updateBuildingFloorsRef = useRef(updateBuildingFloors); updateBuildingFloorsRef.current = updateBuildingFloors
  const updateSensorPositionRef = useRef(updateSensorPosition); updateSensorPositionRef.current = updateSensorPosition
  const createSensorRef = useRef(createSensor); createSensorRef.current = createSensor
  const updateSensorAreaRef = useRef(updateSensorArea); updateSensorAreaRef.current = updateSensorArea
  const createFixtureRef = useRef(createFixture); createFixtureRef.current = createFixture
  const updateFixturePositionRef = useRef(updateFixturePosition); updateFixturePositionRef.current = updateFixturePosition
  const deleteFixtureRef = useRef(deleteFixture); deleteFixtureRef.current = deleteFixture

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
          updateBuildingCoordinatesRef.current({
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
  }, [building, ])

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
        updateBuildingFootprintRef.current({
          id: building.id,
          footprint: footprint.coordinates,
        })
      }
    },
    [building, ],
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
      updateSensorPositionRef.current({
        id: sensorId,
        floor_number: floor,
        location_on_floor: position,
      })
    },
    [building?.sensors, ],
  )

  const handleFloorsChange = useCallback(
    (floors: number) => {
      setLocalFloors(floors)
      if (building) {
        updateBuildingFloorsRef.current({ id: building.id, number_of_floors: floors })
      }
    },
    [building, ],
  )

  const handleSensorCreate = useCallback(
    async (name: string) => {
      if (!building) return
      const result = await createSensorRef.current({
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
    [building, ],
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
      updateSensorAreaRef.current({ id: sensorId, area_covered: area })
    },
    [building?.sensors, ],
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
      updateSensorPositionRef.current({
        id: sensorId,
        floor_number: null,
        location_on_floor: null,
      })
      updateSensorAreaRef.current({ id: sensorId, area_covered: null })
    },
    [building?.sensors, ],
  )

  const handleFixtureCreate = useCallback(
    async (type: FixtureType, floor: number) => {
      if (!building) return
      const result = await createFixtureRef.current({
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
    [building, ],
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
      updateFixturePositionRef.current({
        id: fixtureId,
        location_on_floor: position,
        sensor_id: sensorId,
      })
    },
    [building?.fixtures, localFixtures, sensors, ],
  )

  const handleFixtureRemoved = useCallback(
    (fixtureId: number) => {
      setLocalFixtures((prev) => {
        const list = prev ?? building?.fixtures ?? []
        return list.filter((f) => f.id !== fixtureId)
      })
      deleteFixtureRef.current({ id: fixtureId })
    },
    [building?.fixtures, ],
  )

  const validBuildingId = validBuildingIdForHook

  // Priority: user selection > saved in DB > Overpass API result
  const displayFootprints = selectedFootprint
    ? [selectedFootprint]
    : building?.footprint
      ? [{ id: building.id, coordinates: building.footprint }]
      : footprints

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (!loading && !building) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
        Building not found
      </div>
    )
  }

  const clientName = displayClient
    ? [displayClient.first_name, displayClient.last_name].filter(Boolean).join(' ')
    : null

  const shimmer =
    'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/[0.06]'

  return (
    <div>
      {/* Compact header row */}
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <button
          onClick={() => navigate('/dashboard/buildings')}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Back to Buildings"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className={`h-6 w-40 rounded-md bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
            <div className={`hidden h-4 w-48 rounded-md bg-gray-200/70 dark:bg-gray-700/50 sm:block ${shimmer}`} />
          </div>
        ) : building ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={() => {
                    const trimmed = nameValue.trim() || null
                    setEditingName(false)
                    setLocalName(trimmed)
                    updateBuildingNameRef.current({ id: building.id, name: trimmed })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') {
                      setNameValue(displayName ?? '')
                      setEditingName(false)
                    }
                  }}
                  className="border-b-2 border-indigo-500 bg-transparent text-lg font-bold outline-none"
                  autoFocus
                />
              ) : (
                <h1
                  className="cursor-pointer truncate text-lg font-bold"
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
              {displayAddress && (
                <span className="truncate text-sm text-gray-400 dark:text-gray-500">
                  {displayAddress}
                </span>
              )}
              {clientName && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  · {clientName}
                </span>
              )}
            </div>

            {/* Certification link */}
            <button
              onClick={() => navigate(`/dashboard/buildings/${id}/certification`, {
                state: { bhi: instantBhi, bhiLabel: instantBhiLabel },
              })}
              className={`ml-auto shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isCertificationEligible(instantBhi)
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700'
              }`}
              title="Building Certification"
            >
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Certification
              </span>
            </button>

            {/* Edit toggle */}
            <button
              onClick={() => setEditingPanel((v) => !v)}
              className={`shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 ${editingPanel ? 'bg-gray-100 text-indigo-500 dark:bg-gray-700 dark:text-indigo-400' : ''}`}
              title="Edit building details"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {/* Edit panel */}
      {editingPanel && building && (
        <div className="mb-4 sm:mb-5">
          <BuildingEditPanel
            building={{
              ...building,
              name: displayName ?? building.name,
              full_address: displayAddress ?? building.full_address,
              number_of_floors: numberOfFloors,
              client: displayClient,
              latitude: geocodedCoords?.latitude ?? building.latitude,
              longitude: geocodedCoords?.longitude ?? building.longitude,
            }}
            onSaved={handleEditSaved}
            onClose={() => setEditingPanel(false)}
            onDeleted={() => navigate('/dashboard/buildings')}
          />
        </div>
      )}

      {/* 1. HERO — quick stats + WHI + 3 pillars + fixture reference */}
      {validBuildingId != null && (
        <div className="mb-4 sm:mb-6">
          <BuildingOverviewHero
            buildingId={validBuildingId}
            health={healthData}
            analytics={analyticsData}
            footprint={building?.footprint ?? null}
            numberOfFloors={numberOfFloors}
            address={displayAddress ?? building?.full_address ?? null}
            loading={analyticsLoading}
          />
        </div>
      )}

      {/* 2. UNIFIED CHART — flow rate / usage toggle, with interval selector */}
      {validBuildingId != null && (
        <div className="mb-4 sm:mb-6">
          <BuildingFlowChart buildingId={validBuildingId} />
        </div>
      )}

      {/* 3. FIXTURES STRIP — typed icons, grouped by DB fixture type */}
      {validBuildingId != null && (
        <div className="mb-4 sm:mb-6">
          <BuildingFixturesStrip buildingId={validBuildingId} />
        </div>
      )}

      {/* 4. Map views — flat, not collapsible */}
      <div className="mb-4 sm:mb-6">
        {loading ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <div className={`h-72 rounded-xl bg-gray-200/70 dark:bg-gray-700/50 sm:h-96 ${shimmer}`} />
            <div className={`h-72 rounded-xl bg-gray-200/70 dark:bg-gray-700/50 sm:h-96 ${shimmer}`} />
          </div>
        ) : building ? (
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
        ) : null}
      </div>

      {/* Magnetometer raw signals — admin only, flat (not collapsible) */}
      {showMagnetometerUi && magChart.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <MagDataSection data={magChart} />
        </div>
      )}

      {/* Expanded footprint overlay */}
      {footprintExpanded && building && (
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
