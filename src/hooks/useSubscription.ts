import { useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger/logger'

interface UseSubscriptionReturn<T> {
  data: T | null
  error: string | null
  connected: boolean
}

/**
 * Supabase Realtime subscription hook.
 * Listens for new inserts on a table and polls the queryFn for latest data.
 *
 * @param queryFn - A function that fetches the latest data (e.g., latest report)
 * @param variables - Variables to pass to queryFn
 * @param enabled - Whether the subscription is active
 * @param table - The database table to listen on (e.g., 'report')
 * @param filterColumn - Optional column to filter events on (e.g., 'sensor_id')
 * @param filterValue - Optional value for the filter column
 */
export function useSubscription<T = Record<string, unknown>>(
  queryFn: (variables?: Record<string, unknown>) => Promise<T>,
  variables?: Record<string, unknown>,
  enabled = true,
  table = 'report',
  filterColumn?: string,
  filterValue?: string | number,
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
      setData(null)
      setError(null)
      setConnected(false)
      return
    }

    setData(null)
    setError(null)
    setConnected(false)

    const parsedVars = JSON.parse(varsKey) as Record<string, unknown>

    // Do an initial fetch
    queryFn(parsedVars)
      .then((result) => {
        setData(result)
        setConnected(true)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Subscription error'
        logger.error('REALTIME', message, err)
        setError(message)
      })

    // Subscribe to realtime changes
    let filter: string | undefined
    if (filterColumn && filterValue != null) {
      filter = `${filterColumn}=eq.${filterValue}`
    }

    const channelName = `${table}-${varsKey}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          // On new insert, refetch latest data
          queryFn(parsedVars)
            .then((result) => {
              setConnected(true)
              setData(result)
            })
            .catch((err) => {
              const message = err instanceof Error ? err.message : 'Subscription error'
              logger.error('REALTIME', message, err)
              setError(message)
            })
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
          logger.info('REALTIME', `Subscribed to ${table}`, {})
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false)
          logger.info('REALTIME', `Channel ${status}: ${table}`, {})
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryFn, varsKey, enabled, table, filterColumn, filterValue])

  return { data, error, connected }
}
