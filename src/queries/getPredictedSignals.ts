import { supabase } from '@/lib/supabase'

export async function GET_PREDICTED_SIGNALS(variables?: Record<string, unknown>) {
  const limit = variables?.limit as number
  const where = variables?.where as Record<string, any> | undefined

  let query = supabase
    .from('predicted_signal')
    .select('id, created_at, start_time, end_time, prediction, confidence, sensor_id, sensor(name, building(name))')
    .order('created_at', { ascending: false })
    .limit(limit)

  // Apply basic where filters if provided
  if (where?.sensor_id?._eq) {
    query = query.eq('sensor_id', where.sensor_id._eq)
  }
  if (where?.sensor_id?._in) {
    query = query.in('sensor_id', where.sensor_id._in)
  }

  const { data, error } = await query
  if (error) throw error
  return { predicted_signal: data ?? [] }
}

export async function GET_PREDICTED_SIGNALS_BY_SENSOR(variables?: Record<string, unknown>) {
  const limit = variables?.limit as number
  const sensorId = variables?.sensorId
  const { data, error } = await supabase
    .from('predicted_signal')
    .select('id, created_at, start_time, end_time, prediction, confidence, sensor_id, sensor(name, building(name))')
    .eq('sensor_id', sensorId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return { predicted_signal: data ?? [] }
}
