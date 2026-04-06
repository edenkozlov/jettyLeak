import { supabase } from '@/lib/supabase'

export async function UPDATE_USER_ROLE(userId: string, role: 'admin' | 'client') {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
  if (error) throw error
}

export async function UPDATE_USER_CLIENT(userId: string, clientId: string | null) {
  const { error } = await supabase
    .from('users')
    .update({ client_id: clientId })
    .eq('id', userId)
  if (error) throw error
}

export async function DELETE_USER(userId: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
  if (error) throw error
}
