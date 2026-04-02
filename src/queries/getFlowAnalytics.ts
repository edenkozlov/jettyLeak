import { supabase } from '@/lib/supabase'

export interface FlowHourlyRow {
  sensor_id: number
  hour_start: string
  peak_count: number
  volume_litres: number
  active_seconds: number
  session_count: number
  avg_total: number | null
  min_total: number | null
  max_total: number | null
  stddev_total: number | null
  avg_x: number | null
  avg_y: number | null
  avg_z: number | null
  row_count: number
}

/**
 * Fetch pre-aggregated hourly flow stats from the flow_hourly table.
 * Returns at most ~672 rows for 28 days — one HTTP request.
 */
export async function GET_FLOW_ANALYTICS(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const since = variables?.since as string
  const until = variables?.until as string
  if (!sensorIds || sensorIds.length === 0) return { rows: [] as FlowHourlyRow[] }

  const { data, error } = await supabase.rpc('get_flow_analytics', {
    p_sensor_ids: sensorIds,
    p_since: since,
    p_until: until,
  })

  if (error) throw error
  return { rows: (data ?? []) as FlowHourlyRow[] }
}

export interface DownsampledMagRow {
  created_at: string
  sensor_id: number
  x_axis_reading: number | null
  y_axis_reading: number | null
  z_axis_reading: number | null
  total_magnitude: number | null
  band_energy_10s: number | null
  band_energy_60s: number | null
  band_energy_5m: number | null
  dominant_freq_hz: number | null
  vibration_rpm: number | null
}

/**
 * Fetch downsampled mag data for charts — returns ~1500 evenly-spaced points.
 * One HTTP request regardless of time range.
 */
export async function GET_MAG_DOWNSAMPLED(variables?: Record<string, unknown>) {
  const sensorIds = variables?.sensorIds as number[]
  const since = variables?.since as string
  const until = variables?.until as string
  const maxPoints = (variables?.maxPoints as number) ?? 1500
  if (!sensorIds || sensorIds.length === 0) return { mag_report: [] as DownsampledMagRow[] }

  const { data, error } = await supabase.rpc('get_mag_downsampled', {
    p_sensor_ids: sensorIds,
    p_since: since,
    p_until: until,
    p_max_points: maxPoints,
  })

  if (error) throw error
  return { mag_report: (data ?? []) as DownsampledMagRow[] }
}
