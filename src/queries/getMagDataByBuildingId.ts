import { supabase } from '@/lib/supabase'
import { fetchTimeSeriesRows } from '@/lib/supabaseFetch'

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
  if (!sensorIds || sensorIds.length === 0) return { mag_report: [] }

  const data = await fetchTimeSeriesRows(
    'mag_report',
    'id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id',
    'created_at', since, until,
    (q: any) => q.in('sensor_id', sensorIds),
  )

  return { mag_report: data } as any
}
