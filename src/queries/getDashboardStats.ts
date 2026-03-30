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
