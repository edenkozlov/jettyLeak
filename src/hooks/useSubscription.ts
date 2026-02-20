import { useEffect, useMemo, useState } from 'react'

import { subscriptionClient } from '@/lib/subscriptionClient'
import { logger } from '@/utils/logger/logger'

interface UseSubscriptionReturn<T> {
  data: T | null
  error: string | null
  connected: boolean
}

export function useSubscription<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
  enabled = true,
): UseSubscriptionReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const varsKey = useMemo(
    () => JSON.stringify(variables ?? {}),
    [variables],
  )

  useEffect(() => {
    if (!enabled) {
      setConnected(false)
      return
    }

    setError(null)

    const parsedVars = JSON.parse(varsKey) as Record<string, unknown>

    const cleanup = subscriptionClient.subscribe<T>(
      { query, variables: parsedVars },
      {
        next: (result) => {
          setConnected(true)
          if (result.errors?.length) {
            const message = result.errors.map((e) => e.message).join(', ')
            logger.error('GRAPHQL', `Subscription error: ${message}`, result.errors)
            setError(message)
          } else {
            setData((result.data as T) ?? null)
          }
        },
        error: (err) => {
          setConnected(false)
          const message = err instanceof Error ? err.message : 'Subscription error'
          logger.error('GRAPHQL', message, err)
          setError(message)
        },
        complete: () => {
          setConnected(false)
        },
      },
    )

    return cleanup
  }, [query, varsKey, enabled])

  return { data, error, connected }
}
