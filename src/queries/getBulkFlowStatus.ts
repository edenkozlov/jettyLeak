import { supabase } from '@/lib/supabase'

export interface BulkFlowStatusRow {
  building_id: number
  mag_sensor_id: number | null
  multiplier: number | null
  recent_row_count: number
  has_activity: boolean
  avg_band_energy: number
  last_reading_at: string | null
}

/**
 * Batch live-flow check for multiple buildings in ONE request.
 * Replaces N individual polling loops (each doing 2-3 requests).
 */
export async function GET_BULK_FLOW_STATUS(buildingIds: number[]) {
  if (buildingIds.length === 0) return [] as BulkFlowStatusRow[]

  const { data, error } = await supabase.rpc('get_bulk_flow_status', {
    p_building_ids: buildingIds,
  })
  if (error) throw error
  return (data ?? []) as BulkFlowStatusRow[]
}
