import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Dashboard counts — single RPC instead of 4 separate count queries
// ---------------------------------------------------------------------------

interface DashboardCounts {
  client_count: number
  building_count: number
  sensor_count: number
  report_count: number
}

export async function GET_DASHBOARD_STATS() {
  const { data, error } = await supabase.rpc('get_dashboard_counts')
  if (error) throw error
  const counts = data as DashboardCounts
  return {
    client_aggregate: { aggregate: { count: counts.client_count } },
    building_aggregate: { aggregate: { count: counts.building_count } },
    sensor_aggregate: { aggregate: { count: counts.sensor_count } },
    report_aggregate: { aggregate: { count: counts.report_count } },
  }
}

export async function GET_DASHBOARD_STATS_BY_CLIENT(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId as string
  const { data, error } = await supabase.rpc('get_dashboard_counts', {
    p_client_id: clientId,
  })
  if (error) throw error
  const counts = data as DashboardCounts
  return {
    building_aggregate: { aggregate: { count: counts.building_count } },
    sensor_aggregate: { aggregate: { count: counts.sensor_count } },
    report_aggregate: { aggregate: { count: counts.report_count } },
  }
}

// ---------------------------------------------------------------------------
// Recent buildings — these are already efficient (single query, limit 5)
// ---------------------------------------------------------------------------

export async function GET_RECENT_BUILDINGS() {
  const { data, error } = await supabase
    .from('building')
    .select('id, name, full_address, bhi, bhi_label, client_id, created_at, client(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw error
  return { buildings: data ?? [] }
}

export async function GET_RECENT_BUILDINGS_BY_CLIENT(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId as string
  const { data, error } = await supabase
    .from('building')
    .select('id, name, full_address, bhi, bhi_label, client_id, created_at, client(first_name, last_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw error
  return { buildings: data ?? [] }
}
