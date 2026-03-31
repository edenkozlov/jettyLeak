import { useEffect, useMemo } from 'react'

import useAuth from '@/hooks/auth/useAuth'
import { useGraphQL } from '@/hooks/useGraphQL'
import {
  GET_DASHBOARD_STATS,
  GET_DASHBOARD_STATS_BY_CLIENT,
  GET_RECENT_BUILDINGS,
  GET_RECENT_BUILDINGS_BY_CLIENT,
} from '@/queries/getDashboardStats'

interface AggregateCount {
  aggregate: { count: number }
}

interface AdminStatsResponse {
  client_aggregate: AggregateCount
  building_aggregate: AggregateCount
  sensor_aggregate: AggregateCount
  report_aggregate: AggregateCount
}

interface ClientStatsResponse {
  building_aggregate: AggregateCount
  sensor_aggregate: AggregateCount
  report_aggregate: AggregateCount
}

interface RecentBuilding {
  id: number
  name: string | null
  full_address: string | null
  bhi: number | null
  bhi_label: string | null
  client_id: string | null
  created_at: string
  client?: { first_name: string | null; last_name: string | null }[] | null
}

interface RecentBuildingsResponse {
  buildings: RecentBuilding[]
}

export function useHomePage() {
  const { role, client_id, userData } = useAuth()
  const isClient = role === 'client' && !!client_id
  const isAdmin = role === 'admin'

  const statsQuery = isClient ? GET_DASHBOARD_STATS_BY_CLIENT : GET_DASHBOARD_STATS
  const buildingsQuery = isClient ? GET_RECENT_BUILDINGS_BY_CLIENT : GET_RECENT_BUILDINGS

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    executeQuery: execStats,
  } = useGraphQL<AdminStatsResponse | ClientStatsResponse>(statsQuery)

  const {
    data: buildingsData,
    loading: buildingsLoading,
    error: buildingsError,
    executeQuery: execBuildings,
  } = useGraphQL<RecentBuildingsResponse>(buildingsQuery)

  useEffect(() => {
    if (isClient) {
      execStats({ clientId: client_id })
      execBuildings({ clientId: client_id })
    } else {
      execStats()
      execBuildings()
    }
  }, [execStats, execBuildings, isClient, client_id])

  const clientCount = useMemo(
    () => (statsData as AdminStatsResponse)?.client_aggregate?.aggregate?.count ?? 0,
    [statsData],
  )
  const buildingCount = useMemo(
    () => statsData?.building_aggregate?.aggregate?.count ?? 0,
    [statsData],
  )
  const sensorCount = useMemo(
    () => statsData?.sensor_aggregate?.aggregate?.count ?? 0,
    [statsData],
  )
  const reportCount = useMemo(
    () => statsData?.report_aggregate?.aggregate?.count ?? 0,
    [statsData],
  )

  const recentBuildings = useMemo(
    () => buildingsData?.buildings ?? [],
    [buildingsData],
  )

  const userName = useMemo(() => {
    const name = (userData?.name as string) ?? (userData?.email as string) ?? ''
    return name.split(/[\s@]/)[0] ?? ''
  }, [userData])

  return {
    isAdmin,
    isClient,
    userName,
    clientCount,
    buildingCount,
    sensorCount,
    reportCount,
    recentBuildings,
    loading: statsLoading || buildingsLoading,
    error: statsError || buildingsError,
  }
}

export default useHomePage
