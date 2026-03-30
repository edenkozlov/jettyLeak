import { supabase } from '@/lib/supabase'

export async function GET_CLIENT_BY_ID(variables?: Record<string, unknown>) {
  const id = variables?.id
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  if (!data) return { client_by_pk: null }

  const { data: buildings } = await supabase
    .from('building')
    .select('id, name, full_address')
    .eq('client_id', id)

  return {
    client_by_pk: {
      ...data,
      buildings: buildings ?? [],
    },
  } as any
}
