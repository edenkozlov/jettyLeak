import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import FixtureRow from '@/components/FixtureEfficiencyRow'
import FixtureInspectionModal from '@/components/FixtureInspectionModal'
import useAuth from '@/hooks/auth/useAuth'
import { useBuildingAnalytics } from '@/hooks/useBuildingAnalytics'
import useBuildingDetail from '@/hooks/useBuildingDetail'
import { useBuildingWaterHealth } from '@/hooks/useBuildingWaterHealth'
import {
  GET_BUILDINGS_OVERVIEW,
  type BuildingOverviewRow,
} from '@/queries/getBuildingsOverview'
import { regionDisplayName } from '@/utils/regionDetection'

// ─────────────────────────────────────────────────────────────────────────────
// Building picker
// ─────────────────────────────────────────────────────────────────────────────

function BuildingPicker({
  buildings,
  selectedId,
  onChange,
}: {
  buildings: BuildingOverviewRow[]
  selectedId: number | null
  onChange: (id: number) => void
}) {
  if (buildings.length <= 1) return null
  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
    >
      <option value="" disabled>
        Select a building…
      </option>
      {buildings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name || b.full_address || `Building #${b.id}`}
        </option>
      ))}
    </select>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Fixtures() {
  const navigate = useNavigate()
  const params = useParams<{ buildingId?: string; sensorId?: string }>()
  const { role, client_id } = useAuth()
  const isClient = role === 'client' && !!client_id

  const [buildings, setBuildings] = useState<BuildingOverviewRow[]>([])
  const [buildingsLoading, setBuildingsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setBuildingsLoading(true)
    GET_BUILDINGS_OVERVIEW(isClient ? { clientId: client_id } : undefined)
      .then((data) => {
        if (!cancelled) setBuildings(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setBuildings([])
      })
      .finally(() => {
        if (!cancelled) setBuildingsLoading(false)
      })
    return () => { cancelled = true }
  }, [isClient, client_id])

  const urlId = params.buildingId ? Number(params.buildingId) : null
  const buildingId = useMemo(() => {
    if (urlId != null && buildings.some((b) => b.id === urlId)) return urlId
    if (buildings.length === 1) return buildings[0]!.id
    return null
  }, [urlId, buildings])

  // Fetch full building row for footprint + address + floors
  const { building } = useBuildingDetail(buildingId != null ? String(buildingId) : undefined)

  // Shared analytics + health so the fixture breakdown matches the detail page
  const { data: analytics, health, loading: analyticsLoading } = useBuildingAnalytics(buildingId)
  const whi = useBuildingWaterHealth({
    buildingId,
    analytics,
    health,
    footprint: building?.footprint ?? null,
    numberOfFloors: building?.number_of_floors ?? null,
    address: building?.full_address ?? null,
    loading: analyticsLoading,
  })

  const selectedBuilding = buildings.find((b) => b.id === buildingId) ?? null

  const onBuildingChange = (id: number) => {
    navigate(`/dashboard/fixtures/${id}`)
  }

  // Expansion state — only one row open at a time
  const [expandedType, setExpandedType] = useState<string | null>(null)
  // Inspection modal state
  const [inspectionOpen, setInspectionOpen] = useState(false)
  useEffect(() => {
    setExpandedType(null)
  }, [buildingId])

  // Roll-up stats across types
  const totals = useMemo(() => {
    let sessions = 0
    let review = 0
    let litres = 0
    for (const r of whi.fixtureRows) {
      sessions += r.sessionCount
      review += r.reviewCount
      litres += r.totalLitres ?? 0
    }
    return { sessions, review, litres }
  }, [whi.fixtureRows])

  const loading = buildingsLoading || whi.loading
  const noData = !loading && whi.fixtureRows.length === 0

  return (
    <div className="mx-auto min-w-0 max-w-7xl">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Fixtures
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {selectedBuilding
              ? selectedBuilding.name || selectedBuilding.full_address || `Building #${selectedBuilding.id}`
              : 'Select a building to see its fixture types.'}
          </p>
          {selectedBuilding && (
            <p className="mt-1 text-xs text-gray-400">
              Benchmarks for <span className="font-semibold text-gray-600 dark:text-gray-300">{regionDisplayName(whi.region)}</span>
              {whi.region === 'CA' ? ' — National Plumbing Code 2020' : whi.region === 'US' ? ' — EPA WaterSense / EPAct 1992' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BuildingPicker
            buildings={buildings}
            selectedId={buildingId}
            onChange={onBuildingChange}
          />
          {buildingId != null && (
            <button
              type="button"
              onClick={() => setInspectionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={11} cy={11} r={8} />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Inspect fixture
            </button>
          )}
        </div>
      </div>

      {whi.error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {whi.error}
        </div>
      )}

      {/* Top summary */}
      {!loading && whi.fixtureRows.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <SummaryTile label="Fixture types" value={whi.fixtureRows.length.toLocaleString()} />
          <SummaryTile label="Sessions (30d)" value={totals.sessions.toLocaleString()} />
          <SummaryTile
            label="To review"
            value={totals.review.toLocaleString()}
            tone={totals.review > 0 ? 'amber' : 'neutral'}
          />
          <SummaryTile
            label="Est. volume"
            value={`${Math.round(totals.litres).toLocaleString()} L`}
            hint="monthly"
          />
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : buildingId == null ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-16 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          Choose a building from the selector above to see its fixture types.
        </div>
      ) : noData ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-16 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          No fixtures recorded for this building yet.
        </div>
      ) : (
        <div className="space-y-3">
          {whi.fixtureRows.map((r) => (
            <FixtureRow
              key={r.type}
              row={r}
              expanded={expandedType === r.type}
              onToggle={() =>
                setExpandedType((prev) => (prev === r.type ? null : r.type))
              }
            />
          ))}
        </div>
      )}

      {/* Attribution footnote */}
      {!loading && whi.fixtureRows.length > 0 && (
        <p className="mt-6 text-xs leading-relaxed text-gray-400">
          Averages are attributed from building-level monthly volume using each type's share of active time.
          Per-fixture identity (the "By fixture" view) comes from the ML classifier and is marked as beta —
          the full breakdown will tighten once per-session volume is stored upstream.
        </p>
      )}

      {/* Inspection modal */}
      {buildingId != null && (
        <FixtureInspectionModal
          open={inspectionOpen}
          onClose={() => setInspectionOpen(false)}
          buildingId={buildingId}
          buildingName={selectedBuilding?.name ?? null}
          buildingAddress={selectedBuilding?.full_address ?? null}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small summary tile for the top-of-page strip
// ─────────────────────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'amber' | 'neutral'
}) {
  const toneClasses =
    tone === 'amber'
      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300'
      : 'border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white'
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-gray-400">{hint}</span>}
      </p>
    </div>
  )
}
