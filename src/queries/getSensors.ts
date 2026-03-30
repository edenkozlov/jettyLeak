import { supabase } from '@/lib/supabase'

export async function GET_SENSORS() {
  const { data, error } = await supabase
    .from('sensor')
    .select('*, building(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return { sensor: data ?? [] } as any
}

export async function GET_SENSORS_BY_CLIENT_ID(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId
  const { data, error } = await supabase
    .from('sensor')
    .select('*, building!inner(*)')
    .eq('building.client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return { sensor: data ?? [] } as any
}
