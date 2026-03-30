import { supabase } from '@/lib/supabase'

export async function GET_SENSORS() {
  const { data, error } = await supabase
    .from('sensor')
    .select('id, created_at, name, location, building_id, mappings, multiplier, type, last_wifi, last_lora, firmware_version, floor_number, building(id, name, full_address, client_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return { sensor: data ?? [] }
}

export async function GET_SENSORS_BY_CLIENT_ID(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId
  const { data, error } = await supabase
    .from('sensor')
    .select('id, created_at, name, location, building_id, mappings, multiplier, type, last_wifi, last_lora, firmware_version, floor_number, building!inner(id, name, full_address, client_id)')
    .eq('building.client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return { sensor: data ?? [] }
}
