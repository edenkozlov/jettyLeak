import { supabase } from '@/lib/supabase'

export interface DownsampledReportRow {
  id: number
  created_at: string
  sensor_id: number
  flow_value: number | null
  temp_value: number | null
}

/**
 * Fetch downsampled report data for flow charts — returns ~1500 evenly-spaced
 * points via server-side NTILE bucketing. One HTTP request regardless of time range.
 */
export async function GET_REPORT_DOWNSAMPLED(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId as number
  const since = variables?.since as string
  const until = variables?.until as string
  const maxPoints = (variables?.maxPoints as number) ?? 1500
  if (!sensorId) return { report: [] as DownsampledReportRow[] }

  const { data, error } = await supabase.rpc('get_report_downsampled', {
    p_sensor_id: sensorId,
    p_since: since,
    p_until: until,
    p_max_points: maxPoints,
  })

  if (error) throw error
  return { report: (data ?? []) as DownsampledReportRow[] }
}
