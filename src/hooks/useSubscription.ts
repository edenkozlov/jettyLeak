import { useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger/logger'

interface UseSubscriptionReturn<T> {
  data: T | null
  error: string | null
  connected: boolean
}

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

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

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

    queryFnRef.current(parsedVars)
      .then((result) => {
        setData(result)
        setConnected(true)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Subscription error'
        logger.error('REALTIME', message, err)
        setError(message)
      })

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
        (payload: { new: Record<string, unknown> }) => {
          // Use the realtime payload directly instead of re-querying.
          // This avoids an HTTP request on every single INSERT event.
          setData({ [table]: [payload.new] } as unknown as T)
          setConnected(true)
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [varsKey, enabled, table, filterColumn, filterValue])

  return { data, error, connected }
}
