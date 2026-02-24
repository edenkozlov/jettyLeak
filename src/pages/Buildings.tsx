import { useBuildingsPage } from '@/hooks/useBuildingsPage'

import { formatDate } from '@/utils/formatDate'

export default function Buildings() {
  const { buildings, loading, error } = useBuildingsPage()

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Buildings</h1>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 sm:px-6">Name</th>
              <th className="px-4 py-3 sm:px-6">Address</th>
              <th className="px-4 py-3 sm:px-6">Client</th>
              <th className="px-4 py-3 sm:px-6">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {buildings.map((building) => (
              <tr
                key={building.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                  {building.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {building.full_address ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {building.client
                    ? [building.client.first_name, building.client.last_name]
                        .filter(Boolean)
                        .join(' ')
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {formatDate(building.created_at)}
                </td>
              </tr>
            ))}
            {buildings.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  No buildings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {buildings.map((building) => (
          <div
            key={building.id}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {building.name ?? '—'}
            </p>
            {building.full_address && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {building.full_address}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {building.client
                  ? [building.client.first_name, building.client.last_name]
                      .filter(Boolean)
                      .join(' ')
                  : '—'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(building.created_at)}
              </span>
            </div>
          </div>
        ))}
        {buildings.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No buildings found
          </p>
        )}
      </div>
    </div>
  )
}
