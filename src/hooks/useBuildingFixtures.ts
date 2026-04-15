import { useEffect, useMemo, useState } from 'react'

import {
  getFixturesByBuilding,
  type Fixture,
} from '@/queries/getFixturesByBuilding'
import {
  countSignalsForSensors,
  getSignalsForSensors,
  type SignalRow,
} from '@/queries/getSignalsForSensors'
import { parseSignalValue, type SignalValue } from '@/types/signal'

export interface FixtureWithSignals {
  fixture: Fixture
  /** Authoritative type from the `fixtures.type` DB column. Always the grouping key. */
  dbType: string
  /** Experimental type emitted by the ML classifier (latest signal's `signal_type`).
   * Anywhere this is surfaced in the UI it MUST be tagged β. */
  classifierType: string | null
  /** Experimental name from the classifier (latest signal's `fixture_name`).
   * Anywhere this is surfaced in the UI it MUST be tagged β. */
  classifierName: string | null
  /** Cosine distance of the most recent classification (lower = more confident). */
  lastConfidence: number | null
  /** Number of signals observed in the fetched window (default: last 30d). */
  signalCount: number
  /** Sum of `duration_s` across fetched signals — rough "time active". */
  totalDurationS: number
  /** Timestamp of the most recent signal (null if never classified). */
  lastSignalAt: string | null
  /** Signals attributed to this fixture's sensor, newest first. */
  signals: SignalRow[]
}

export interface FixtureTypeGroup {
  /** Canonical type label, derived from `fixtures.type` (DB). */
  type: string
  /** Individual fixtures in the group — kept for the experimental drill-in,
   * but the UI currently aggregates to the group level only. */
  items: FixtureWithSignals[]
  /** How many fixtures of this type. */
  fixtureCount: number
  /** Total events observed across all fixtures of this type in the fetched window. */
  totalEvents: number
  /** Sum of active seconds across all fixtures of this type. */
  totalDurationS: number
  /** Most recent signal timestamp across the group. */
  lastSignalAt: string | null
  /** Median cosine_distance across recent events — rough aggregate "match confidence". */
  avgConfidence: number | null
}

export interface BuildingFixturesState {
  fixtures: FixtureWithSignals[]
  /** Fixtures aggregated by DB type (fixtures.type), ordered by group size desc. */
  groups: FixtureTypeGroup[]
  /** Number of signals actually fetched (capped by PostgREST max-rows, usually ≤1000). */
  sampleCount: number
  /** Accurate total count from a server-side COUNT query — bypasses the max-rows cap. */
  totalSignalCount: number
  loading: boolean
  error: string | null
}

/**
 * Human-readable display for a fixture type.
 * Accepts raw signal_type strings, fixtures.type enum values, or null.
 */
