import { supabase } from '@/lib/supabase'

export async function CREATE_SENSOR(variables?: Record<string, unknown>) {
  const { name, location, building_id } = variables ?? {}
  const { data, error } = await supabase
    .from('sensor')
    .insert({ name, location, building_id })
    .select('id, created_at, name, location, building_id')
    .single()
  if (error) throw error
  return { insert_sensor_one: data }
}

export async function UPDATE_SENSOR(variables?: Record<string, unknown>) {
  const { id, name, location, building_id } = variables ?? {}
  const { data, error } = await supabase
    .from('sensor')
    .update({ name, location, building_id })
    .eq('id', id)
    .select('id, created_at, name, location, building_id')
    .single()
  if (error) throw error
  return { update_sensor_by_pk: data }
}

export async function DELETE_SENSOR(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('sensor')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_sensor_by_pk: data }
}

export async function UPDATE_SENSOR_POSITION(variables?: Record<string, unknown>) {
  const { id, floor_number, location_on_floor } = variables ?? {}
  const { data, error } = await supabase
    .from('sensor')
    .update({ floor_number, location_on_floor })
    .eq('id', id)
    .select('id, floor_number, location_on_floor')
    .single()
  if (error) throw error
  return { update_sensor_by_pk: data }
}

export async function UPDATE_SENSOR_AREA(variables?: Record<string, unknown>) {
  const { id, area_covered } = variables ?? {}
  const { data, error } = await supabase
    .from('sensor')
    .update({ area_covered })
    .eq('id', id)
    .select('id, area_covered')
    .single()
  if (error) throw error
  return { update_sensor_by_pk: data }
}

export async function UPDATE_SENSOR_MAPPINGS(variables?: Record<string, unknown>) {
  const { id, mappings } = variables ?? {}
  const { data, error } = await supabase
    .from('sensor')
    .update({ mappings })
    .eq('id', id)
    .select('id, mappings')
    .single()
  if (error) throw error
  return { update_sensor_by_pk: data }
}
