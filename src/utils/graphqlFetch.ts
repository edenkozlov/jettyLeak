import { GRAPHQL_ENDPOINT, HASURA_ADMIN_SECRET } from '@/globals/constants'

export async function graphqlFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string | null,
): Promise<T | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (HASURA_ADMIN_SECRET) headers['x-hasura-admin-secret'] = HASURA_ADMIN_SECRET
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) return null
  const json = await res.json()
  if (json.errors?.length) return null
  return json.data ?? null
}
