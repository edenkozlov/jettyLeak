import { supabase } from '@/lib/supabase'

export interface BuildingAnalyticsSummary {
  today: number
  yesterday: number
  this_week: number
  last_week: number
  this_month: number
  today_active_seconds: number
  today_sessions: number
  peak_hours: number[]
}

/**
 * Single RPC returning pre-computed analytics for a building.
 * Replaces fetching ~672 flow_hourly rows and computing client-side.
 */
export async function GET_BUILDING_ANALYTICS_SUMMARY(buildingId: number) {
  const { data, error } = await supabase.rpc('get_building_analytics_summary', {
    p_building_id: buildingId,
  })
  if (error) throw error
  return data as BuildingAnalyticsSummary
}
