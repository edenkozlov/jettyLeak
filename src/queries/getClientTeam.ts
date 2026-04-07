import { supabase } from '@/lib/supabase'

export interface ClientTeamMember {
  id: string
  role: string
  email: string | null
}

export interface ClientTeamOrganization {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

export interface ClientTeamResult {
  organization: ClientTeamOrganization
  members: ClientTeamMember[]
}

export async function GET_CLIENT_TEAM(variables?: Record<string, unknown>): Promise<ClientTeamResult> {
  const clientId = variables?.clientId as string | undefined
  if (!clientId) throw new Error('Organization identifier is required.')

  const { data: client, error: clientErr } = await supabase
    .from('client')
    .select('id, first_name, last_name, email')
    .eq('id', clientId)
    .single()

  if (clientErr) throw clientErr
  if (!client) throw new Error('Organization not found.')

  const { data: rows, error: usersErr } = await supabase.rpc('get_client_users', {
    p_client_ids: [clientId],
  })
  if (usersErr) throw usersErr

  const members: ClientTeamMember[] = (rows ?? []).map((u: { id: string; role: string; email?: string | null }) => ({
    id: u.id,
    role: u.role,
    email: u.email ?? null,
  }))

  return {
    organization: client,
    members,
  }
}
