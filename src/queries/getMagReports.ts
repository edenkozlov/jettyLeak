import { fetchAllRows } from '@/lib/supabaseFetch'

export async function GET_MAG_REPORTS(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const since = variables?.since as string
  const until = variables?.until as string
  if (!sensorIds || sensorIds.length === 0) return { mag_report: [] }

  const data = await fetchAllRows(
    'mag_report',
    'id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id, band_energy_10s, band_energy_60s, band_energy_5m, dominant_freq_hz, vibration_rpm',
    (q: any) => q.in('sensor_id', sensorIds).gte('created_at', since).lte('created_at', until),
  )

  return { mag_report: data } as any
}
