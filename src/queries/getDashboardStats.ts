import { supabase } from '@/lib/supabase'

export async function GET_DASHBOARD_STATS() {
  const [clientRes, buildingRes, sensorRes, reportRes] = await Promise.all([
    supabase.from('client').select('*', { count: 'exact', head: true }),
    supabase.from('building').select('*', { count: 'exact', head: true }),
    supabase.from('sensor').select('*', { count: 'exact', head: true }),
    supabase.from('report').select('*', { count: 'exact', head: true }),
  ])
  if (clientRes.error) throw clientRes.error
  if (buildingRes.error) throw buildingRes.error
  if (sensorRes.error) throw sensorRes.error
  if (reportRes.error) throw reportRes.error
  return {
    client_aggregate: { aggregate: { count: clientRes.count ?? 0 } },
    building_aggregate: { aggregate: { count: buildingRes.count ?? 0 } },
    sensor_aggregate: { aggregate: { count: sensorRes.count ?? 0 } },
    report_aggregate: { aggregate: { count: reportRes.count ?? 0 } },
  }
}

export async function GET_DASHBOARD_STATS_BY_CLIENT(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId as string

  const { data: buildings, error: bErr } = await supabase
    .from('building')
    .select('id')
    .eq('client_id', clientId)
  if (bErr) throw bErr

  const buildingIds = (buildings ?? []).map((b) => b.id)
  let sensorCount = 0
  let reportCount = 0

  if (buildingIds.length > 0) {
    const [sensorRes, reportRes] = await Promise.all([
      supabase
        .from('sensor')
        .select('*', { count: 'exact', head: true })
        .in('building_id', buildingIds),
      supabase
        .from('report')
        .select('*, sensor!inner(building_id)', { count: 'exact', head: true })
        .in('sensor.building_id', buildingIds),
    ])
    if (sensorRes.error) throw sensorRes.error
    sensorCount = sensorRes.count ?? 0
    reportCount = reportRes.count ?? 0
  }

  return {
    building_aggregate: { aggregate: { count: buildingIds.length } },
    sensor_aggregate: { aggregate: { count: sensorCount } },
    report_aggregate: { aggregate: { count: reportCount } },
  }
}

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
