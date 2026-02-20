import { useEffect, useMemo } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_SENSORS } from '@/queries/getSensors'

import type { Sensor } from '@/types'

interface SensorsResponse {
  sensor: Sensor[]
}

export function useSensorsPage() {
  const { data, loading, error, executeQuery } =
    useGraphQL<SensorsResponse>(GET_SENSORS)

  useEffect(() => {
    executeQuery()
  }, [executeQuery])

  const sensors = useMemo(() => data?.sensor ?? [], [data])

  return {
    sensors,
    loading,
    error,
  }
}

export default useSensorsPage
