import { supabase } from '@/lib/supabase'

export async function GET_REPORTS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string
  const limit = variables?.limit as number | undefined
  let query = supabase
    .from('report')
    .select('id, created_at, sensor_id, flow_value, temp_value')
    .eq('sensor_id', sensorId)
    .gte('created_at', since)
    .lte('created_at', until)
    .order('created_at', { ascending: true })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  return { report: data ?? [] }
}
