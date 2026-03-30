import { supabase } from '@/lib/supabase'

export async function CREATE_FIXTURE(variables?: Record<string, unknown>) {
  const { building_id, floor_number, type } = variables ?? {}
  const { data, error } = await supabase
    .from('fixtures')
    .insert({ building_id, floor_number, type })
    .select('id, created_at, building_id, floor_number, type, location_on_floor, sensor_id')
    .single()
  if (error) throw error
  return { insert_fixtures_one: data }
}

export async function UPDATE_FIXTURE_POSITION(variables?: Record<string, unknown>) {
  const { id, location_on_floor, sensor_id } = variables ?? {}
  const { data, error } = await supabase
    .from('fixtures')
    .update({ location_on_floor, sensor_id })
    .eq('id', id)
    .select('id, location_on_floor, sensor_id')
    .single()
  if (error) throw error
  return { update_fixtures_by_pk: data }
}

export async function DELETE_FIXTURE(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('fixtures')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_fixtures_by_pk: data }
}