export function displayFixtureType(raw: string | null | undefined): string {
  if (!raw) return 'Unknown'
  const cleaned = raw.toLowerCase().trim()
  // Map common variants → display label
  if (cleaned === 'toilet' || cleaned === 'toulet') return 'Toilet'
  if (cleaned === 'sink' || cleaned === 'lavatory') return 'Sink'
  if (cleaned === 'urinal') return 'Urinal'
  if (cleaned === 'shower') return 'Shower'
  if (cleaned === 'dishwasher') return 'Dishwasher'
  if (cleaned === 'washer' || cleaned === 'laundry') return 'Washer'
  if (cleaned === 'faucet') return 'Faucet'
  if (cleaned === 'main' || cleaned === 'mainline') return 'Main line'
  return cleaned
    .split(/[_\s-]+/)
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function useBuildingFixtures(buildingId: number | null) {
  const [fixturesRaw, setFixturesRaw] = useState<Fixture[]>([])
  const [signals, setSignals] = useState<SignalRow[]>([])
  const [totalSignalCount, setTotalSignalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (buildingId == null) {
      setFixturesRaw([])
      setSignals([])
      setTotalSignalCount(0)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    getFixturesByBuilding(buildingId)
      .then(async (fixtures) => {
        if (cancelled) return
        setFixturesRaw(fixtures)
        const sensorIds = Array.from(
          new Set(
            fixtures
              .map((f) => f.sensor_id)
              .filter((id): id is number => id != null),
          ),
        )
        if (sensorIds.length === 0) {
          setSignals([])
          setTotalSignalCount(0)
          return
        }
        // Fetch sample rows + accurate count in parallel. The row query is
        // capped at PostgREST's max-rows (usually 1000); the count query
        // returns the true total via a Content-Range header.
        const [sigs, count] = await Promise.all([
          getSignalsForSensors(sensorIds),
          countSignalsForSensors(sensorIds),
        ])
        if (cancelled) return
        setSignals(sigs)
        setTotalSignalCount(count)
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
  }, [buildingId])

  const state = useMemo<BuildingFixturesState>(() => {
    // Pre-bucket signals by sensor_id, sorted newest first (query already orders desc).
    const bySensor = new Map<number, SignalRow[]>()
    for (const s of signals) {
      const bucket = bySensor.get(s.sensor_id)
      if (bucket) bucket.push(s)
      else bySensor.set(s.sensor_id, [s])
    }

    const fixtures: FixtureWithSignals[] = fixturesRaw.map((f) => {
      const sensorSignals = f.sensor_id != null ? bySensor.get(f.sensor_id) ?? [] : []

      // Authoritative type always comes from the DB column.
      const dbType = displayFixtureType(f.type)

      // Experimental classifier info — displayed anywhere with a β tag.
      let classifierType: string | null = null
      let classifierName: string | null = null
      let lastConfidence: number | null = null
      let totalDurationS = 0
      let lastSignalAt: string | null = null

      if (sensorSignals.length > 0) {
        const latest = sensorSignals[0]!
        const parsed: SignalValue | null = parseSignalValue(latest.value)
        if (parsed) {
          if (parsed.signal_type != null) {
            classifierType = displayFixtureType(String(parsed.signal_type))
          }
          if (parsed.fixture_name) classifierName = parsed.fixture_name
          if (typeof parsed.cosine_distance === 'number') {
            lastConfidence = parsed.cosine_distance
          }
        }
        lastSignalAt = latest.start_time ?? latest.created_at
        for (const sig of sensorSignals) {
          const sv = parseSignalValue(sig.value)
          if (sv?.duration_s && Number.isFinite(sv.duration_s)) {
            totalDurationS += sv.duration_s
          }
        }
      }

      return {
        fixture: f,
        dbType,
        classifierType,
        classifierName,
        lastConfidence,
        signalCount: sensorSignals.length,
        totalDurationS,
        lastSignalAt,
        signals: sensorSignals,
      }
    })

    // Group strictly by DB type (fixtures.type). Every distinct DB type becomes a
    // group, including ones with zero events — so new/quiet types still show up.
    const groupMap = new Map<string, FixtureWithSignals[]>()
    for (const fws of fixtures) {
      const bucket = groupMap.get(fws.dbType)
      if (bucket) bucket.push(fws)
      else groupMap.set(fws.dbType, [fws])
    }

    const groups: FixtureTypeGroup[] = Array.from(groupMap.entries())
      .map(([type, items]) => {
        let totalEvents = 0
        let totalDurationS = 0
        let lastSignalMs = 0
        const confidences: number[] = []
        for (const it of items) {
          totalEvents += it.signalCount
          totalDurationS += it.totalDurationS
          if (it.lastSignalAt) {
            const t = Date.parse(it.lastSignalAt)
            if (Number.isFinite(t) && t > lastSignalMs) lastSignalMs = t
          }
          if (it.lastConfidence != null && Number.isFinite(it.lastConfidence)) {
            confidences.push(it.lastConfidence)
          }
        }
        confidences.sort((a, b) => a - b)
        const avgConfidence = confidences.length > 0
          ? confidences[Math.floor(confidences.length / 2)] ?? null
          : null
        return {
          type,
          items: items.sort((a, b) => {
            const ta = a.lastSignalAt ? Date.parse(a.lastSignalAt) : 0
            const tb = b.lastSignalAt ? Date.parse(b.lastSignalAt) : 0
            return tb - ta
          }),
          fixtureCount: items.length,
          totalEvents,
          totalDurationS,
          lastSignalAt: lastSignalMs > 0 ? new Date(lastSignalMs).toISOString() : null,
          avgConfidence,
        }
      })
      .sort((a, b) => {
        // Unknown last, then largest group first, then alphabetical for stability.
        if (a.type === 'Unknown' && b.type !== 'Unknown') return 1
        if (b.type === 'Unknown' && a.type !== 'Unknown') return -1
        if (b.fixtureCount !== a.fixtureCount) return b.fixtureCount - a.fixtureCount
        return a.type.localeCompare(b.type)
      })

    return {
      fixtures,
      groups,
      sampleCount: signals.length,
      totalSignalCount,
      loading,
      error,
    }
  }, [fixturesRaw, signals, totalSignalCount, loading, error])

  return state
}
