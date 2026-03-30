import { supabase } from '@/lib/supabase'

export async function GET_BUILDING_BY_ID(variables?: Record<string, unknown>) {
  const id = variables?.id
  const { data, error } = await supabase
    .from('building')
    .select('id, created_at, name, full_address, latitude, longitude, client_id, footprint, number_of_floors, bhi, bhi_label, bhi_updated_at, client(id, first_name, last_name, email), sensor:sensor(id, name, location, floor_number, location_on_floor, area_covered), fixtures(id, created_at, type, floor_number, location_on_floor, sensor_id)')
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    building_by_pk: data ? { ...data, sensors: data.sensor, sensor: undefined } : null,
  }
}
