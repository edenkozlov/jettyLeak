import { fetchTimeSeriesRows } from '@/lib/supabaseFetch'

export async function GET_SENSOR_DATA(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string
  const magSensorIds = variables?.magSensorIds as number[] | undefined
  const hasMagIds = magSensorIds && magSensorIds.length > 0

  const [reports, signals, magReports] = await Promise.all([
    fetchTimeSeriesRows('report', 'id, created_at, sensor_id, flow_value, temp_value',
      'created_at', since, until,
      (q: any) => q.eq('sensor_id', sensorId),
    ),
    fetchTimeSeriesRows('signal', 'id, created_at, value, time, sensor_id, start_time, end_time',
      'start_time', since, until,
      (q: any) => q.eq('sensor_id', sensorId),
    ),
    hasMagIds
      ? fetchTimeSeriesRows('mag_report',
          'id, created_at, x_axis_reading, y_axis_reading, z_axis_reading, total_magnitude, sensor_id, band_energy_10s, band_energy_60s, band_energy_5m, dominant_freq_hz, vibration_rpm',
          'created_at', since, until,
          (q: any) => q.in('sensor_id', magSensorIds!),
        )
      : [],
  ])

  return {
    report: reports,
    signal: signals,
    mag_report: magReports,
  } as any
}
