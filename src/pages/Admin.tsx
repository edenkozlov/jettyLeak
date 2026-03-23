import { useCallback, useEffect, useState } from 'react'

import { useGraphQL } from '@/hooks/useGraphQL'
import { GET_PREDICTED_SIGNALS } from '@/queries/getPredictedSignals'
import { GET_LABELS } from '@/queries/getLabels'
import { GET_SENSORS } from '@/queries/getSensors'
import { INSERT_SIGNAL, DELETE_SIGNAL } from '@/mutations/signalMutations'
import { RETRAIN_MODELS } from '@/mutations/retrainMutation'

type Tab = 'predictions' | 'labels' | 'retrain'

interface PredictedSignal {
  id: number
  sensor_id: number
  sensor: { name: string; building: { name: string } | null } | null
  prediction: string
  start_time: string
  end_time: string
  created_at: string
}

interface Label {
  id: number
  sensor_id: number
  sensor: { name: string } | null
  value: string
  start_time: string
  end_time: string
}

interface Sensor {
  id: number
  name: string
  building: { id: number; name: string } | null
}

interface RetrainResult {
  modelsCount?: number
  fixtureTypes?: string[]
  totalSequences?: number
  error?: string
}

const FIXTURE_TYPES = [
  'shower',
  'toilet',
  'kitchen_sink',
  'bathroom_sink',
  'dishwasher',
  'urinal',
  'water_hose',
]

