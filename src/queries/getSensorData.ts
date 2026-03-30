import { fetchAllRows } from '@/lib/supabaseFetch'

export async function GET_SENSOR_DATA(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string
  const magSensorIds = variables?.magSensorIds as number[] | undefined
  const hasMagIds = magSensorIds && magSensorIds.length > 0

  const [reports, signals, magReports] = await Promise.all([
    fetchAllRows('report', 'id, created_at, sensor_id, flow_value, temp_value', (q: any) =>
      q.eq('sensor_id', sensorId).gte('created_at', since).lte('created_at', until),
    ),
    fetchAllRows('signal', 'id, created_at, value, time, sensor_id, start_time, end_time', (q: any) =>
      q.eq('sensor_id', sensorId).gte('end_time', since).lte('start_time', until),
      'start_time',
    ),
    hasMagIds
      ? fetchAllRows('mag_report', 'id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id, band_energy_10s, band_energy_60s, band_energy_5m, dominant_freq_hz, vibration_rpm', (q: any) =>
          q.in('sensor_id', magSensorIds!).gte('created_at', since).lte('created_at', until),
        )
      : ([] as any[]),
  ])

  return {
    report: reports,
    signal: signals,
    mag_report: magReports,
  } as any
}
