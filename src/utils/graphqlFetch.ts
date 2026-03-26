import { GRAPHQL_ENDPOINT, HASURA_ADMIN_SECRET } from '@/globals/constants'

export class GraphqlError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly transient: boolean,
  ) {
    super(message)
    this.name = 'GraphqlError'
  }
}

const TRANSIENT_CODES = new Set([408, 429, 500, 502, 503, 504, 521, 522, 523])

export async function graphqlFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string | null,
): Promise<T | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (HASURA_ADMIN_SECRET) headers['x-hasura-admin-secret'] = HASURA_ADMIN_SECRET
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    throw new GraphqlError(
      err instanceof Error ? err.message : 'Network error',
      null,
      true,
    )
  }

  if (!res.ok) {
    throw new GraphqlError(
      `HTTP ${res.status}`,
      res.status,
      TRANSIENT_CODES.has(res.status),
    )
  }

  const json = await res.json()
  if (json.errors?.length) {
    const msg = json.errors.map((e: { message: string }) => e.message).join('; ')
    throw new GraphqlError(msg, null, false)
  }
  return json.data ?? null
}
