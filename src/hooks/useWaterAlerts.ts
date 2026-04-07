import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchLiveWaterAlerts,
  computeStatsFromAlerts,
  extractBoroughsFromAlerts,
} from '@/queries/fetchLiveWaterAlerts'
import type { WaterAlert, WaterAlertFilters, WaterAlertStats } from '@/types'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

function applyFilters(
  alerts: WaterAlert[],
  filters: WaterAlertFilters,
): WaterAlert[] {
  let result = alerts

  if (filters.status) {
    result = result.filter((a) => a.status === filters.status)
  }

  if (filters.borough) {
    result = result.filter((a) => a.borough === filters.borough)
  }

  if (filters.q) {
    const q = filters.q.toLowerCase()
    result = result.filter((a) => a.title.toLowerCase().includes(q))
  }

  if (filters.from) {
    const from = new Date(filters.from).getTime()
    result = result.filter(
      (a) => a.published_at && new Date(a.published_at).getTime() >= from,
    )
  }

  if (filters.to) {
    const to = new Date(filters.to).getTime()
    result = result.filter(
      (a) => a.published_at && new Date(a.published_at).getTime() <= to,
    )
  }

  return result
}

export function useWaterAlerts() {
  const [allAlerts, setAllAlerts] = useState<WaterAlert[]>([])
  const [stats, setStats] = useState<WaterAlertStats | null>(null)
  const [boroughs, setBoroughs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<WaterAlertFilters>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchData = useCallback(async () => {
    try {
      const alertsData = await fetchLiveWaterAlerts()
      setAllAlerts(alertsData)
      setStats(computeStatsFromAlerts(alertsData))
      setBoroughs(extractBoroughsFromAlerts(alertsData))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load water alerts')
    }
  }, [])

  // Initial load
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchData().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [fetchData])

  // Auto-refresh on interval + visibility change
  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      if (!cancelled && !document.hidden) fetchData()
    }

    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    const onVisibility = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchData])

  // Client-side filtering
  const alerts = applyFilters(allAlerts, filters)

  const selected = selectedId != null
    ? alerts.find((a) => a.id === selectedId) ?? null
    : null

  return {
    alerts,
    stats,
    boroughs,
    loading,
    error,
    filters,
    setFilters,
    selectedId,
    setSelectedId,
    selected,
  }
}

export default useWaterAlerts
