import { supabase } from '@/lib/supabase'

export async function CREATE_TAG(variables?: Record<string, unknown>) {
  const { sensor_id, tagged_at, title, description } = variables ?? {}
  const { data, error } = await supabase
    .from('tag')
    .insert({ sensor_id, tagged_at, title, description })
    .select('id, created_at, sensor_id, tagged_at, title, description')
    .single()
  if (error) throw error
  return { insert_tag_one: data }
}

export async function UPDATE_TAG(variables?: Record<string, unknown>) {
  const { id, title, description } = variables ?? {}
  const { data, error } = await supabase
    .from('tag')
    .update({ title, description })
    .eq('id', id)
    .select('id, created_at, sensor_id, tagged_at, title, description')
    .single()
  if (error) throw error
  return { update_tag_by_pk: data }
}

export async function DELETE_TAG(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('tag')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_tag_by_pk: data }
}
