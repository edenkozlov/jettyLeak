import { supabase } from '@/lib/supabase'

export async function GET_SENSOR_DATA(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string
  const reportLimit = variables?.reportLimit as number | undefined
  const magSensorIds = variables?.magSensorIds as number[] | undefined
  const magLimit = variables?.magLimit as number | undefined

  const reportQuery = supabase
    .from('report')
    .select('id, created_at, sensor_id, flow_value, temp_value')
    .eq('sensor_id', sensorId)
    .gte('created_at', since)
    .lte('created_at', until)
    .order('created_at', { ascending: true })
  if (reportLimit) reportQuery.limit(reportLimit)

  const signalQuery = supabase
    .from('signal')
    .select('id, created_at, value, time, sensor_id, start_time, end_time')
    .eq('sensor_id', sensorId)
    .gte('end_time', since)
    .lte('start_time', until)
    .order('start_time', { ascending: true })

  let magQuery = supabase
    .from('mag_report')
    .select('id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id, band_energy_10s, band_energy_60s, band_energy_5m, dominant_freq_hz, vibration_rpm')
    .in('sensor_id', magSensorIds ?? [])
    .gte('created_at', since)
    .lte('created_at', until)
    .order('created_at', { ascending: true })
  if (magLimit) magQuery = magQuery.limit(magLimit)

  const [reportResult, signalResult, magResult] = await Promise.all([
    reportQuery,
    signalQuery,
    magQuery,
  ])

  if (reportResult.error) throw reportResult.error
  if (signalResult.error) throw signalResult.error
  if (magResult.error) throw magResult.error

  return {
    report: reportResult.data ?? [],
    signal: signalResult.data ?? [],
    mag_report: magResult.data ?? [],
  }
}
