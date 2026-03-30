import { useCallback, useRef, useState } from 'react'

import { logger } from '@/utils/logger/logger'

interface UseGraphQLReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  executeQuery: (variables?: Record<string, unknown>) => Promise<T | null>
}

export function useGraphQL<T = Record<string, unknown>>(
  queryFn: (variables?: Record<string, unknown>) => Promise<T>,
): UseGraphQLReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(0)

  const executeQuery = useCallback(
    async (variables?: Record<string, unknown>): Promise<T | null> => {
      const thisRequestId = ++requestIdRef.current
      inFlightRef.current += 1
      logger.info('SUPABASE', 'request start', {
        id: thisRequestId,
        inFlight: inFlightRef.current,
      })
      setLoading(true)
      setError(null)

      try {
        const result = await queryFn(variables)

        // Ignore stale responses — only accept the most recent request
        if (thisRequestId !== requestIdRef.current) {
          logger.info('SUPABASE', 'stale response ignored', {
            id: thisRequestId,
            latestId: requestIdRef.current,
          })
          return result ?? null
        }

        logger.info('SUPABASE', 'request ok', {
          id: thisRequestId,
          keys: result && typeof result === 'object' ? Object.keys(result as object) : null,
        })
        setData(result ?? null)
        return result ?? null
      } catch (err) {
        if (thisRequestId !== requestIdRef.current) return null
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.error('SUPABASE', message, err)
        setError(message)
        return null
      } finally {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1)
        logger.info('SUPABASE', 'request finally', {
          id: thisRequestId,
          inFlight: inFlightRef.current,
          clearsLoading: inFlightRef.current === 0,
        })
        if (inFlightRef.current === 0) {
          setLoading(false)
        }
      }
    },
    [queryFn],
  )

  return { data, loading, error, executeQuery }
}
