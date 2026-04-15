import { useEffect, useMemo, useState } from 'react'

import useAuth from '@/hooks/auth/useAuth'
import {
  GET_BUILDINGS_OVERVIEW,
  type BuildingOverviewRow,
} from '@/queries/getBuildingsOverview'

export type HealthLabel = 'healthy' | 'watch' | 'investigate' | 'critical' | 'unknown'

/**
 * Normalize server-stored `bhi_label` (may be title-case strings like "Excellent"/"Good"/"Fair"/"Poor"
 * or new lowercase labels) into a unified 4-bucket scheme matching buildingHealth.ts.
 */
export function normalizeHealthLabel(
  raw: string | null | undefined,
  bhi: number | null | undefined,
): HealthLabel {
  if (raw) {
    const lower = raw.toLowerCase()
    if (lower === 'healthy' || lower === 'excellent') return 'healthy'
    if (lower === 'watch' || lower === 'good') return 'watch'
    if (lower === 'investigate' || lower === 'fair') return 'investigate'
    if (lower === 'critical' || lower === 'poor') return 'critical'
  }
  if (typeof bhi === 'number') {
    if (bhi >= 85) return 'healthy'
    if (bhi >= 70) return 'watch'
    if (bhi >= 50) return 'investigate'
    return 'critical'
  }
  return 'unknown'
}

export interface OverviewBuilding extends BuildingOverviewRow {
  healthLabel: HealthLabel
  /** 1-line reason derived from the label — honest, not fabricated */
  issueReason: string | null
}

export interface PortfolioStats {
  buildingCount: number
  totalTodayLitres: number
  sensorCount: number
  healthyCount: number
  watchCount: number
  investigateCount: number
  criticalCount: number
  unknownCount: number
  /** Buildings not in "healthy" — ordered worst-first for the issues panel */
  issueBuildings: OverviewBuilding[]
}

function reasonForLabel(label: HealthLabel, b: BuildingOverviewRow): string | null {
  switch (label) {
    case 'critical':
      return 'Critical plumbing health — investigate immediately.'
    case 'investigate':
      return 'Health degraded — leak, stress, or data-trust issue flagged.'
    case 'watch':
      return 'Minor anomaly vs baseline — keep an eye on it.'
    case 'unknown':
      return b.sensor_count === 0
        ? 'No sensors installed yet.'
        : 'Baseline still calibrating — need ~28 days of data.'
    default:
      return null
  }
}

const LABEL_SEVERITY: Record<HealthLabel, number> = {
  critical: 0,
  investigate: 1,
  watch: 2,
  unknown: 3,
  healthy: 4,
}

export function useOverview() {
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id
  const [rows, setRows] = useState<BuildingOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    GET_BUILDINGS_OVERVIEW(isClient ? { clientId: client_id } : undefined)
      .then((data) => {
        if (!cancelled) setRows(data ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isClient, client_id])

  const buildings = useMemo<OverviewBuilding[]>(
    () =>
      rows.map((b) => {
        const label = normalizeHealthLabel(b.bhi_label, b.bhi)
        return {
          ...b,
          healthLabel: label,
          issueReason: reasonForLabel(label, b),
        }
      }),
    [rows],
  )

  const portfolio = useMemo<PortfolioStats>(() => {
    const stats: PortfolioStats = {
      buildingCount: buildings.length,
      totalTodayLitres: 0,
      sensorCount: 0,
      healthyCount: 0,
      watchCount: 0,
      investigateCount: 0,
      criticalCount: 0,
      unknownCount: 0,
      issueBuildings: [],
    }

    for (const b of buildings) {
      stats.totalTodayLitres += Number.isFinite(b.today_volume_litres)
        ? b.today_volume_litres
        : 0
      stats.sensorCount += b.sensor_count ?? 0
      switch (b.healthLabel) {
        case 'healthy':
          stats.healthyCount++
          break
        case 'watch':
          stats.watchCount++
          break
        case 'investigate':
          stats.investigateCount++
          break
        case 'critical':
          stats.criticalCount++
          break
        default:
          stats.unknownCount++
      }
    }

    stats.issueBuildings = buildings
      .filter((b) => b.healthLabel !== 'healthy')
      .sort((a, z) => {
        const sa = LABEL_SEVERITY[a.healthLabel]
        const sz = LABEL_SEVERITY[z.healthLabel]
        if (sa !== sz) return sa - sz
        return (a.bhi ?? 100) - (z.bhi ?? 100)
      })

    return stats
  }, [buildings])

  return {
    buildings,
    portfolio,
    loading,
    error,
    isClient,
  }
}
