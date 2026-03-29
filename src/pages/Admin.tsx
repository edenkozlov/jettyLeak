import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useGraphQL } from '@/hooks/useGraphQL'
import { useTheme } from '@/contexts/ThemeContext'
import { GET_PREDICTED_SIGNALS } from '@/queries/getPredictedSignals'
import { GET_LABELS } from '@/queries/getLabels'
import { GET_SENSORS } from '@/queries/getSensors'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import { INSERT_SIGNAL, DELETE_SIGNAL, UPDATE_PREDICTED_SIGNAL } from '@/mutations/signalMutations'
import { computeFlowFromPeaks, type FlowPoint } from '@/utils/flowComputation'
import type { MagReport } from '@/types/magReport'

const EXPRESS_URL = import.meta.env.VITE_EXPRESS_ENDPOINT || 'http://localhost:3000'

type Tab = 'predictions' | 'labels' | 'retrain' | 'firmware' | 'bluetooth'

interface PredictedSignal {
  id: number
  sensor_id: number
  sensor: { name: string; building: { name: string } | null } | null
  prediction: string
  confidence: number | null
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
  multiplier: number | null
  type: string | null  // 'lora' | 'wifi'
  last_wifi: string | null
  last_lora: string | null
  firmware_version: string | null
  building: { id: number; name: string } | null
}

interface RetrainTestResult {
  signalId: number
  trueLabel: string
  predicted: string
  correct: boolean
  confidence: number
  scores: Record<string, number>
}

interface RetrainResult {
  modelsCount?: number
  fixtureTypes?: string[]
  totalSequences?: number
  testResults?: RetrainTestResult[]
  accuracy?: number
  error?: string
}

// What we're inspecting in the detail panel — works for both labels and predictions
interface SegmentDetail {
  sensorId: number
  sensorName: string
  sensorMultiplier: number | null
  startTime: string
  endTime: string
  label?: string       // existing label (for labels tab)
  prediction?: string  // existing prediction (for predictions tab)
  sourceId: number     // original row id
  source: 'label' | 'prediction'
}

interface ChartPoint {
  timestamp: number
  x: number | null
  y: number | null
  z: number | null
  total: number | null
  bandEnergy10s: number | null
  bandEnergy60s: number | null
  dominantFreqHz: number | null
  vibrationRpm: number | null
}

const FIXTURE_TYPES = [
  'sink',
  'shower',
  'toilet',
  'hose',
]

const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: 'predictions', label: 'Predicted Signals' },
  { key: 'labels', label: 'Training Labels' },
  { key: 'retrain', label: 'Tools' },
  { key: 'firmware', label: 'Firmware' },
  { key: 'bluetooth', label: 'Bluetooth' },
]

// BLE UUIDs — must match the sensor firmware
const WIFI_SERVICE_UUID = import.meta.env.VITE_BLE_WIFI_SERVICE_UUID
const WIFI_SSID_CHAR_UUID = import.meta.env.VITE_BLE_WIFI_SSID_CHAR_UUID
const WIFI_PASS_CHAR_UUID = import.meta.env.VITE_BLE_WIFI_PASS_CHAR_UUID
const WIFI_STATUS_CHAR_UUID = import.meta.env.VITE_BLE_WIFI_STATUS_CHAR_UUID
const WIFI_COMMAND_CHAR_UUID = import.meta.env.VITE_BLE_WIFI_COMMAND_CHAR_UUID

interface FirmwareTarget {
  sensor_id: number
  is_updated: boolean
}

interface FirmwareEntry {
  id: number
  sensor_type: string
  version: string
  filename: string
  file_size: number
  checksum: string
  uploaded_at: string
  notes: string
  target_sensors: number[]
  targets: FirmwareTarget[]
}

const CHART_COLORS = {
  light: { grid: '#e5e7eb', axis: '#6b7280', tooltipBg: '#fff', tooltipBorder: '#e5e7eb', tooltipText: '#111827' },
  dark: { grid: '#374151', axis: '#9ca3af', tooltipBg: '#1f2937', tooltipBorder: '#374151', tooltipText: '#f3f4f6' },
} as const

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) +
    '.' + d.getMilliseconds().toString().padStart(3, '0')
}

// ── Segment Detail Panel ────────────────────────────────────────────────

