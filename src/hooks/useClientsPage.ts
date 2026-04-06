import { useEffect, useMemo, useRef } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_CLIENTS } from '@/queries/getClients'

import type { Client } from '@/types'

interface ClientsResponse {
  client: Client[]
}

export function useClientsPage() {
  const { data, loading, error, executeQuery } =
    useGraphQL<ClientsResponse>(GET_CLIENTS)
  const executeQueryRef = useRef(executeQuery)
  executeQueryRef.current = executeQuery

  useEffect(() => {
    executeQueryRef.current()
  }, [])

  const clients = useMemo(() => data?.client ?? [], [data])

  return {
    clients,
    loading,
    error,
    refetch: executeQuery,
  }
}

export default useClientsPage
