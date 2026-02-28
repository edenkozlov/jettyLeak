import { useEffect, useMemo } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_BUILDING_BY_ID } from '@/queries/getBuildingById'

import type { Building } from '@/types'

interface BuildingByIdResponse {
  building_by_pk: Building | null
}

export function useBuildingDetail(buildingId: string | undefined) {
  const { data, loading, error, executeQuery } =
    useGraphQL<BuildingByIdResponse>(GET_BUILDING_BY_ID)

  useEffect(() => {
    if (buildingId) {
      executeQuery({ id: buildingId })
    }
  }, [buildingId, executeQuery])

  const building = useMemo(() => data?.building_by_pk ?? null, [data])

  return {
    building,
    loading,
    error,
  }
}

export default useBuildingDetail
