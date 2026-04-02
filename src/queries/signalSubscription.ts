import { supabase } from '@/lib/supabase'

export async function LATEST_SIGNAL_SUBSCRIPTION(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId as number
  const { data, error } = await supabase
    .from('signal')
    .select('id, created_at, value, time, sensor_id, start_time, end_time')
    .eq('sensor_id', sensorId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return { signal: data ?? [] }
}
