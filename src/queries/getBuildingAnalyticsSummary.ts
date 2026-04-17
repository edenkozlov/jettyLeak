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
  leak_score: number | null
}

/**
 * Single RPC returning pre-computed analytics for a building.
 * Passes browser timezone so "today" aligns with user's local time.
 */
export async function GET_BUILDING_ANALYTICS_SUMMARY(buildingId: number) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Montreal'
  const { data, error } = await supabase.rpc('get_building_analytics_summary', {
    p_building_id: buildingId,
    p_timezone: tz,
  })
  if (error) throw error
  return data as BuildingAnalyticsSummary
}
