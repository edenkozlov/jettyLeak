import { useEffect, useMemo } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_BUILDINGS } from '@/queries/getBuildings'

import type { Building } from '@/types'

interface BuildingsResponse {
  building: Building[]
}

export function useBuildingsPage() {
  const { data, loading, error, executeQuery } =
    useGraphQL<BuildingsResponse>(GET_BUILDINGS)

  useEffect(() => {
    executeQuery()
  }, [executeQuery])

  const buildings = useMemo(() => data?.building ?? [], [data])

  return {
    buildings,
    loading,
    error,
  }
}

export default useBuildingsPage
