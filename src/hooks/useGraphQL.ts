import { useCallback, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/useAppSelector'
import { GRAPHQL_ENDPOINT, HASURA_ADMIN_SECRET } from '@/globals/constants'
import { logger } from '@/utils/logger/logger'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>
}

interface UseGraphQLReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  executeQuery: (variables?: Record<string, unknown>) => Promise<T | null>
}

export function useGraphQL<T = Record<string, unknown>>(
  query: string,
): UseGraphQLReturn<T> {
  const token = useAppSelector((state) => state.login.token)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const executeQuery = useCallback(
    async (variables?: Record<string, unknown>): Promise<T | null> => {
      const thisRequestId = ++requestIdRef.current
      setLoading(true)
      setError(null)

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (HASURA_ADMIN_SECRET) {
          headers['x-hasura-admin-secret'] = HASURA_ADMIN_SECRET
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const json: GraphQLResponse<T> = await response.json()

        // Ignore stale responses — only accept the most recent request
        if (thisRequestId !== requestIdRef.current) {
          return json.data ?? null
        }

        if (json.errors?.length) {
          const message = json.errors.map((e) => e.message).join(', ')
          logger.error('GRAPHQL', message, json.errors)
          setError(message)
          return null
        }

        const result = json.data ?? null
        console.log('[useGraphQL] setData', { query: query.slice(0, 50), thisRequestId, keys: result ? Object.keys(result) : null, reportCount: (result as Record<string, unknown[]> | null)?.report?.length })
        setData(result)
        return result
      } catch (err) {
        if (thisRequestId !== requestIdRef.current) return null
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.error('GRAPHQL', message, err)
        setError(message)
        return null
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [query, token],
  )

  return { data, loading, error, executeQuery }
}
