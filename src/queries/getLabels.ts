import { supabase } from '@/lib/supabase'

export async function GET_LABELS() {
  const { data, error } = await supabase
    .from('signal')
    .select('id, value, start_time, end_time, sensor_id, created_at, sensor(name)')
    .not('value', 'is', null)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return { signal: data ?? [] }
}
