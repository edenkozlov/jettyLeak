import { useEffect, useMemo } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_DASHBOARD_STATS } from '@/queries/getDashboardStats'

interface AggregateCount {
  aggregate: { count: number }
}

interface DashboardStatsResponse {
  client_aggregate: AggregateCount
  building_aggregate: AggregateCount
  sensor_aggregate: AggregateCount
  report_aggregate: AggregateCount
}

export function useHomePage() {
  const { data, loading, error, executeQuery } =
    useGraphQL<DashboardStatsResponse>(GET_DASHBOARD_STATS)

  useEffect(() => {
    executeQuery()
  }, [executeQuery])

  const clientCount = useMemo(
    () => data?.client_aggregate?.aggregate?.count ?? 0,
    [data],
  )

  const buildingCount = useMemo(
    () => data?.building_aggregate?.aggregate?.count ?? 0,
    [data],
  )

  const sensorCount = useMemo(
    () => data?.sensor_aggregate?.aggregate?.count ?? 0,
    [data],
  )

  const reportCount = useMemo(
    () => data?.report_aggregate?.aggregate?.count ?? 0,
    [data],
  )

  return {
    clientCount,
    buildingCount,
    sensorCount,
    reportCount,
    loading,
    error,
  }
}

export default useHomePage
