import { useClientsPage } from '@/hooks/useClientsPage'

import { formatDate } from '@/utils/formatDate'

export default function Clients() {
  const { clients, loading, error } = useClientsPage()

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
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Clients</h1>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 sm:px-6">Name</th>
              <th className="px-4 py-3 sm:px-6">Email</th>
              <th className="px-4 py-3 sm:px-6">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {clients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                  {[client.first_name, client.last_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {client.email ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                  {formatDate(client.created_at)}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {clients.map((client) => (
          <div
            key={client.id}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {[client.first_name, client.last_name]
                .filter(Boolean)
                .join(' ') || '—'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {client.email ?? '—'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {formatDate(client.created_at)}
            </p>
          </div>
        ))}
        {clients.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No clients found
          </p>
        )}
      </div>
    </div>
  )
}
