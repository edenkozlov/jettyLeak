import { supabase } from '@/lib/supabase'

export async function GET_RANGE_LABELS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const { data, error } = await supabase
    .from('range_label')
    .select('id, created_at, start_date, end_date, label, sensor')
    .eq('sensor', sensorId)
    .order('start_date', { ascending: true })
  if (error) throw error
  return { range_label: data ?? [] }
}
