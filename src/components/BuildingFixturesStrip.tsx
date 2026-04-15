import { Link } from 'react-router'

import FixtureTypeIcon from '@/components/FixtureTypeIcon'
import { useBuildingFixtures, type FixtureTypeGroup } from '@/hooks/useBuildingFixtures'
import { formatRelative } from '@/utils/formatVolume'

function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return '0s'
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.round(totalSec)}s`
}

function TypeTile({ group }: { group: FixtureTypeGroup }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/40">
      <FixtureTypeIcon type={group.type} size="h-12 w-12" padding="p-2.5" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
          {group.type}
          <span className="ml-2 text-sm font-normal text-gray-400">
            × {group.fixtureCount}
          </span>
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
          {group.totalEvents} event{group.totalEvents === 1 ? '' : 's'}
          {group.totalDurationS > 0 && ` · ${formatDuration(group.totalDurationS)}`}
        </p>
        {group.lastSignalAt && (
          <p className="truncate text-xs text-gray-400">
            {formatRelative(group.lastSignalAt)}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Compact fixtures strip for the Building Detail page.
 * Shows fixture **types** only — aggregated counts and activity.
 * Per-fixture breakdown is hidden until the classifier-name matching is reliable.
 */
export default function BuildingFixturesStrip({ buildingId }: { buildingId: number }) {
  const { groups, fixtures, loading } = useBuildingFixtures(buildingId)

  if (loading && fixtures.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
            />
          ))}
        </div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
        No fixtures recorded for this building yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Fixture types
          <span className="ml-2 text-sm font-normal text-gray-400">
            {fixtures.length} fixture{fixtures.length === 1 ? '' : 's'} · {groups.length} type{groups.length === 1 ? '' : 's'}
          </span>
        </h2>
        <Link
          to={`/dashboard/fixtures/${buildingId}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          View all →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <TypeTile key={g.type} group={g} />
        ))}
      </div>
    </div>
  )
}
