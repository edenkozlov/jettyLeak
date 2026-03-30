import { useEffect, useMemo, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GET_BUILDING_BY_ID } from '@/queries/getBuildingById'

import type { Building } from '@/types'

interface BuildingByIdResponse {
  building_by_pk: Building | null
}

export function useBuildingDetail(buildingId: string | undefined) {
  const token = useAppSelector((state) => state.login.token)

  const [data, setData] = useState<BuildingByIdResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!buildingId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    GET_BUILDING_BY_ID({ id: buildingId })
      .then((result) => {
        if (cancelled) return
        setData(result as BuildingByIdResponse)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load building')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [buildingId, token])

  const building = useMemo(() => data?.building_by_pk ?? null, [data])

  return {
    building,
    loading,
    error,
  }
}

export default useBuildingDetail
