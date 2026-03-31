import { useEffect, useMemo, useRef } from 'react'

import useAuth from '@/hooks/auth/useAuth'
import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_SENSORS, GET_SENSORS_BY_CLIENT_ID } from '@/queries/getSensors'

import type { Sensor } from '@/types'

interface SensorsResponse {
  sensor: Sensor[]
}

export function useSensorsPage() {
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const query = isClient ? GET_SENSORS_BY_CLIENT_ID : GET_SENSORS

  const { data, loading, error, executeQuery } =
    useGraphQL<SensorsResponse>(query)
  const executeQueryRef = useRef(executeQuery)
  executeQueryRef.current = executeQuery

  useEffect(() => {
    if (isClient) {
      executeQueryRef.current({ clientId: client_id })
    } else {
      executeQueryRef.current()
    }
  }, [isClient, client_id])

  const sensors = useMemo(() => {
    const all = data?.sensor ?? []
    if (isClient) {
      return all.filter((s) => s.building?.client_id === client_id)
    }
    return all
  }, [data, isClient, client_id])

  return {
    sensors,
    loading,
    error,
  }
}

export default useSensorsPage
