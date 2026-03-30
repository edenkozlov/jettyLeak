import { supabase } from '@/lib/supabase'

export async function CREATE_BUILDING(variables?: Record<string, unknown>) {
  const { name, full_address, latitude, longitude, client_id } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .insert({ name, full_address, latitude, longitude, client_id })
    .select('id, created_at, name, full_address, latitude, longitude, client_id')
    .single()
  if (error) throw error
  return { insert_building_one: data }
}

export async function UPDATE_BUILDING(variables?: Record<string, unknown>) {
  const { id, ...updates } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .update({ name: updates.name, full_address: updates.full_address, latitude: updates.latitude, longitude: updates.longitude, client_id: updates.client_id, number_of_floors: updates.number_of_floors })
    .eq('id', id)
    .select('id, created_at, name, full_address, latitude, longitude, client_id, number_of_floors')
    .single()
  if (error) throw error
  return { update_building_by_pk: data }
}

export async function UPDATE_BUILDING_COORDINATES(variables?: Record<string, unknown>) {
  const { id, latitude, longitude } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .update({ latitude, longitude })
    .eq('id', id)
    .select('id, latitude, longitude')
    .single()
  if (error) throw error
  return { update_building_by_pk: data }
}

export async function UPDATE_BUILDING_FOOTPRINT(variables?: Record<string, unknown>) {
  const { id, footprint } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .update({ footprint })
    .eq('id', id)
    .select('id, footprint')
    .single()
  if (error) throw error
  return { update_building_by_pk: data }
}

export async function UPDATE_BUILDING_FLOORS(variables?: Record<string, unknown>) {
  const { id, number_of_floors } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .update({ number_of_floors })
    .eq('id', id)
    .select('id, number_of_floors')
    .single()
  if (error) throw error
  return { update_building_by_pk: data }
}

export async function UPDATE_BUILDING_NAME(variables?: Record<string, unknown>) {
  const { id, name } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .update({ name })
    .eq('id', id)
    .select('id, name')
    .single()
  if (error) throw error
  return { update_building_by_pk: data }
}

export async function UPDATE_BUILDING_BHI(variables?: Record<string, unknown>) {
  const { id, bhi, bhi_label, bhi_updated_at } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .update({ bhi, bhi_label, bhi_updated_at })
    .eq('id', id)
    .select('id, bhi, bhi_label, bhi_updated_at')
    .single()
  if (error) throw error
  return { update_building_by_pk: data }
}

export async function DELETE_BUILDING(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('building')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_building_by_pk: data }
}
