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
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{counts[card.key]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
