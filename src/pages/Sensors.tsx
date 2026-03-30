import { useSensorsPage } from '@/hooks/useSensorsPage'
import type { Sensor } from '@/types'
import { formatDate } from '@/utils/formatDate'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const IC = 'h-3.5 w-3.5 shrink-0'

function SensorIcon({ className = IC }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sensorLocation(s: Sensor): string | null {
  if (s.location) return s.location
  const parts: string[] = []
  if (s.building?.full_address) parts.push(s.building.full_address)
  if (s.floor_number != null) parts.push(`Floor ${s.floor_number}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function connectivityLabel(s: Sensor): { label: string; dot: string } {
  const wifi = s.last_wifi ? new Date(s.last_wifi).getTime() : 0
  const lora = s.last_lora ? new Date(s.last_lora).getTime() : 0
  const latest = Math.max(wifi, lora)
  if (latest === 0) return { label: 'Never seen', dot: 'bg-gray-300 dark:bg-gray-600' }
  const ago = Date.now() - latest
  if (ago < 10 * 60_000) return { label: 'Online', dot: 'bg-emerald-500' }
  if (ago < 60 * 60_000) return { label: `${Math.round(ago / 60_000)}m ago`, dot: 'bg-amber-400' }
  if (ago < 24 * 3_600_000) return { label: `${Math.round(ago / 3_600_000)}h ago`, dot: 'bg-amber-400' }
  return { label: `${Math.round(ago / 86_400_000)}d ago`, dot: 'bg-red-400' }
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
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-24" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-44" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-28" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-14" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-16" /></td>
      <td className="px-4 py-3 sm:px-6 sm:py-4"><Bone className="h-4 w-20" /></td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Sensors() {
  const { sensors, loading, error } = useSensorsPage()

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
        <h1 className="text-xl font-bold sm:text-2xl">Sensors</h1>
        {!loading && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {sensors.length}
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
                  <SensorIcon />
                  Name
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  Location
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Building
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788" /></svg>
                  Status
                </span>
              </th>
              <th className="px-4 py-3 sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.25a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Type
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
            ) : sensors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No sensors found
                </td>
              </tr>
            ) : (
              sensors.map((sensor) => {
                const loc = sensorLocation(sensor)
                const conn = connectivityLabel(sensor)
                return (
                  <tr
                    key={sensor.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-6 sm:py-4">
                      {sensor.name ?? '—'}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                      {loc ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                      {sensor.building?.name ?? <span className="text-gray-300 dark:text-gray-600">Unassigned</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`inline-block h-2 w-2 rounded-full ${conn.dot}`} />
                        <span className="text-gray-500 dark:text-gray-400">{conn.label}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                      {sensor.type ? (
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium dark:bg-gray-700">
                          {sensor.type}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400 sm:px-6 sm:py-4">
                      {formatDate(sensor.created_at)}
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
                <Bone className="mb-2 h-4 w-24" />
                <Bone className="mb-3 h-3 w-48" />
                <div className="flex gap-4">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-3 w-14" />
                </div>
              </div>
            ))
          : sensors.map((sensor) => {
              const loc = sensorLocation(sensor)
              const conn = connectivityLabel(sensor)
              return (
                <div
                  key={sensor.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {sensor.name ?? '—'}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`inline-block h-2 w-2 rounded-full ${conn.dot}`} />
                      {conn.label}
                    </span>
                  </div>

                  {loc && (
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {loc}
                    </p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                    {sensor.building?.name && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {sensor.building.name}
                      </span>
                    )}
                    {sensor.type && (
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium dark:bg-gray-700 dark:text-gray-400">
                        {sensor.type}
                      </span>
                    )}
                    <span className="ml-auto">{formatDate(sensor.created_at)}</span>
                  </div>
                </div>
              )
            })}
        {!loading && sensors.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
            <SensorIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No sensors found</p>
          </div>
        )}
      </div>
    </div>
  )
}