function SegmentPanel({
  detail,
  onClose,
  onSaveAsTraining,
}: {
  detail: SegmentDetail
  onClose: () => void
  onSaveAsTraining: (sensorId: number, startTime: string, endTime: string, value: string, predictedSignalId?: number) => Promise<void>
}) {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]

  const { data: magData, loading: magLoading, executeQuery: fetchMag } =
    useGraphQL<{ mag_report: MagReport[] }>(GET_MAG_REPORTS)

  const [relabelValue, setRelabelValue] = useState(detail.prediction || detail.label || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchMag({
      sensorIds: [detail.sensorId],
      since: detail.startTime,
      until: detail.endTime,
    })
  }, [fetchMag, detail.sensorId, detail.startTime, detail.endTime])

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!magData?.mag_report) return []
    return magData.mag_report.map((r) => ({
      timestamp: new Date(r.created_at).getTime(),
      x: r.x_axis_reading,
      y: r.y_axis_reading,
      z: r.z_axis_reading,
      total: r.total_magnitude,
      bandEnergy10s: r.band_energy_10s,
      bandEnergy60s: r.band_energy_60s,
      dominantFreqHz: r.dominant_freq_hz,
      vibrationRpm: r.vibration_rpm,
    }))
  }, [magData])

  const stats = useMemo(() => {
    if (chartData.length === 0) return null
    const durationMs = chartData[chartData.length - 1]!.timestamp - chartData[0]!.timestamp
    const maxBandEnergy = Math.max(...chartData.map((p) => p.bandEnergy10s ?? 0))
    const avgBandEnergy = chartData.reduce((sum, p) => sum + (p.bandEnergy10s ?? 0), 0) / chartData.length
    const freqs = chartData.filter((p) => p.dominantFreqHz != null).map((p) => p.dominantFreqHz!)
    const avgFreq = freqs.length > 0 ? freqs.reduce((a, b) => a + b, 0) / freqs.length : null
    return { durationMs, readings: chartData.length, maxBandEnergy, avgBandEnergy, avgFreq }
  }, [chartData])

  const flowData = useMemo<FlowPoint[]>(() => {
    if (!detail.sensorMultiplier || detail.sensorMultiplier <= 0 || chartData.length < 5) return []
    return computeFlowFromPeaks(chartData, detail.sensorMultiplier)
  }, [chartData, detail.sensorMultiplier])

  const flowStats = useMemo(() => {
    if (flowData.length === 0) return null
    const maxFlow = Math.max(...flowData.map((p) => p.flowRateLph))
    const avgFlow = flowData.reduce((s, p) => s + p.flowRateLph, 0) / flowData.length
    const totalLitres = flowData.length > 0 ? flowData[flowData.length - 1]!.accumulatedL : 0
    return { maxFlow, avgFlow, totalLitres }
  }, [flowData])

  const tooltipStyle = useMemo(() => ({
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 11,
    color: colors.tooltipText,
  }), [colors])

  async function handleSaveAsTraining() {
    if (!relabelValue) return
    setSaving(true)
    try {
      await onSaveAsTraining(
        detail.sensorId, detail.startTime, detail.endTime, relabelValue,
        detail.source === 'prediction' ? detail.sourceId : undefined,
      )
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-indigo-200 bg-white p-5 shadow-2xl dark:border-indigo-800 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Segment Detail
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Sensor: <span className="font-medium text-gray-800 dark:text-gray-200">{detail.sensorName}</span></span>
            <span>Start: <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(detail.startTime).toLocaleString()}</span></span>
            <span>End: <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(detail.endTime).toLocaleString()}</span></span>
            {detail.label && (
              <span>Label: <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{detail.label.replace(/_/g, ' ')}</span></span>
            )}
            {detail.prediction && (
              <span>Prediction: <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{detail.prediction.replace(/_/g, ' ')}</span></span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Duration', value: `${(stats.durationMs / 1000).toFixed(1)}s` },
            { label: 'Readings', value: stats.readings.toString() },
            { label: 'Max Band Energy', value: stats.maxBandEnergy.toFixed(1) },
            { label: 'Avg Freq', value: stats.avgFreq != null ? `${stats.avgFreq.toFixed(2)} Hz` : '—' },
            ...(flowStats ? [
              { label: 'Avg Flow', value: `${flowStats.avgFlow.toFixed(1)} L/h` },
              { label: 'Max Flow', value: `${flowStats.maxFlow.toFixed(1)} L/h` },
              { label: 'Total Volume', value: `${flowStats.totalLitres.toFixed(3)} L` },
            ] : []),
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</div>
              <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {magLoading && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading mag data...</p>}

      {!magLoading && chartData.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No mag data found for this time range.</p>
      )}

      {!magLoading && chartData.length > 0 && (
        <div className="space-y-4">
          {/* X/Y/Z Axes */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Magnetometer X / Y / Z</h4>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={formatTime}
                    tick={{ fontSize: 10, fill: colors.axis }}
                    axisLine={{ stroke: colors.grid }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                  <Line type="monotone" dataKey="x" stroke="#ef4444" dot={false} strokeWidth={1.5} name="X" />
                  <Line type="monotone" dataKey="y" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Y" />
                  <Line type="monotone" dataKey="z" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Z" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Magnitude */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Total Magnitude</h4>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                  <Line type="monotone" dataKey="total" stroke="#8b5cf6" dot={false} strokeWidth={1.5} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Band Energy */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Band Energy</h4>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                  <Line type="monotone" dataKey="bandEnergy10s" stroke="#f97316" dot={false} strokeWidth={1.5} name="10s" />
                  <Line type="monotone" dataKey="bandEnergy60s" stroke="#06b6d4" dot={false} strokeWidth={1.5} name="60s" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dominant Frequency */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Dominant Frequency (Hz)</h4>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} />
                  <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                  <Line type="monotone" dataKey="dominantFreqHz" stroke="#ec4899" dot={false} strokeWidth={1.5} name="Freq Hz" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Flow Rate */}
          {flowData.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Flow Rate (L/h) &amp; Accumulated (L)</h4>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={flowData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#3b82f6' }} axisLine={{ stroke: colors.grid }} width={50} label={{ value: 'L/h', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#3b82f6' } }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#10b981' }} axisLine={{ stroke: colors.grid }} width={50} label={{ value: 'L', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#10b981' } }} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} formatter={(value: unknown, name: unknown) => [typeof value === 'number' ? value.toFixed(2) : '—', String(name ?? '')]} />
                    <Line yAxisId="left" type="monotone" dataKey="flowRateLph" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Flow Rate" />
                    <Line yAxisId="right" type="monotone" dataKey="accumulatedL" stroke="#10b981" dot={false} strokeWidth={1.5} name="Accumulated" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {!flowData.length && detail.sensorMultiplier != null && detail.sensorMultiplier > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">No flow peaks detected in this segment.</p>
          )}
          {(detail.sensorMultiplier == null || detail.sensorMultiplier <= 0) && (
            <p className="text-xs text-gray-400 dark:text-gray-500">No sensor multiplier configured — flow computation unavailable.</p>
          )}
        </div>
      )}

      {/* Save as training signal — shown for predictions, or for labels to relabel */}
      {detail.source === 'prediction' && !saved && (
        <div className="mt-5 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
          <h4 className="mb-3 text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Mark as Training Signal
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Fixture Type</label>
              <select
                value={relabelValue}
                onChange={(e) => setRelabelValue(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select type</option>
                {FIXTURE_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveAsTraining}
              disabled={!relabelValue || saving}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {saving ? 'Saving...' : 'Save as Training Label'}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-700 dark:bg-green-900/30">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Saved as training label: {relabelValue.replace(/_/g, ' ')}
          </p>
        </div>
      )}
      </div>
    </div>
  )
}

// ── Label Creator with Mag Data Viewer ──────────────────────────────────

const TIME_RANGES = [
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '15 min', ms: 15 * 60_000 },
  { label: '1 hour', ms: 60 * 60_000 },
  { label: '6 hours', ms: 6 * 60 * 60_000 },
]

function LabelCreator({
  sensors,
  onSave,
  saving,
  error,
}: {
  sensors: Sensor[]
  onSave: (sensorId: number, startTime: string, endTime: string, value: string) => Promise<void>
  saving: boolean
  error: string
}) {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]

  const [sensorId, setSensorId] = useState('')
  const [fixtureType, setFixtureType] = useState('')
  const [timeRangeMs, setTimeRangeMs] = useState(15 * 60_000)

  // Mag data for preview
  const { data: magData, loading: magLoading, executeQuery: fetchMag } =
    useGraphQL<{ mag_report: MagReport[] }>(GET_MAG_REPORTS)

  // Drag selection state
  const [selLeft, setSelLeft] = useState<number | null>(null)
  const [selRight, setSelRight] = useState<number | null>(null)
  const selectingRef = useRef(false)
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null)
  const [saved, setSaved] = useState(false)

  // Fetch mag data when sensor or time range changes
  useEffect(() => {
    if (!sensorId) return
    const now = new Date()
    const since = new Date(now.getTime() - timeRangeMs)
    fetchMag({
      sensorIds: [parseInt(sensorId)],
      since: since.toISOString(),
      until: now.toISOString(),
    })
    setSelectedRange(null)
    setSaved(false)
  }, [sensorId, timeRangeMs, fetchMag])

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!magData?.mag_report) return []
    return magData.mag_report.map((r) => ({
      timestamp: new Date(r.created_at).getTime(),
      x: r.x_axis_reading,
      y: r.y_axis_reading,
      z: r.z_axis_reading,
      total: r.total_magnitude,
      bandEnergy10s: r.band_energy_10s,
      bandEnergy60s: r.band_energy_60s,
      dominantFreqHz: r.dominant_freq_hz,
      vibrationRpm: r.vibration_rpm,
    }))
  }, [magData])

  const tooltipStyle = useMemo(() => ({
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 11,
    color: colors.tooltipText,
  }), [colors])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = useCallback((e: any) => {
    if (e?.activeLabel != null) {
      selectingRef.current = true
      setSelLeft(Number(e.activeLabel))
      setSelRight(null)
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((e: any) => {
    if (selectingRef.current && e?.activeLabel != null) {
      setSelRight(Number(e.activeLabel))
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    if (selectingRef.current && selLeft != null && selRight != null && selLeft !== selRight) {
      const start = Math.min(selLeft, selRight)
      const end = Math.max(selLeft, selRight)
      setSelectedRange({ start, end })
    }
    selectingRef.current = false
    setSelLeft(null)
    setSelRight(null)
  }, [selLeft, selRight])

  async function handleSave() {
    if (!selectedRange || !sensorId || !fixtureType) return
    await onSave(
      parseInt(sensorId),
      new Date(selectedRange.start).toISOString(),
      new Date(selectedRange.end).toISOString(),
      fixtureType,
    )
    setSaved(true)
    setSelectedRange(null)
  }

  const selectionMin = selLeft != null && selRight != null ? Math.min(selLeft, selRight) : null
  const selectionMax = selLeft != null && selRight != null ? Math.max(selLeft, selRight) : null

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add New Label</h2>

      {/* Controls row */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sensor</label>
          <select
            value={sensorId}
            onChange={(e) => { setSensorId(e.target.value); setSelectedRange(null); setSaved(false) }}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select sensor</option>
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>{s.name || s.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Fixture Type</label>
          <select
            value={fixtureType}
            onChange={(e) => setFixtureType(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select type</option>
            {FIXTURE_TYPES.map((ft) => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Time Range</label>
          <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.ms}
                type="button"
                onClick={() => setTimeRangeMs(tr.ms)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  timeRangeMs === tr.ms
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mag data chart */}
      {sensorId && (
        <>
          {magLoading && <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading mag data...</p>}

          {!magLoading && chartData.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No mag data for this sensor/range.</p>
          )}

          {!magLoading && chartData.length > 0 && (
            <>
              <div className="mb-2 flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                Drag on the chart to select the time range for the label
              </div>

              {/* X/Y/Z chart with drag selection */}
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} />
                    <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                    <Line type="monotone" dataKey="x" stroke="#ef4444" dot={false} strokeWidth={1.5} name="X" />
                    <Line type="monotone" dataKey="y" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Y" />
                    <Line type="monotone" dataKey="z" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Z" />
                    {/* Active drag highlight */}
                    {selectionMin != null && selectionMax != null && (
                      <ReferenceArea x1={selectionMin} x2={selectionMax} fill="#6366f1" fillOpacity={0.2} />
                    )}
                    {/* Confirmed selection */}
                    {selectedRange && (
                      <ReferenceArea x1={selectedRange.start} x2={selectedRange.end} fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" strokeWidth={1} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Band energy chart */}
              <div className="mt-2 h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} />
                    <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                    <Line type="monotone" dataKey="bandEnergy10s" stroke="#f97316" dot={false} strokeWidth={1.5} name="Band 10s" />
                    <Line type="monotone" dataKey="bandEnergy60s" stroke="#06b6d4" dot={false} strokeWidth={1.5} name="Band 60s" />
                    {selectionMin != null && selectionMax != null && (
                      <ReferenceArea x1={selectionMin} x2={selectionMax} fill="#6366f1" fillOpacity={0.2} />
                    )}
                    {selectedRange && (
                      <ReferenceArea x1={selectedRange.start} x2={selectedRange.end} fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" strokeWidth={1} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}

      {/* Selected range confirmation */}
      {selectedRange && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-900/20">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            <span className="font-medium">Selected:</span>{' '}
            {formatTime(selectedRange.start)} — {formatTime(selectedRange.end)}{' '}
            <span className="text-gray-400">({((selectedRange.end - selectedRange.start) / 1000).toFixed(1)}s)</span>
          </div>
          {fixtureType && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{fixtureType}</span>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSelectedRange(null)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              Re-select
            </button>
            <button
              onClick={handleSave}
              disabled={!fixtureType || saving}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
            >
              {saving ? 'Saving...' : 'Save Label'}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-2 dark:border-green-700 dark:bg-green-900/30">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Label saved successfully.</p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

// ── Main Admin Page ─────────────────────────────────────────────────────

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('predictions')
  const [segmentDetail, setSegmentDetail] = useState<SegmentDetail | null>(null)

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
  const { executeQuery: executeUpdatePrediction } =
    useGraphQL<{ update_predicted_signal_by_pk: { id: number; prediction: string } }>(UPDATE_PREDICTED_SIGNAL)

  const [sensorFilter, setSensorFilter] = useState('')
  const [addLabelLoading, setAddLabelLoading] = useState(false)
  const [addLabelError, setAddLabelError] = useState('')

  // Retrain state
  const [retrainLoading, setRetrainLoading] = useState(false)
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null)
  const [retrainError, setRetrainError] = useState('')

  // Sanitize state
  const [sanitizeSensorId, setSanitizeSensorId] = useState('')
  const [sanitizeLoading, setSanitizeLoading] = useState(false)
  const [sanitizeResult, setSanitizeResult] = useState<{ totalDeleted: number; totalKept: number } | null>(null)
  const [sanitizeError, setSanitizeError] = useState('')

  // Firmware OTA state
  const [fwSensorType, setFwSensorType] = useState<'receiver' | 'dual'>('receiver')
  const [fwVersion, setFwVersion] = useState('')
  const [fwNotes, setFwNotes] = useState('')
  const [fwFile, setFwFile] = useState<File | null>(null)
  const [fwTargetSensors, setFwTargetSensors] = useState<number[]>([]) // empty = all
  const [fwUploading, setFwUploading] = useState(false)
  const [fwUploadResult, setFwUploadResult] = useState<string>('')
  const [fwUploadError, setFwUploadError] = useState('')
  const [fwHistory, setFwHistory] = useState<{ receiver: FirmwareEntry[]; dual: FirmwareEntry[] }>({ receiver: [], dual: [] })
  const [rebootingSensorId, setRebootingSensorId] = useState<number | null>(null)
  const [rebootSearch, setRebootSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false)
  const targetDropdownRef = useRef<HTMLDivElement>(null)

  // Bluetooth state
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null)
  const [bleConnected, setBleConnected] = useState(false)
  const [bleConnecting, setBleConnecting] = useState(false)
  const [bleCurrentSSID, setBleCurrentSSID] = useState('')
  const [bleWifiStatus, setBleWifiStatus] = useState('')
  const [bleNewSSID, setBleNewSSID] = useState('')
  const [bleNewPass, setBleNewPass] = useState('')
  const [bleSending, setBleSending] = useState(false)
  const [bleError, setBleError] = useState('')
  const [bleChars, setBleChars] = useState<{
    ssid: BluetoothRemoteGATTCharacteristic
    pass: BluetoothRemoteGATTCharacteristic
    status: BluetoothRemoteGATTCharacteristic
    command: BluetoothRemoteGATTCharacteristic
  } | null>(null)

  const sensors = sensorsData?.sensor ?? []
  const predictions = predictionsData?.predicted_signal ?? []
  const labels = labelsData?.signal ?? []

  useEffect(() => { fetchSensors() }, [fetchSensors])

  // Poll sensors + firmware history every 30s on firmware tab for live status
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (activeTab !== 'firmware') return
    fetchSensors()
    fetchFirmwareHistory()
    const pollInterval = setInterval(() => { fetchSensors(); fetchFirmwareHistory() }, 30000)
    const tickInterval = setInterval(() => setNow(Date.now()), 10000)
    return () => { clearInterval(pollInterval); clearInterval(tickInterval) }
  }, [activeTab, fetchSensors])

  useEffect(() => {
    if (activeTab !== 'predictions') return
    const where = sensorFilter ? { sensor_id: { _eq: parseInt(sensorFilter) } } : {}
    fetchPredictions({ limit: 100, where })
  }, [activeTab, sensorFilter, fetchPredictions])

  useEffect(() => {
    if (activeTab !== 'labels') return
    fetchLabels()
  }, [activeTab, fetchLabels])

  // Close detail panel on tab switch
  useEffect(() => { setSegmentDetail(null) }, [activeTab])

  const handleDeleteLabel = useCallback(async (id: number) => {
    await executeDeleteSignal({ id })
    fetchLabels()
  }, [executeDeleteSignal, fetchLabels])

  const handleSaveAsTraining = useCallback(async (sensorId: number, startTime: string, endTime: string, value: string, predictedSignalId?: number) => {
    // Insert training label
    await executeInsertSignal({
      sensor_id: sensorId,
      value,
      start_time: startTime,
      end_time: endTime,
      time: startTime,
    })
    // Also update the predicted_signal prediction to match the new label
    if (predictedSignalId != null) {
      await executeUpdatePrediction({ id: predictedSignalId, prediction: value })
      // Refresh predictions list
      const where = sensorFilter ? { sensor_id: { _eq: parseInt(sensorFilter) } } : {}
      fetchPredictions({ limit: 100, where })
    }
  }, [executeInsertSignal, executeUpdatePrediction, sensorFilter, fetchPredictions])

  async function handleRetrain() {
    setRetrainLoading(true)
    setRetrainError('')
    setRetrainResult(null)
    try {
      const res = await fetch(`${EXPRESS_URL}/api/admin/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `${res.status} ${res.statusText}`)
      setRetrainResult(result)
    } catch (e: unknown) {
      setRetrainError(e instanceof Error ? e.message : 'Retrain failed')
    } finally {
      setRetrainLoading(false)
    }
  }

  async function handleSanitize() {
    if (!sanitizeSensorId) return
    setSanitizeLoading(true)
    setSanitizeError('')
    setSanitizeResult(null)
    try {
      const res = await fetch(`${EXPRESS_URL}/api/admin/sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensor_id: parseInt(sanitizeSensorId) }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `${res.status} ${res.statusText}`)
      setSanitizeResult(result)
    } catch (e: unknown) {
      setSanitizeError(e instanceof Error ? e.message : 'Sanitize failed')
    } finally {
      setSanitizeLoading(false)
    }
  }

  // ── Sensor status helpers ──────────────────
  const DEAD_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes

  function timeAgo(ts: string | null): string {
    if (!ts) return 'never'
    const diff = now - new Date(ts).getTime()
    if (diff < 0) return 'just now'
    const secs = Math.floor(diff / 1000)
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  function isAlive(ts: string | null): boolean {
    if (!ts) return false
    return (now - new Date(ts).getTime()) < DEAD_THRESHOLD_MS
  }

  // ── Firmware OTA handlers ──────────────────
  async function fetchFirmwareHistory() {
    try {
      const [recRes, dualRes] = await Promise.all([
        fetch(`${EXPRESS_URL}/api/ota/history/receiver`),
        fetch(`${EXPRESS_URL}/api/ota/history/dual`),
      ])
      const receiver = recRes.ok ? await recRes.json() : []
      const dual = dualRes.ok ? await dualRes.json() : []
      setFwHistory({ receiver, dual })
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (activeTab === 'firmware') fetchFirmwareHistory()
  }, [activeTab])

  // Close target dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false)
        setTargetSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleFirmwareUpload() {
    if (!fwFile || !fwVersion) return
    setFwUploading(true)
    setFwUploadError('')
    setFwUploadResult('')
    try {
      const buffer = await fwFile.arrayBuffer()
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
        'x-sensor-type': fwSensorType,
        'x-version': fwVersion,
        'x-notes': fwNotes,
      }
      if (fwTargetSensors.length > 0) {
        headers['x-target-sensors'] = fwTargetSensors.join(',')
      }
      const res = await fetch(`${EXPRESS_URL}/api/ota/upload`, {
        method: 'POST',
        headers,
        body: buffer,
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `${res.status}`)
      const targetDesc = result.target_sensors?.length > 0
        ? `sensors [${result.target_sensors.join(', ')}]`
        : 'all sensors'
      setFwUploadResult(`Uploaded v${result.version} for ${result.sensor_type} → ${targetDesc} (${(result.file_size / 1024).toFixed(0)} KB)`)
      setFwVersion('')
      setFwNotes('')
      setFwFile(null)
      setFwTargetSensors([])
      fetchFirmwareHistory()
    } catch (e: unknown) {
      setFwUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setFwUploading(false)
    }
  }

  async function handleFirmwareDelete(id: number) {
    try {
      await fetch(`${EXPRESS_URL}/api/ota/firmware/${id}`, { method: 'DELETE' })
      fetchFirmwareHistory()
    } catch { /* ignore */ }
  }

  async function handleReboot(sensorId: number) {
    setRebootingSensorId(sensorId)
    try {
      const res = await fetch(`${EXPRESS_URL}/api/ota/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensor_id: sensorId, command: 'reboot' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || `${res.status}`)
    } catch { /* ignore */ }
    // Keep the "rebooting" state for a few seconds as visual feedback
    setTimeout(() => setRebootingSensorId(null), 3000)
  }

  function toggleTargetSensor(sensorId: number) {
    setFwTargetSensors((prev) =>
      prev.includes(sensorId) ? prev.filter((id) => id !== sensorId) : [...prev, sensorId]
    )
  }

  // ── Bluetooth handlers ──────────────────
  async function handleBleScan() {
    setBleError('')
    setBleConnecting(true)
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge.')
      }
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [WIFI_SERVICE_UUID] }],
      })
      setBleDevice(device)

      device.addEventListener('gattserverdisconnected', () => {
        setBleConnected(false)
        setBleChars(null)
        setBleCurrentSSID('')
        setBleWifiStatus('')
      })

      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(WIFI_SERVICE_UUID)

      const ssidChar = await service.getCharacteristic(WIFI_SSID_CHAR_UUID)
      const passChar = await service.getCharacteristic(WIFI_PASS_CHAR_UUID)
      const statusChar = await service.getCharacteristic(WIFI_STATUS_CHAR_UUID)
      const commandChar = await service.getCharacteristic(WIFI_COMMAND_CHAR_UUID)

      setBleChars({ ssid: ssidChar, pass: passChar, status: statusChar, command: commandChar })

      // Read current SSID
      const ssidValue = await ssidChar.readValue()
      setBleCurrentSSID(new TextDecoder().decode(ssidValue))

      // Read current status
      const statusValue = await statusChar.readValue()
      setBleWifiStatus(new TextDecoder().decode(statusValue))

      // Subscribe to status notifications
      await statusChar.startNotifications()
      statusChar.addEventListener('characteristicvaluechanged', ((event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic
        const value = new TextDecoder().decode(target.value!)
        setBleWifiStatus(value)
        if (value.startsWith('connected:') || value.startsWith('error:') || value === 'disconnected') {
          setBleSending(false)
        }
      }) as EventListener)

      setBleConnected(true)
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'NotFoundError') {
        setBleError(e.message)
      }
    } finally {
      setBleConnecting(false)
    }
  }

  async function handleBleDisconnect() {
    if (bleDevice?.gatt?.connected) {
      bleDevice.gatt.disconnect()
    }
    setBleDevice(null)
    setBleConnected(false)
    setBleChars(null)
    setBleCurrentSSID('')
    setBleWifiStatus('')
  }

  async function handleBleSendWiFi() {
    if (!bleChars || !bleNewSSID) return
    setBleSending(true)
    setBleError('')
    try {
      const encoder = new TextEncoder()
      await bleChars.ssid.writeValue(encoder.encode(bleNewSSID))
      await bleChars.pass.writeValue(encoder.encode(bleNewPass))
      await bleChars.command.writeValue(encoder.encode('CONNECT'))
      // Status will update via notification
    } catch (e: unknown) {
      setBleError(e instanceof Error ? e.message : 'Failed to send WiFi config')
      setBleSending(false)
    }
  }

  function openPredictionDetail(p: PredictedSignal) {
    const sensor = sensors.find((s) => s.id === p.sensor_id)
    setSegmentDetail({
      sensorId: p.sensor_id,
      sensorName: p.sensor?.name ?? `#${p.sensor_id}`,
      sensorMultiplier: sensor?.multiplier ?? null,
      startTime: p.start_time,
      endTime: p.end_time,
      prediction: p.prediction,
      sourceId: p.id,
      source: 'prediction',
    })
  }

  function openLabelDetail(l: Label) {
    const sensor = sensors.find((s) => s.id === l.sensor_id)
    setSegmentDetail({
      sensorId: l.sensor_id,
      sensorName: l.sensor?.name ?? `#${l.sensor_id}`,
      sensorMultiplier: sensor?.multiplier ?? null,
      startTime: l.start_time,
      endTime: l.end_time,
      label: l.value,
      sourceId: l.id,
      source: 'label',
    })
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
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by sensor:</label>
            <select
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All sensors</option>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
          </div>

          {predictionsLoading && <p className="text-gray-500 dark:text-gray-400">Loading predictions...</p>}
          {predictionsError && (
            <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{predictionsError}</p>
          )}

          {!predictionsLoading && !predictionsError && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['ID', 'Sensor', 'Building', 'Prediction', 'Confidence', 'Start Time', 'End Time', ''].map((header, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {predictions.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No predicted signals found.</td></tr>
                  ) : (
                    predictions.map((p) => (
                      <tr
                        key={p.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${segmentDetail?.sourceId === p.id && segmentDetail?.source === 'prediction' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                        onClick={() => openPredictionDetail(p)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{p.id}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{p.sensor?.name ?? p.sensor_id}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{p.sensor?.building?.name ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{p.prediction}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {p.confidence != null ? `${(p.confidence * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(p.start_time).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(p.end_time).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <span className="text-xs text-indigo-500 dark:text-indigo-400">View &rarr;</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {segmentDetail && segmentDetail.source === 'prediction' && (
            <SegmentPanel
              detail={segmentDetail}
              onClose={() => setSegmentDetail(null)}
              onSaveAsTraining={handleSaveAsTraining}
            />
          )}
        </div>
      )}

      {/* Training Labels */}
      {activeTab === 'labels' && (
        <div>
          {/* Add Label */}
          <LabelCreator
            sensors={sensors}
            onSave={async (sensorId, startTime, endTime, value) => {
              setAddLabelLoading(true)
              setAddLabelError('')
              try {
                await executeInsertSignal({
                  sensor_id: sensorId,
                  value,
                  start_time: startTime,
                  end_time: endTime,
                  time: startTime,
                })
                fetchLabels()
              } catch (err: unknown) {
                setAddLabelError(err instanceof Error ? err.message : 'Failed to add label')
              } finally {
                setAddLabelLoading(false)
              }
            }}
            saving={addLabelLoading}
            error={addLabelError}
          />

          {labelsLoading && <p className="text-gray-500 dark:text-gray-400">Loading labels...</p>}
          {labelsError && (
            <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{labelsError}</p>
          )}

          {!labelsLoading && !labelsError && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['ID', 'Sensor', 'Value', 'Start Time', 'End Time', ''].map((header, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {labels.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No labels found.</td></tr>
                  ) : (
                    labels.map((l) => (
                      <tr
                        key={l.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${segmentDetail?.sourceId === l.id && segmentDetail?.source === 'label' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                        onClick={() => openLabelDetail(l)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{l.id}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{l.sensor?.name ?? l.sensor_id}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{l.value.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(l.start_time).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(l.end_time).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLabel(l.id) }}
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

          {segmentDetail && segmentDetail.source === 'label' && (
            <SegmentPanel
              detail={segmentDetail}
              onClose={() => setSegmentDetail(null)}
              onSaveAsTraining={handleSaveAsTraining}
            />
          )}
        </div>
      )}

      {/* Retrain */}
      {activeTab === 'retrain' && (
        <div className="mx-auto max-w-lg space-y-6">
          {/* Retrain */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Retrain Model</h2>
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
              <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{retrainError}</p>
            )}

            {retrainResult && (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-4 dark:border-green-700 dark:bg-green-900/30">
                  <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">Retrain completed successfully.</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-green-700 dark:text-green-400">
                    {retrainResult.fixtureTypes && (
                      <span>Types: {retrainResult.fixtureTypes.join(', ')}</span>
                    )}
                    {retrainResult.totalSequences != null && (
                      <span>Sequences: {retrainResult.totalSequences}</span>
                    )}
                    {retrainResult.accuracy != null && (
                      <span className="font-semibold">Accuracy: {(retrainResult.accuracy * 100).toFixed(1)}%</span>
                    )}
                  </div>
                </div>

                {/* Test results table */}
                {retrainResult.testResults && retrainResult.testResults.length > 0 && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Test Results ({retrainResult.testResults.filter(r => r.correct).length}/{retrainResult.testResults.length} correct)
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {['Signal', 'True Label', 'Predicted', 'Confidence', 'Result'].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                          {retrainResult.testResults.map((r) => (
                            <tr key={r.signalId} className={r.correct ? '' : 'bg-red-50/50 dark:bg-red-900/10'}>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">#{r.signalId}</td>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{r.trueLabel}</td>
                              <td className="px-3 py-1.5">
                                <span className={`rounded-full px-2 py-0.5 font-medium ${r.correct ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                                  {r.predicted}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{(r.confidence * 100).toFixed(1)}%</td>
                              <td className="px-3 py-1.5">
                                {r.correct
                                  ? <span className="font-medium text-green-600 dark:text-green-400">Correct</span>
                                  : <span className="font-medium text-red-600 dark:text-red-400">Wrong</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sanitize */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Sanitize Sensor Data</h2>
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/30">
              <p className="text-sm text-red-800 dark:text-red-300">
                Deletes all mag_report rows with no flow activity (band energy &lt; 5) for the selected sensor. This is irreversible.
              </p>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sensor</label>
              <select
                value={sanitizeSensorId}
                onChange={(e) => { setSanitizeSensorId(e.target.value); setSanitizeResult(null); setSanitizeError('') }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select sensor</option>
                {sensors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.id}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSanitize}
              disabled={sanitizeLoading || !sanitizeSensorId}
              className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {sanitizeLoading ? 'Sanitizing...' : 'Sanitize'}
            </button>

            {sanitizeError && (
              <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{sanitizeError}</p>
            )}

            {sanitizeResult && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-4 dark:border-green-700 dark:bg-green-900/30">
                <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">Sanitization complete.</p>
                <p className="text-sm text-green-700 dark:text-green-400">Deleted: {sanitizeResult.totalDeleted.toLocaleString()} rows</p>
                <p className="text-sm text-green-700 dark:text-green-400">Kept: {sanitizeResult.totalKept.toLocaleString()} rows</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Firmware OTA */}
      {activeTab === 'firmware' && (
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Sensor Status & Controls */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sensors</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">Auto-refreshes every 30s</span>
            </div>
            <input
              type="text"
              placeholder="Search sensors by name or ID..."
              value={rebootSearch}
              onChange={(e) => setRebootSearch(e.target.value)}
              className="mb-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="max-h-[500px] space-y-2 overflow-y-auto">
              {sensors
                .filter((s) => {
                  if (!rebootSearch) return true
                  const q = rebootSearch.toLowerCase()
                  return (s.name || '').toLowerCase().includes(q) || String(s.id).includes(q)
                })
                .map((s) => {
                  const wifiAlive = isAlive(s.last_wifi)
                  const loraAlive = isAlive(s.last_lora)
                  const isLora = s.type === 'lora'
                  // Overall alive: wifi must be alive, and for lora sensors lora must also be alive
                  const alive = wifiAlive && (!isLora || loraAlive)

                  return (
                    <div key={s.id} className={`rounded-md border px-4 py-3 ${alive ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${alive ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{s.name || `Sensor #${s.id}`}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">#{s.id}</span>
                          {s.type && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${s.type === 'wifi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                              {s.type === 'wifi' ? 'WiFi' : 'LoRa'}
                            </span>
                          )}
                          {s.firmware_version && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">v{s.firmware_version}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleReboot(s.id)}
                          disabled={rebootingSensorId === s.id}
                          className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                        >
                          {rebootingSensorId === s.id ? 'Reboot queued...' : 'Reboot'}
                        </button>
                      </div>
                      {/* Status row */}
                      <div className="mt-1.5 flex items-center gap-4 pl-[18px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${wifiAlive ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className={`text-xs ${wifiAlive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            WiFi {wifiAlive ? 'alive' : s.last_wifi ? timeAgo(s.last_wifi) : 'never'}
                          </span>
                        </div>
                        {isLora && (
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${loraAlive ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className={`text-xs ${loraAlive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              LoRa {loraAlive ? 'alive' : s.last_lora ? timeAgo(s.last_lora) : 'never'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              {sensors.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No sensors found.</p>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Sensors poll for commands every ~30s. Dead = no heartbeat for 3+ minutes.
            </p>
          </div>

          {/* Upload */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Upload Firmware</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sensor Type</label>
                  <select
                    value={fwSensorType}
                    onChange={(e) => { setFwSensorType(e.target.value as 'receiver' | 'dual'); setFwTargetSensors([]) }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="receiver">LoRa (Receiver)</option>
                    <option value="dual">WiFi (Dual)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Version</label>
                  <input
                    type="text"
                    placeholder="1.0.1"
                    value={fwVersion}
                    onChange={(e) => setFwVersion(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target Sensors</label>
                <div className="relative" ref={targetDropdownRef}>
                  {/* Select box */}
                  <div
                    onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                    className="flex min-h-[42px] cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                  >
                    {fwTargetSensors.length === 0 ? (
                      <span className="text-gray-400 dark:text-gray-500">All sensors of this type</span>
                    ) : (
                      <>
                        {fwTargetSensors.map((id) => {
                          const s = sensors.find((s) => s.id === id)
                          return (
                            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              {s?.name || `#${id}`}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleTargetSensor(id) }}
                                className="ml-0.5 hover:text-blue-600 dark:hover:text-blue-100"
                              >
                                &times;
                              </button>
                            </span>
                          )
                        })}
                      </>
                    )}
                    <div className="ml-auto flex items-center gap-1.5 pl-2">
                      {fwTargetSensors.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFwTargetSensors([]) }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          title="Clear all"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                        </button>
                      )}
                      <svg className={`h-4 w-4 text-gray-400 transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
                  {/* Dropdown */}
                  {targetDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                      <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                        <input
                          type="text"
                          placeholder="Search sensors..."
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {sensors
                          .filter((s) => {
                            const matchType = fwSensorType === 'receiver' ? 'lora' : 'wifi'
                            if (s.type !== matchType) return false
                            if (!targetSearch) return true
                            const q = targetSearch.toLowerCase()
                            return (s.name || '').toLowerCase().includes(q) || String(s.id).includes(q)
                          })
                          .map((s) => {
                            const selected = fwTargetSensors.includes(s.id)
                            return (
                              <button
                                key={s.id}
                                onClick={(e) => { e.stopPropagation(); toggleTargetSensor(s.id) }}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              >
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                  {selected && <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                                </span>
                                <span className="flex-1 text-gray-900 dark:text-white">{s.name || `Sensor #${s.id}`}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">#{s.id}</span>
                              </button>
                            )
                          })}
                        {sensors.filter((s) => {
                          const matchType = fwSensorType === 'receiver' ? 'lora' : 'wifi'
                          if (s.type !== matchType) return false
                          if (!targetSearch) return true
                          const q = targetSearch.toLowerCase()
                          return (s.name || '').toLowerCase().includes(q) || String(s.id).includes(q)
                        }).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching sensors.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {fwTargetSensors.length === 0 ? 'All sensors of this type will receive the update.' : `${fwTargetSensors.length} sensor${fwTargetSensors.length === 1 ? '' : 's'} selected.`}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <input
                  type="text"
                  placeholder="What changed in this version..."
                  value={fwNotes}
                  onChange={(e) => setFwNotes(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Compiled Binary (.bin)</label>
                <input
                  type="file"
                  accept=".bin"
                  onChange={(e) => setFwFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Export from Arduino IDE: Sketch &gt; Export Compiled Binary
                </p>
              </div>
              <button
                onClick={handleFirmwareUpload}
                disabled={fwUploading || !fwFile || !fwVersion}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {fwUploading ? 'Uploading...' : 'Upload Firmware'}
              </button>
              {fwUploadError && (
                <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{fwUploadError}</p>
              )}
              {fwUploadResult && (
                <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">{fwUploadResult}</p>
              )}
            </div>
          </div>

          {/* History */}
          {(['receiver', 'dual'] as const).map((type) => (
            <div key={type} className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{type === 'receiver' ? 'LoRa (Receiver)' : 'WiFi (Dual)'} Firmware History</h2>
              {fwHistory[type].length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No firmware uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {fwHistory[type].map((fw) => {
                    const targets = fw.targets || []
                    const hasTargets = targets.length > 0
                    const updatedCount = targets.filter((t) => t.is_updated).length
                    const totalTargets = targets.length
                    const allUpdated = hasTargets && updatedCount === totalTargets
                    const progressPct = hasTargets ? Math.round((updatedCount / totalTargets) * 100) : null

                    return (
                      <div key={fw.id} className="rounded-md border border-gray-200 dark:border-gray-700">
                        {/* Header row */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">v{fw.version}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{(fw.file_size / 1024).toFixed(0)} KB</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(fw.uploaded_at).toLocaleDateString()}</span>
                            {fw.notes && <span className="text-xs text-gray-500 dark:text-gray-400">— {fw.notes}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {hasTargets && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${allUpdated ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                {updatedCount}/{totalTargets} updated
                              </span>
                            )}
                            {!hasTargets && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">All sensors</span>
                            )}
                            <button
                              onClick={() => handleFirmwareDelete(fw.id)}
                              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {/* Progress bar */}
                        {hasTargets && !allUpdated && (
                          <div className="px-4 pb-2">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Per-sensor breakdown */}
                        {hasTargets && (
                          <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700/50">
                            <div className="flex flex-wrap gap-1.5">
                              {targets.map((t) => {
                                const s = sensors.find((s) => s.id === t.sensor_id)
                                return (
                                  <span
                                    key={t.sensor_id}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${t.is_updated ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                                  >
                                    {t.is_updated ? (
                                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                                    ) : (
                                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    )}
                                    {s?.name || `#${t.sensor_id}`}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bluetooth WiFi Config */}
      {activeTab === 'bluetooth' && (
        <div className="mx-auto max-w-lg space-y-6">
          {!('bluetooth' in navigator) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-700 dark:bg-amber-900/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Web Bluetooth is not supported in this browser. Please use Chrome or Edge.
              </p>
            </div>
          ) : (
            <>
              {/* Connection */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Connect to Sensor</h2>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Make sure you are near the sensor and Bluetooth is enabled on this device.
                </p>
                {!bleConnected ? (
                  <button
                    onClick={handleBleScan}
                    disabled={bleConnecting}
                    className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    {bleConnecting ? 'Scanning...' : 'Scan for Sensors'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-700 dark:bg-green-900/30">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Connected: {bleDevice?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Current SSID: {bleCurrentSSID || '—'} | Status: {bleWifiStatus || '—'}
                        </p>
                      </div>
                      <button
                        onClick={handleBleDisconnect}
                        className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
                {bleError && (
                  <p className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{bleError}</p>
                )}
              </div>

              {/* WiFi Config (only when connected) */}
              {bleConnected && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Configure WiFi</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">WiFi Network (SSID)</label>
                      <input
                        type="text"
                        value={bleNewSSID}
                        onChange={(e) => setBleNewSSID(e.target.value)}
                        placeholder="Enter network name"
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">WiFi Password</label>
                      <input
                        type="password"
                        value={bleNewPass}
                        onChange={(e) => setBleNewPass(e.target.value)}
                        placeholder="Enter password"
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={handleBleSendWiFi}
                      disabled={bleSending || !bleNewSSID}
                      className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                      {bleSending ? 'Connecting sensor to WiFi...' : 'Update WiFi Credentials'}
                    </button>
                    {bleWifiStatus && bleWifiStatus !== 'initializing' && (
                      <div className={`rounded-md px-4 py-3 text-sm ${
                        bleWifiStatus.startsWith('connected:')
                          ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : bleWifiStatus.startsWith('error:')
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        Sensor WiFi: {bleWifiStatus}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
