import { supabase } from '@/lib/supabase'

export async function GET_SIGNALS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string
  const { data, error } = await supabase
    .from('signal')
    .select('id, created_at, value, time, sensor_id, start_time, end_time')
    .eq('sensor_id', sensorId)
    .gte('end_time', since)
    .lte('start_time', until)
    .order('start_time', { ascending: true })
  if (error) throw error
  return { signal: data ?? [] }
}
