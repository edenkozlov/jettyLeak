import { useEffect, useMemo, useRef, useState } from 'react'

import useAuth from '@/hooks/auth/useAuth'
import { GET_BUILDINGS_OVERVIEW } from '@/queries/getBuildingsOverview'
import {
  GET_BULK_FLOW_STATUS,
  type BulkFlowStatusRow,
} from '@/queries/getBulkFlowStatus'
import type { Building } from '@/types'

export interface BuildingWithOverview extends Building {
  today_volume_litres: number
  last_activity_at: string | null
}

/** Map from building_id → flow status row */
export type FlowStatusMap = Record<number, BulkFlowStatusRow>

export function useBuildingsPage() {
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const [buildings, setBuildings] = useState<BuildingWithOverview[]>([])
  const [flowStatus, setFlowStatus] = useState<FlowStatusMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch buildings overview (1 request)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const rows = await GET_BUILDINGS_OVERVIEW(
          isClient ? { clientId: client_id } : undefined,
        )
        if (cancelled) return

        const mapped: BuildingWithOverview[] = rows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          name: r.name,
          full_address: r.full_address,
          latitude: r.latitude,
          longitude: r.longitude,
          client_id: r.client_id,
          number_of_floors: r.number_of_floors,
          bhi: r.bhi,
          bhi_label: r.bhi_label,
          bhi_updated_at: null,
          footprint: null,
          total_sqft: null,
          sensors_aggregate: { aggregate: { count: r.sensor_count } },
          client: r.client_first_name || r.client_last_name
            ? { id: r.client_id ?? '', created_at: '', email: null, first_name: r.client_first_name, last_name: r.client_last_name }
            : undefined,
          today_volume_litres: r.today_volume_litres,
          last_activity_at: r.last_activity_at,
        }))

        setBuildings(mapped)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load buildings')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [isClient, client_id])

  // Bulk flow status polling (1 request for ALL buildings every 10s)
  const buildingIdsRef = useRef<number[]>([])
  buildingIdsRef.current = useMemo(() => buildings.map((b) => b.id), [buildings])

  useEffect(() => {
    if (buildings.length === 0) return

    let cancelled = false

    const poll = async () => {
      if (cancelled || document.hidden) return
      try {
        const rows = await GET_BULK_FLOW_STATUS(buildingIdsRef.current)
        if (cancelled) return
        const map: FlowStatusMap = {}
        for (const r of rows) {
          map[r.building_id] = r
        }
        setFlowStatus(map)
      } catch {
        // Silently retry on next interval
      }
    }

    poll()
    const id = setInterval(poll, 10_000)

    const onVisibility = () => {
      if (!document.hidden && !cancelled) poll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [buildings.length])

  return {
    buildings,
    flowStatus,
    loading,
    error,
  }
}

export default useBuildingsPage
