import { supabase } from '@/lib/supabase'

export interface SignalSummaryRow {
  signal_type: number
  signal_count: number
  total_duration_s: number
  avg_confidence: number
  first_seen: string
  last_seen: string
}

/**
 * Aggregated signal breakdown per type. Returns one row per signal type
 * with count, total duration, and average confidence.
 */
export async function GET_SIGNAL_SUMMARY(
  sensorId: number,
  since: string,
  until: string,
): Promise<SignalSummaryRow[]> {
  const { data, error } = await supabase.rpc('get_signal_summary', {
    p_sensor_id: sensorId,
    p_since: since,
    p_until: until,
  })
  if (error) throw error
  return (data ?? []) as SignalSummaryRow[]
}

export interface DownsampledSignalRow {
  id: number
  created_at: string
  value: string
  time: string
  sensor_id: number
  start_time: string
  end_time: string
}

/**
 * Fetch capped signal rows for chart overlay. Returns up to p_max_rows
 * signals ordered by start_time.
 */
export async function GET_SIGNAL_DOWNSAMPLED(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId as number
  const since = variables?.since as string
  const until = variables?.until as string
  const maxRows = (variables?.maxRows as number) ?? 500
  if (!sensorId) return { signal: [] as DownsampledSignalRow[] }

  const { data, error } = await supabase.rpc('get_signal_downsampled', {
    p_sensor_id: sensorId,
    p_since: since,
    p_until: until,
    p_max_rows: maxRows,
  })

  if (error) throw error
  return { signal: (data ?? []) as DownsampledSignalRow[] }
}
