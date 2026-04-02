import { supabase } from '@/lib/supabase'

export interface BuildingOverviewRow {
  id: number
  created_at: string
  name: string | null
  full_address: string | null
  latitude: number | null
  longitude: number | null
  client_id: string | null
  number_of_floors: number | null
  bhi: number | null
  bhi_label: string | null
  client_first_name: string | null
  client_last_name: string | null
  sensor_count: number
  today_volume_litres: number
  last_activity_at: string | null
}

/**
 * Single RPC returning all buildings with sensor count, today's volume,
 * and last activity time. Replaces GET_BUILDINGS + N sensor-count queries
 * + N live-flow polling loops.
 */
export async function GET_BUILDINGS_OVERVIEW(variables?: Record<string, unknown>) {
  const clientId = (variables?.clientId as string) ?? null

  const { data, error } = await supabase.rpc('get_buildings_overview', {
    p_client_id: clientId,
  })
  if (error) throw error
  return (data ?? []) as BuildingOverviewRow[]
}
