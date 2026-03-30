import { supabase } from '@/lib/supabase'

export const LATEST_MAG_REPORT_SUBSCRIPTION_TABLE = 'mag_report'
export const LATEST_MAG_REPORT_SUBSCRIPTION_EVENT = 'INSERT'

export async function LATEST_MAG_REPORT_SUBSCRIPTION(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const { data, error } = await supabase
    .from('mag_report')
    .select('id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id, band_energy_10s, band_energy_60s, band_energy_5m, dominant_freq_hz, vibration_rpm')
    .in('sensor_id', sensorIds)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return { mag_report: data ?? [] }
}
