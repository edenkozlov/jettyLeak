import { supabase } from '@/lib/supabase'

export async function GET_MAG_SENSORS_BY_BUILDING_ID(variables?: Record<string, unknown>) {
  const buildingId = variables?.buildingId
  const { data, error } = await supabase
    .from('mag_to_building')
    .select('mag_id')
    .eq('building_id', buildingId)
  if (error) throw error
  return { mag_to_building: data ?? [] }
}

export async function GET_MAG_REPORTS_BY_SENSOR_IDS(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const since = variables?.since as string
  const until = variables?.until as string
  const limit = variables?.limit as number | undefined
  let query = supabase
    .from('mag_report')
    .select('id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id')
    .in('sensor_id', sensorIds)
    .gte('created_at', since)
    .lte('created_at', until)
    .order('created_at', { ascending: true })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  return { mag_report: data ?? [] }
}
