import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'

import useAuth from '@/hooks/auth/useAuth'
import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_SENSORS, GET_SENSORS_BY_CLIENT_ID } from '@/queries/getSensors'
import type { Sensor } from '@/types'

/**
 * Legacy /dashboard/reports/* routes — resolve the sensor's building and
 * redirect to the consolidated building page.
 */
export default function ReportsRedirect() {
  const { sensorId: sensorIdParam } = useParams<{ sensorId: string }>()
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const { data, loading, executeQuery } = useGraphQL<{ sensor: Sensor[] }>(
    isClient ? GET_SENSORS_BY_CLIENT_ID : GET_SENSORS,
  )

  useEffect(() => {
    if (isClient) executeQuery({ clientId: client_id })
    else executeQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, client_id])

  if (loading || !data?.sensor) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  const sensors = data.sensor
  const paramId = sensorIdParam ? Number(sensorIdParam) : null
  const target =
    (paramId != null && sensors.find((s) => s.id === paramId)) ||
    sensors[sensors.length - 1] ||
    null

  if (!target?.building_id) {
    return <Navigate to="/dashboard/buildings" replace />
  }
  return <Navigate to={`/dashboard/buildings/${target.building_id}`} replace />
}