const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: 'predictions', label: 'Predicted Signals' },
  { key: 'labels', label: 'Training Labels' },
  { key: 'retrain', label: 'Retrain' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('predictions')

  // GraphQL hooks
  const { data: sensorsData, executeQuery: fetchSensors } =
    useGraphQL<{ sensor: Sensor[] }>(GET_SENSORS)
  const { data: predictionsData, loading: predictionsLoading, error: predictionsError, executeQuery: fetchPredictions } =
    useGraphQL<{ predicted_signal: PredictedSignal[] }>(GET_PREDICTED_SIGNALS)
  const { data: labelsData, loading: labelsLoading, error: labelsError, executeQuery: fetchLabels } =
    useGraphQL<{ signal: Label[] }>(GET_LABELS)
  const { executeQuery: executeInsertSignal } =
    useGraphQL<{ insert_signal_one: { id: number } }>(INSERT_SIGNAL)
  const { executeQuery: executeDeleteSignal } =
    useGraphQL<{ delete_signal_by_pk: { id: number } | null }>(DELETE_SIGNAL)
  const { executeQuery: executeRetrain } =
    useGraphQL<{ retrain_models: RetrainResult }>(RETRAIN_MODELS)

  const [sensorFilter, setSensorFilter] = useState('')

  // Label form state
  const [newLabel, setNewLabel] = useState({
    sensor_id: '',
    value: '',
    start_time: '',
    end_time: '',
  })
  const [addLabelLoading, setAddLabelLoading] = useState(false)
  const [addLabelError, setAddLabelError] = useState('')

  // Retrain state
  const [retrainLoading, setRetrainLoading] = useState(false)
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null)
  const [retrainError, setRetrainError] = useState('')

  const sensors = sensorsData?.sensor ?? []
  const predictions = predictionsData?.predicted_signal ?? []
  const labels = labelsData?.signal ?? []

  // Fetch sensors on mount
  useEffect(() => {
    fetchSensors()
  }, [fetchSensors])

  // Fetch predictions when tab or filter changes
  useEffect(() => {
    if (activeTab !== 'predictions') return
    const where = sensorFilter
      ? { sensor_id: { _eq: parseInt(sensorFilter) } }
      : {}
    fetchPredictions({ limit: 100, where })
  }, [activeTab, sensorFilter, fetchPredictions])

  // Fetch labels when tab changes
  useEffect(() => {
    if (activeTab !== 'labels') return
    fetchLabels()
  }, [activeTab, fetchLabels])

  const handleDeleteLabel = useCallback(async (id: number) => {
    await executeDeleteSignal({ id })
    fetchLabels()
  }, [executeDeleteSignal, fetchLabels])

  async function handleAddLabel(e: React.FormEvent) {
    e.preventDefault()
    setAddLabelLoading(true)
    setAddLabelError('')
    try {
      await executeInsertSignal({
        sensor_id: parseInt(newLabel.sensor_id),
        value: newLabel.value,
        start_time: new Date(newLabel.start_time).toISOString(),
        end_time: new Date(newLabel.end_time).toISOString(),
        time: new Date(newLabel.start_time).toISOString(),
      })
      setNewLabel({ sensor_id: '', value: '', start_time: '', end_time: '' })
      fetchLabels()
    } catch (err: unknown) {
      setAddLabelError(err instanceof Error ? err.message : 'Failed to add label')
    } finally {
      setAddLabelLoading(false)
    }
  }

  async function handleRetrain() {
    setRetrainLoading(true)
    setRetrainError('')
    setRetrainResult(null)
    try {
      const result = await executeRetrain()
      if (result?.retrain_models?.error) {
        setRetrainError(result.retrain_models.error)
      } else if (result?.retrain_models) {
        setRetrainResult(result.retrain_models)
      } else {
        setRetrainError('No response from retrain')
      }
    } catch (e: unknown) {
      setRetrainError(e instanceof Error ? e.message : 'Retrain failed')
    } finally {
      setRetrainLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Predicted Signals */}
      {activeTab === 'predictions' && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by sensor:
            </label>
            <select
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All sensors</option>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </div>

          {predictionsLoading && (
            <p className="text-gray-500 dark:text-gray-400">Loading predictions...</p>
          )}
          {predictionsError && (
            <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {predictionsError}
            </p>
          )}

          {!predictionsLoading && !predictionsError && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['ID', 'Sensor', 'Building', 'Prediction', 'Start Time', 'End Time', 'Created At'].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {predictions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No predicted signals found.
                      </td>
                    </tr>
                  ) : (
                    predictions.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {p.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {p.sensor?.name ?? p.sensor_id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {p.sensor?.building?.name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            {p.prediction}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(p.start_time).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(p.end_time).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Training Labels */}
      {activeTab === 'labels' && (
        <div>
          {/* Add Label Form */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Add New Label
            </h2>
            <form onSubmit={handleAddLabel} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sensor
                </label>
                <select
                  required
                  value={newLabel.sensor_id}
                  onChange={(e) => setNewLabel({ ...newLabel, sensor_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select sensor</option>
                  {sensors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fixture Type
                </label>
                <select
                  required
                  value={newLabel.value}
                  onChange={(e) => setNewLabel({ ...newLabel, value: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select type</option>
                  {FIXTURE_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newLabel.start_time}
                  onChange={(e) => setNewLabel({ ...newLabel, start_time: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newLabel.end_time}
                  onChange={(e) => setNewLabel({ ...newLabel, end_time: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addLabelLoading}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {addLabelLoading ? 'Adding...' : 'Add Label'}
                </button>
              </div>
            </form>
            {addLabelError && (
              <p className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {addLabelError}
              </p>
            )}
          </div>

          {labelsLoading && (
            <p className="text-gray-500 dark:text-gray-400">Loading labels...</p>
          )}
          {labelsError && (
            <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {labelsError}
            </p>
          )}

          {!labelsLoading && !labelsError && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['ID', 'Sensor', 'Value', 'Start Time', 'End Time', ''].map((header, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {labels.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No labels found.
                      </td>
                    </tr>
                  ) : (
                    labels.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {l.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {l.sensor?.name ?? l.sensor_id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            {l.value.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(l.start_time).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(l.end_time).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => handleDeleteLabel(l.id)}
                            className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Retrain */}
      {activeTab === 'retrain' && (
        <div className="mx-auto max-w-lg">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Retrain Model
            </h2>
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This will retrain the HMM models using all labeled signals in the database.
              </p>
            </div>
            <button
              onClick={handleRetrain}
              disabled={retrainLoading}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {retrainLoading ? 'Retraining...' : 'Retrain Model'}
            </button>

            {retrainError && (
              <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {retrainError}
              </p>
            )}

            {retrainResult && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-4 dark:border-green-700 dark:bg-green-900/30">
                <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
                  Retrain completed successfully.
                </p>
                {retrainResult.fixtureTypes && (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Fixture types trained:{' '}
                    {retrainResult.fixtureTypes.join(', ')}
                  </p>
                )}
                {retrainResult.totalSequences != null && (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Total sequences: {retrainResult.totalSequences}
                  </p>
                )}
                {retrainResult.modelsCount != null && (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Models trained: {retrainResult.modelsCount}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
