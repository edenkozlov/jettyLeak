import { supabase } from '@/lib/supabase'

export const LATEST_REPORT_SUBSCRIPTION_TABLE = 'report'
export const LATEST_REPORT_SUBSCRIPTION_EVENT = 'INSERT'

export async function LATEST_REPORT_SUBSCRIPTION(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const { data, error } = await supabase
    .from('report')
    .select('id, created_at, sensor_id, flow_value, temp_value')
    .eq('sensor_id', sensorId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return { report: data ?? [] }
}
