import { useEffect, useRef } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_CLIENT_TEAM, type ClientTeamResult } from '@/queries/getClientTeam'

export function useTeamPage(clientId: string | null) {
  const { data, loading, error, executeQuery } = useGraphQL<ClientTeamResult>(GET_CLIENT_TEAM)
  const executeQueryRef = useRef(executeQuery)
  executeQueryRef.current = executeQuery

  useEffect(() => {
    if (!clientId) return
    executeQueryRef.current({ clientId })
  }, [clientId])

  return {
    team: data,
    loading,
    error,
    refetch: () => (clientId ? executeQuery({ clientId }) : Promise.resolve(null)),
  }
}
