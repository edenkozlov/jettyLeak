import { supabase } from '@/lib/supabase'

export async function GET_TAGS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const { data, error } = await supabase
    .from('tag')
    .select('id, created_at, sensor_id, tagged_at, title, description')
    .eq('sensor_id', sensorId)
    .order('tagged_at', { ascending: true })
  if (error) throw error
  return { tag: data ?? [] }
}
