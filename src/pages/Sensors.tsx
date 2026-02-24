import { useSensorsPage } from '@/hooks/useSensorsPage'

import { formatDate } from '@/utils/formatDate'

export default function Sensors() {
  const { sensors, loading, error } = useSensorsPage()

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
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Sensors</h1>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 sm:px-6">Name</th>
              <th className="px-4 py-3 sm:px-6">Location</th>
              <th className="px-4 py-3 sm:px-6">Building</th>
              <th className="px-4 py-3 sm:px-6">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sensors.map((sensor) => (
              <tr
                key={sensor.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                  {sensor.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {sensor.location ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {sensor.building?.name ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {formatDate(sensor.created_at)}
                </td>
              </tr>
            ))}
            {sensors.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  No sensors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {sensor.name ?? '—'}
            </p>
            {sensor.location && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {sensor.location}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {sensor.building?.name ?? '—'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(sensor.created_at)}
              </span>
            </div>
          </div>
        ))}
        {sensors.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No sensors found
          </p>
        )}
      </div>
    </div>
  )
}
