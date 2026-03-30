import { supabase } from '@/lib/supabase'

export async function GET_CLIENT_BY_ID(variables?: Record<string, unknown>) {
  const id = variables?.id
  const { data, error } = await supabase
    .from('client')
    .select('id, created_at, email, first_name, last_name, building(id, name, full_address)')
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    client_by_pk: data ? { ...data, buildings: data.building, building: undefined } : null,
  }
}
