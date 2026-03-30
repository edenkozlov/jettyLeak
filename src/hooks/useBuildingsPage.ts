import { useEffect, useMemo } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import useAuth from '@/hooks/auth/useAuth'
import { GET_BUILDINGS } from '@/queries/getBuildings'
import { GET_BUILDINGS_BY_CLIENT_ID } from '@/queries/getBuildingsByClientId'

import type { Building } from '@/types'

interface BuildingsResponse {
  building: Building[]
}

export function useBuildingsPage() {
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const query = isClient ? GET_BUILDINGS_BY_CLIENT_ID : GET_BUILDINGS

  const { data, loading, error, executeQuery } =
    useGraphQL<BuildingsResponse>(query)

  useEffect(() => {
    if (isClient) {
      executeQuery({ clientId: client_id })
    } else {
      executeQuery()
    }
  }, [executeQuery, isClient, client_id])

  const buildings = useMemo(() => {
    const all = data?.building ?? []
    if (isClient) {
      return all.filter((b) => b.client_id === client_id)
    }
    return all
  }, [data, isClient, client_id])

  return {
    buildings,
    loading,
    error,
  }
}

export default useBuildingsPage
