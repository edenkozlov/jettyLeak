import { supabase } from '@/lib/supabase'

export async function CREATE_CLIENT(variables?: Record<string, unknown>) {
  const { email, first_name, last_name } = variables ?? {}
  const { data, error } = await supabase
    .from('client')
    .insert({ email, first_name, last_name })
    .select('id, created_at, email, first_name, last_name')
    .single()
  if (error) throw error
  return { insert_client_one: data }
}

export async function UPDATE_CLIENT(variables?: Record<string, unknown>) {
  const { id, email, first_name, last_name } = variables ?? {}
  const { data, error } = await supabase
    .from('client')
    .update({ email, first_name, last_name })
    .eq('id', id)
    .select('id, created_at, email, first_name, last_name')
    .single()
  if (error) throw error
  return { update_client_by_pk: data }
}

export async function DELETE_CLIENT(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('client')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_client_by_pk: data }
}
