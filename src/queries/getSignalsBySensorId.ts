import { supabase } from '@/lib/supabase'

export async function GET_SIGNALS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId

  const { data, error } = await supabase
    .from('signal')
    .select('id, created_at, value, time, sensor_id, start_time, end_time')
    .eq('sensor_id', sensorId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error(`[SIGNALS] error fetching for sensor=${sensorId}:`, error)
    throw error
  }

  console.log(`[SIGNALS] sensor=${sensorId} → ${data?.length ?? 0} signals`, data?.slice(0, 3))

  return { signal: data ?? [] } as any
}
