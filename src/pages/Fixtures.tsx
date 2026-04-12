import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'

import FixturesView from '@/components/FixturesView'
import { useReportsPage } from '@/hooks/useReportsPage'

export default function Fixtures() {
  const navigate = useNavigate()
  const { sensorId: sensorIdParam } = useParams<{ sensorId: string }>()
  const paramSensorId = sensorIdParam ? Number(sensorIdParam) : null

  const {
    sensors,
    selectedSensorId,
    handleSensorChange,
    magSensorIdsForQuery,
  } = useReportsPage(paramSensorId)

  const selectedBuildingId = useMemo(() => {
    if (selectedSensorId == null) return null
    return sensors.find((s) => s.id === selectedSensorId)?.building_id ?? null
  }, [sensors, selectedSensorId])

  const onSensorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = Number(e.target.value)
    handleSensorChange(newId)
    navigate(`/dashboard/fixtures/${newId}`, { replace: true })
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Fixtures</h1>

        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={() => {
              const id = selectedSensorId ?? ''
              navigate(`/dashboard/reports/${id}`)
            }}
            className="w-full shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto sm:px-3 sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            ← Back to Reports
          </button>

          <select
            value={selectedSensorId ?? ''}
            onChange={onSensorChange}
            className="min-w-0 w-full truncate rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:min-w-[12rem] sm:max-w-md sm:flex-1 sm:px-3 sm:py-2 sm:text-sm"
          >
            {sensors.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.name ?? `Sensor #${sensor.id}`}
                {sensor.building?.name ? ` — ${sensor.building.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FixturesView
        buildingId={selectedBuildingId}
        sensorId={selectedSensorId}
        magSensorIds={magSensorIdsForQuery}
        sensors={sensors}
      />
    </div>
  )
}
