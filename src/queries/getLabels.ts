import { supabase } from '@/lib/supabase'

export async function GET_LABELS() {
  const { data, error } = await supabase
    .from('signal')
    .select('id, value, start_time, end_time, sensor_id, created_at, sensor:sensor!sensor_id(name)')
    .not('value', 'is', null)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    // Fallback without relation join
    const fallback = await supabase
      .from('signal')
      .select('id, value, start_time, end_time, sensor_id, created_at')
      .not('value', 'is', null)
      .not('start_time', 'is', null)
      .not('end_time', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)
    if (fallback.error) throw fallback.error
    return { signal: (fallback.data ?? []).map((r: any) => ({ ...r, sensor: null })) }
  }
  return { signal: data ?? [] }
}
