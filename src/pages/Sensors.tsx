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
      <h1 className="mb-6 text-2xl font-bold">Sensors</h1>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Location</th>
              <th className="px-6 py-3">Building</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sensors.map((sensor) => (
              <tr
                key={sensor.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="whitespace-nowrap px-6 py-4 font-medium">
                  {sensor.name ?? '—'}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {sensor.location ?? '—'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                  {sensor.building?.name ?? '—'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
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
    </div>
  )
}
