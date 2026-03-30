import { useClientsPage } from '@/hooks/useClientsPage'
import type { Client } from '@/types'
import { formatDate } from '@/utils/formatDate'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const IC = 'h-3.5 w-3.5 shrink-0'

function PersonIcon({ className = IC }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clientName(c: Client): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
}

function buildingCount(c: Client): number {
  return c.buildings_aggregate?.aggregate?.count ?? c.buildings?.length ?? 0
}

function totalSensors(c: Client): number {
  return (
    c.buildings?.reduce(
      (sum, b) => sum + (b.sensors_aggregate?.aggregate?.count ?? 0),
      0,
    ) ?? 0
  )
}

function avgBhi(c: Client): { avg: number; label: string } | null {
  const scored = c.buildings?.filter((b) => b.bhi != null) ?? []
  if (scored.length === 0) return null
  const avg = Math.round(scored.reduce((s, b) => s + b.bhi!, 0) / scored.length)
  const label =
    avg >= 85 ? 'healthy' : avg >= 70 ? 'watch' : avg >= 50 ? 'investigate' : 'critical'
  return { avg, label }
}

const BHI_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  watch: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  investigate: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  critical: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

function AvgBhiBadge({ client }: { client: Client }) {
  const bhi = avgBhi(client)
  if (!bhi) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
  const color = BHI_COLORS[bhi.label] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {bhi.avg}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/[0.06]'

function Bone({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200/70 dark:bg-gray-700/50 ${shimmer} ${className}`} />
}

function RowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-28" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-40" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-8" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-8" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-10" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-20" /></td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Clients() {
  const { clients, loading, error } = useClientsPage()

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Clients</h1>
        {!loading && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {clients.length}
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <PersonIcon />
                  Name
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  Email
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Buildings
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>
                  Sensors
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  Avg Health
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  Created
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No clients found
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const buildings = buildingCount(client)
                const sensors = totalSensors(client)
                return (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {(client.first_name?.[0] ?? client.email?.[0] ?? '?').toUpperCase()}
                        </span>
                        {clientName(client)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                      {client.email ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums sm:px-6 sm:py-4">
                      {buildings > 0 ? (
                        <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          {buildings}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums sm:px-6 sm:py-4">
                      {sensors > 0 ? (
                        <span className="text-gray-700 dark:text-gray-300">{sensors}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                      <AvgBhiBadge client={client} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                      {formatDate(client.created_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Bone className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-4 w-28" />
                    <Bone className="h-3 w-40" />
                  </div>
                </div>
                <div className="mt-3 flex gap-4">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-3 w-16" />
                </div>
              </div>
            ))
          : clients.map((client) => {
              const buildings = buildingCount(client)
              const sensors = totalSensors(client)
              return (
                <div
                  key={client.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {(client.first_name?.[0] ?? client.email?.[0] ?? '?').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {clientName(client)}
                      </p>
                      {client.email && (
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {client.email}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto shrink-0">
                      <AvgBhiBadge client={client} />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      {buildings} building{buildings !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>
                      {sensors} sensor{sensors !== 1 ? 's' : ''}
                    </span>
                    <span className="ml-auto text-gray-400 dark:text-gray-500">
                      {formatDate(client.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
            <PersonIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No clients found</p>
          </div>
        )}
      </div>
    </div>
  )
}
