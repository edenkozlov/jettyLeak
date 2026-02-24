import { useHomePage } from '@/hooks/useHomePage'

const STAT_CARDS = [
  { key: 'clientCount', label: 'Clients' },
  { key: 'buildingCount', label: 'Buildings' },
  { key: 'sensorCount', label: 'Sensors' },
  { key: 'reportCount', label: 'Reports' },
] as const

export default function Home() {
  const { clientCount, buildingCount, sensorCount, reportCount, loading, error } =
    useHomePage()

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

  const counts: Record<string, number> = {
    clientCount,
    buildingCount,
    sensorCount,
    reportCount,
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-3xl">{counts[card.key]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
