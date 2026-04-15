import { supabase } from '@/lib/supabase'

export interface SignalRow {
  id: number
  created_at: string
  sensor_id: number
  value: string
  time: string | null
  start_time: string | null
  end_time: string | null
  /** Server-computed per-session volume from mag_report peak count / sensor.multiplier.
   * Populated by the BEFORE INSERT trigger on signal, or by backfill_signal_volumes(). */
  volume_l: number | null
  /** Server-computed average L/min for the session (volume_l / duration × 60). */
  avg_flow_lpm: number | null
}

/**
 * Batch-fetch recent signals for a set of sensor IDs in a single query.
 * Used by the Fixtures page to compute per-fixture type labels without N+1.
 *
 * @param sensorIds - array of sensor IDs to include
 * @param sinceMs  - lower bound on start_time (defaults to 30 days ago)
 * @param limit    - row cap as a safety net (default 2000). Note: Supabase's
 *                   PostgREST max-rows setting typically caps server-side at
 *                   1000 rows regardless of this value — use
 *                   {@link countSignalsForSensors} to get an accurate total.
 */
export async function getSignalsForSensors(
  sensorIds: number[],
  sinceMs: number = Date.now() - 30 * 86_400_000,
  limit = 2000,
): Promise<SignalRow[]> {
  if (sensorIds.length === 0) return []
  const { data, error } = await supabase
    .from('signal')
    .select('id, created_at, sensor_id, value, time, start_time, end_time, volume_l, avg_flow_lpm')
    .in('sensor_id', sensorIds)
    .gte('start_time', new Date(sinceMs).toISOString())
    .order('start_time', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as SignalRow[]
}

/**
 * Count-only query — returns just the total number of signals in the range
 * without shipping any rows. Uses Supabase's `head: true` + `count: 'exact'`
 * combination so PostgREST returns a Content-Range header with the true count.
 * This bypasses the max-rows cap that applies to actual row fetches.
 */
export async function countSignalsForSensors(
  sensorIds: number[],
  sinceMs: number = Date.now() - 30 * 86_400_000,
): Promise<number> {
  if (sensorIds.length === 0) return 0
  const { count, error } = await supabase
    .from('signal')
    .select('id', { count: 'exact', head: true })
    .in('sensor_id', sensorIds)
    .gte('start_time', new Date(sinceMs).toISOString())
  if (error) throw error
  return count ?? 0
}
