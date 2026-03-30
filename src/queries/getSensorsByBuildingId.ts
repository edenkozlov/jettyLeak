import { supabase } from '@/lib/supabase'

export async function GET_SENSORS_BY_BUILDING_ID(variables?: Record<string, unknown>) {
  const buildingId = variables?.buildingId
  const { data, error } = await supabase
    .from('sensor')
    .select('*')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return { sensor: data ?? [] } as any
}
