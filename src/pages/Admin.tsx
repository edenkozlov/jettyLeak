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
import { supabase } from '@/lib/supabase'
// Retired: predicted signals + training labels
// import { GET_PREDICTED_SIGNALS } from '@/queries/getPredictedSignals'
// import { GET_LABELS } from '@/queries/getLabels'
import { GET_SENSORS } from '@/queries/getSensors'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
// Retired: signal mutations for training
// import { INSERT_SIGNAL, DELETE_SIGNAL, UPDATE_PREDICTED_SIGNAL } from '@/mutations/signalMutations'
import { computeFlowFromPeaks, type FlowPoint } from '@/utils/flowComputation'
import type { MagReport } from '@/types/magReport'
import useRawSubWindows, { getSubWindowConfig } from '@/hooks/useRawSubWindows'
import RawDataPanel from '@/components/RawDataPanel'
// MagDataSection available if needed later
// import { MagDataSection } from '@/components/BuildingAnalytics'
import type { TimeRange } from '@/hooks/useReportsPage'

const EXPRESS_URL = import.meta.env.VITE_EXPRESS_ENDPOINT || 'http://localhost:3000'
const ADMIN_TIME_RANGES: TimeRange[] = ['1m', '5m', '15m', '1h', '6h', '12h', '24h']

type Tab = 'sensors' | 'firmware' | 'bluetooth' | 'invites'

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
  { key: 'sensors', label: 'Sensors' },
  { key: 'firmware', label: 'Firmware' },
  { key: 'bluetooth', label: 'Bluetooth' },
  { key: 'invites', label: 'Invite Codes' },
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

// @ts-expect-error — kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _SegmentPanel({
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
  const fetchMagRef = useRef(fetchMag)
  fetchMagRef.current = fetchMag

  const [relabelValue, setRelabelValue] = useState(detail.prediction || detail.label || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchMagRef.current({
      sensorIds: [detail.sensorId],
      since: detail.startTime,
      until: detail.endTime,
    })
  }, [detail.sensorId, detail.startTime, detail.endTime])

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative my-auto max-h-[min(90vh,100dvh)] w-full max-w-4xl overflow-y-auto rounded-xl border border-indigo-200 bg-white p-4 shadow-2xl sm:p-5 dark:border-indigo-800 dark:bg-gray-800"
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
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
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

// @ts-expect-error — kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _LabelCreator({
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
  const fetchMagRef = useRef(fetchMag)
  fetchMagRef.current = fetchMag

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
    fetchMagRef.current({
      sensorIds: [parseInt(sensorId)],
      since: since.toISOString(),
      until: now.toISOString(),
    })
    setSelectedRange(null)
    setSaved(false)
  }, [sensorId, timeRangeMs])

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
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add New Label</h2>

      {/* Controls row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 sm:max-w-[min(100%,20rem)]">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sensor</label>
          <select
            value={sensorId}
            onChange={(e) => { setSensorId(e.target.value); setSelectedRange(null); setSaved(false) }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select sensor</option>
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>{s.name || s.id}</option>
            ))}
          </select>
        </div>
        <div className="min-w-0 sm:w-40">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Fixture Type</label>
          <select
            value={fixtureType}
            onChange={(e) => setFixtureType(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select type</option>
            {FIXTURE_TYPES.map((ft) => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Time Range</label>
          <div className="flex max-w-full overflow-x-auto rounded-md border border-gray-300 [-webkit-overflow-scrolling:touch] dark:border-gray-600">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.ms}
                type="button"
                onClick={() => setTimeRangeMs(tr.ms)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
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
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-3 dark:border-indigo-800 dark:bg-indigo-900/20 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
          <div className="min-w-0 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-medium">Selected:</span>{' '}
            {formatTime(selectedRange.start)} — {formatTime(selectedRange.end)}{' '}
            <span className="text-gray-400">({((selectedRange.end - selectedRange.start) / 1000).toFixed(1)}s)</span>
          </div>
          {fixtureType && (
            <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">{fixtureType}</span>
          )}
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
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

// ─────────────────────────────────────────────────────────────────────────────
// Sensor card with computed flow stats from raw mag sub-windows
// ─────────────────────────────────────────────────────────────────────────────

function AdminSensorCard({
  sensor,
  subWindows,
  loading,
}: {
  sensor: Sensor
  subWindows: { points: { timestamp: number; x: number | null; total: number | null; bandEnergy10s: number | null; bandEnergy60s: number | null }[] }[]
  loading: boolean
}) {
  const { mode } = useTheme()

  // Throttled flow computation — the mag sub-windows update every 5s via poll,
  // but recomputing flow on every poll causes the chart to jump because
  // downsampled points shift slightly each fetch. We recompute at most every
  // 10s and hold the previous result between recomputations.
  const FLOW_RECOMPUTE_MS = 10_000
  const lastFlowComputeRef = useRef(0)
  const stableFlowRef = useRef<{ stats: { currentLph: number; totalLitres: number; peakLph: number; avgLph: number } | null; chart: FlowPoint[] }>({ stats: null, chart: [] })

  const now = Date.now()
  const shouldRecompute = now - lastFlowComputeRef.current >= FLOW_RECOMPUTE_MS

  if (shouldRecompute && sensor.multiplier && sensor.multiplier > 0 && subWindows.length > 0) {
    lastFlowComputeRef.current = now

    const allPoints = subWindows
      .flatMap((w) => w.points)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (allPoints.length >= 5) {
      const magData = allPoints.map((p) => ({
        timestamp: p.timestamp,
        x: p.x,
        total: p.total,
        bandEnergy10s: p.bandEnergy10s,
        bandEnergy60s: p.bandEnergy60s,
      }))

      const flowPoints = computeFlowFromPeaks(magData, sensor.multiplier)
      if (flowPoints.length > 0) {
        const lastRate = flowPoints[flowPoints.length - 1]!.flowRateLph
        const totalLitres = flowPoints[flowPoints.length - 1]!.accumulatedL
        const peakLph = Math.max(...flowPoints.map((p) => p.flowRateLph))
        const avgLph = flowPoints.reduce((s, p) => s + p.flowRateLph, 0) / flowPoints.length

        stableFlowRef.current = {
          stats: {
            currentLph: Math.round(lastRate * 10) / 10,
            totalLitres: Math.round(totalLitres * 100) / 100,
            peakLph: Math.round(peakLph * 10) / 10,
            avgLph: Math.round(avgLph * 10) / 10,
          },
          chart: flowPoints,
        }
      }
      // If flowPoints is empty but we had data before, hold the previous — wave still building
    }
  }

  const rawStats = stableFlowRef.current.stats

  // Further stabilize the displayed stats — hold last non-zero values for 15s
  // so transient zero gaps from wave pattern settling don't cause flickering.
  const HOLD_MS = 15_000
  const stableStatsRef = useRef<{ currentLph: number; totalLitres: number; peakLph: number; avgLph: number } | null>(null)
  const lastNonZeroAtRef = useRef(Date.now())

  if (rawStats != null && (rawStats.currentLph > 0 || rawStats.totalLitres > 0)) {
    stableStatsRef.current = rawStats
    lastNonZeroAtRef.current = Date.now()
  } else if (stableStatsRef.current != null && Date.now() - lastNonZeroAtRef.current > HOLD_MS) {
    stableStatsRef.current = rawStats
  }

  const flowStats = stableStatsRef.current
  const flowChartData = stableFlowRef.current.chart

  const displayCurrent = flowStats?.currentLph ?? 0
  const isFlowing = displayCurrent > 0

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          isFlowing ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
        }`}>
          <svg className={`h-5 w-5 ${isFlowing ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {sensor.name || `Sensor #${sensor.id}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ID: {sensor.id}
            {sensor.multiplier != null && ` · Multiplier: ${sensor.multiplier}`}
            {sensor.building && typeof sensor.building === 'object' && 'name' in sensor.building
              ? ` · ${(sensor.building as any).name}`
              : ''}
          </p>
        </div>
        {isFlowing && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Flowing
          </span>
        )}
      </div>

      {/* Flow stats grid */}
      {flowStats != null ? (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Current flow</p>
            <p className={`text-lg font-bold tabular-nums ${isFlowing ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {displayCurrent} <span className="text-xs font-normal text-gray-400">L/h</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total usage</p>
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {flowStats.totalLitres} <span className="text-xs font-normal text-gray-400">L</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Peak flow</p>
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {flowStats.peakLph} <span className="text-xs font-normal text-gray-400">L/h</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Avg flow</p>
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {flowStats.avgLph} <span className="text-xs font-normal text-gray-400">L/h</span>
            </p>
          </div>
        </div>
      ) : loading ? (
        <p className="text-xs text-gray-400">Computing flow…</p>
      ) : sensor.multiplier == null || sensor.multiplier <= 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          No multiplier set — calibrate this sensor to see flow data.
        </p>
      ) : (
        <p className="text-xs text-gray-400">No flow data in this window.</p>
      )}

      {/* Flow rate + usage charts — always rendered to avoid layout spasm */}
      <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Flow rate
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={flowChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={mode === 'dark' ? '#374151' : '#e5e7eb'}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts: number) => {
                  const d = new Date(ts)
                  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                }}
                tick={{ fontSize: 10, fill: mode === 'dark' ? '#9ca3af' : '#6b7280' }}
                stroke={mode === 'dark' ? '#374151' : '#e5e7eb'}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#3b82f6' }}
                stroke={mode === 'dark' ? '#374151' : '#e5e7eb'}
                tickFormatter={(v: number) => v.toFixed(0)}
                width={40}
              />
              <Tooltip
                labelFormatter={(ts) =>
                  new Date(Number(ts)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                }
                formatter={(v) => [`${Number(v).toFixed(1)} L/h`, 'Flow']}
                contentStyle={{
                  backgroundColor: mode === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: mode === 'dark' ? '#f3f4f6' : '#111827',
                }}
              />
              <Line
                type="stepAfter"
                dataKey="flowRateLph"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Accumulated usage chart */}
          <p className="mb-1 mt-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Accumulated usage
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={flowChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={mode === 'dark' ? '#374151' : '#e5e7eb'}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts: number) => {
                  const d = new Date(ts)
                  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                }}
                tick={{ fontSize: 10, fill: mode === 'dark' ? '#9ca3af' : '#6b7280' }}
                stroke={mode === 'dark' ? '#374151' : '#e5e7eb'}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#10b981' }}
                stroke={mode === 'dark' ? '#374151' : '#e5e7eb'}
                tickFormatter={(v: number) => `${v.toFixed(1)}L`}
                width={45}
              />
              <Tooltip
                labelFormatter={(ts) =>
                  new Date(Number(ts)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                }
                formatter={(v) => [`${Number(v).toFixed(2)} L`, 'Total']}
                contentStyle={{
                  backgroundColor: mode === 'dark' ? '#1f2937' : '#fff',
                  border: `1px solid ${mode === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: mode === 'dark' ? '#f3f4f6' : '#111827',
                }}
              />
              <Line
                type="monotone"
                dataKey="accumulatedL"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('sensors')
  // Data hooks
  const { data: sensorsData, executeQuery: fetchSensors } =
    useGraphQL<{ sensor: Sensor[] }>(GET_SENSORS)
  const fetchSensorsRef = useRef(fetchSensors)
  fetchSensorsRef.current = fetchSensors

  // Sensors tab state
  const allSensors = (sensorsData?.sensor ?? []) as Sensor[]
  const [adminSelectedSensorId, setAdminSelectedSensorId] = useState<number | null>(null)
  const [sensorSearch, setSensorSearch] = useState('')
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false)

  // Sort by ID ascending, default to lowest ID sensor
  const sortedSensors = useMemo(() => [...allSensors].sort((a, b) => a.id - b.id), [allSensors])
  const filteredSensors = useMemo(() => {
    if (!sensorSearch) return sortedSensors
    const q = sensorSearch.toLowerCase()
    return sortedSensors.filter((s) =>
      (s.name ?? '').toLowerCase().includes(q) ||
      String(s.id).includes(q) ||
      (s.building && typeof s.building === 'object' && 'name' in s.building
        ? ((s.building as any).name ?? '').toLowerCase().includes(q)
        : false)
    )
  }, [sortedSensors, sensorSearch])

  const adminSensor = adminSelectedSensorId != null
    ? sortedSensors.find((s) => s.id === adminSelectedSensorId) ?? sortedSensors[0] ?? null
    : sortedSensors[0] ?? null
  const adminSensorIds = adminSensor ? [adminSensor.id] : []
  const [adminTimeRange, setAdminTimeRange] = useState<TimeRange>('5m')
  const [adminPaused, setAdminPaused] = useState(false)

  const adminSubConfig = activeTab === 'sensors' ? getSubWindowConfig(adminTimeRange) : null
  const { subWindows: adminSubWindows, sharedYDomains: adminYDomains, loading: adminSubLoading } =
    useRawSubWindows({
      sensorId: adminSensor?.id ?? null,
      magSensorIds: adminSensorIds,
      timeRange: adminTimeRange,
      periodOffset: 0,
      enabled: activeTab === 'sensors' && adminSensorIds.length > 0,
      refetchKey: adminPaused ? -1 : 0,
    })
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

  // Invite codes state
  interface InviteCode {
    id: string
    code: string
    client_id: string
    created_at: string
    used_by: string | null
    used_at: string | null
    expires_at: string | null
    client_first_name?: string | null
    client_last_name?: string | null
  }
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [inviteClients, setInviteClients] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>([])
  const [inviteSelectedClient, setInviteSelectedClient] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteCopied, setInviteCopied] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')

  const fetchInviteCodes = useCallback(async () => {
    setInviteLoading(true)
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const clientIds = [...new Set((data ?? []).map((c: any) => c.client_id))]
      let clientMap: Record<string, { first_name: string | null; last_name: string | null }> = {}
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('client')
          .select('id, first_name, last_name')
          .in('id', clientIds)
        if (clients) {
          for (const c of clients) clientMap[c.id] = { first_name: c.first_name, last_name: c.last_name }
        }
      }

      setInviteCodes((data ?? []).map((c: any) => ({
        ...c,
        client_first_name: clientMap[c.client_id]?.first_name ?? null,
        client_last_name: clientMap[c.client_id]?.last_name ?? null,
      })))
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to load invite codes')
    } finally {
      setInviteLoading(false)
    }
  }, [])

  const fetchInviteClients = useCallback(async () => {
    const { data } = await supabase
      .from('client')
      .select('id, first_name, last_name, email')
      .order('created_at', { ascending: false })
    setInviteClients(data ?? [])
  }, [])

  function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)]
    return result
  }

  const handleGenerateInvite = useCallback(async () => {
    if (!inviteSelectedClient) return
    setInviteGenerating(true)
    setInviteError('')
    try {
      const code = generateCode()
      const { error } = await supabase
        .from('invite_codes')
        .insert({ code, client_id: inviteSelectedClient })
      if (error) throw error
      await fetchInviteCodes()
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to generate invite code')
    } finally {
      setInviteGenerating(false)
    }
  }, [inviteSelectedClient, fetchInviteCodes])

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
    setInviteCopied(code)
    setTimeout(() => setInviteCopied(null), 2000)
  }, [])

  const sensors = sensorsData?.sensor ?? []

  useEffect(() => { fetchSensorsRef.current() }, [])

  useEffect(() => {
    if (activeTab === 'invites') {
      fetchInviteCodes()
      fetchInviteClients()
    }
  }, [activeTab, fetchInviteCodes, fetchInviteClients])

  // Poll sensors + firmware history every 30s on firmware tab for live status
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (activeTab !== 'firmware') return
    fetchSensorsRef.current()
    fetchFirmwareHistory()
    const pollInterval = setInterval(() => { fetchSensorsRef.current(); fetchFirmwareHistory() }, 30000)
    const tickInterval = setInterval(() => setNow(Date.now()), 10000)
    return () => { clearInterval(pollInterval); clearInterval(tickInterval) }
  }, [activeTab])

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

  // Removed: openPredictionDetail, openLabelDetail (retired tabs)

  return (
    <div className="mx-auto min-w-0 max-w-6xl">
      <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white sm:mb-6 sm:text-2xl">Admin</h1>

      {/* Tabs — horizontal scroll on narrow screens */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-1 [-webkit-overflow-scrolling:touch] sm:mb-6 dark:border-gray-700 dark:bg-gray-800">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────── SENSORS TAB ──────── */}
      {activeTab === 'sensors' && (
        <div>
          {/* Sensor picker + controls */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {/* Searchable sensor select */}
            <div className="relative">
              <input
                type="text"
                value={sensorSearch}
                onChange={(e) => setSensorSearch(e.target.value)}
                onFocus={() => setSensorDropdownOpen(true)}
                placeholder={adminSensor ? (adminSensor.name || `Sensor #${adminSensor.id}`) : 'Select sensor…'}
                className="w-56 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              {sensorDropdownOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {filteredSensors.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setAdminSelectedSensorId(s.id)
                        setSensorSearch('')
                        setSensorDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        adminSensor?.id === s.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="font-medium">{s.name || `Sensor #${s.id}`}</span>
                      {s.building && typeof s.building === 'object' && 'name' in s.building && (
                        <span className="ml-2 text-xs text-gray-400">
                          {(s.building as any).name}
                        </span>
                      )}
                      <span className="ml-2 text-xs text-gray-400">#{s.id}</span>
                    </button>
                  ))}
                  {filteredSensors.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">No matching sensors</p>
                  )}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

            <div className="flex gap-1">
              {ADMIN_TIME_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAdminTimeRange(r)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    adminTimeRange === r
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

            <button
              type="button"
              onClick={() => setAdminPaused((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                adminPaused
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                {adminPaused ? <path d="M8 5v14l11-7z" /> : <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />}
              </svg>
              {adminPaused ? 'Resume' : 'Pause'}
            </button>

            {adminSubConfig && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {adminSubConfig.count} × {adminSubConfig.durationMs / 60_000}min
                {adminPaused ? ' · paused' : ''}
              </span>
            )}
          </div>

          {/* Sensor info + live flow stats */}
          {adminSensor && (
            <AdminSensorCard
              sensor={adminSensor}
              subWindows={adminSubWindows}
              loading={adminSubLoading}
            />
          )}

          {/* Sub-window tiles */}
          {adminSubLoading && (
            <p className="py-6 text-center text-xs text-gray-400">Loading tiles…</p>
          )}

          {!adminSubLoading && adminSubWindows.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400 dark:border-gray-700">
              {adminSensorIds.length === 0
                ? 'No sensors found. Add a sensor first.'
                : 'No mag data in this time window.'}
            </p>
          )}

          {adminSubWindows.length > 0 && (
            <div className="flex flex-col gap-3">
              {adminSubWindows.map((w) => (
                <RawDataPanel
                  key={w.index}
                  window={w}
                  sharedYDomains={adminYDomains}
                  label={`Q${w.index + 1}`}
                  magSensorIds={adminSensorIds}
                  buildingId={null}
                />
              ))}
            </div>
          )}
        </div>
      )}


      {/* Firmware OTA */}
      {activeTab === 'firmware' && (
        <div className="mx-auto min-w-0 max-w-3xl space-y-6">
          {/* Sensor Status & Controls */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
                    <div key={s.id} className={`rounded-md border px-3 py-3 sm:px-4 ${alive ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10'}`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${alive ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                          <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">{s.name || `Sensor #${s.id}`}</span>
                          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">#{s.id}</span>
                          {s.type && (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${s.type === 'wifi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                              {s.type === 'wifi' ? 'WiFi' : 'LoRa'}
                            </span>
                          )}
                          {s.firmware_version && (
                            <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">v{s.firmware_version}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleReboot(s.id)}
                          disabled={rebootingSensorId === s.id}
                          className="w-full shrink-0 rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 sm:w-auto dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                        >
                          {rebootingSensorId === s.id ? 'Reboot queued...' : 'Reboot'}
                        </button>
                      </div>
                      {/* Status row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-0 sm:pl-[18px]">
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
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Upload Firmware</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div key={type} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
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
                        <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">v{fw.version}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{(fw.file_size / 1024).toFixed(0)} KB</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(fw.uploaded_at).toLocaleDateString()}</span>
                            {fw.notes && <span className="min-w-0 truncate text-xs text-gray-500 dark:text-gray-400 sm:max-w-[12rem]">— {fw.notes}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
        <div className="mx-auto min-w-0 max-w-lg space-y-6">
          {!('bluetooth' in navigator) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-700 dark:bg-amber-900/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Web Bluetooth is not supported in this browser. Please use Chrome or Edge.
              </p>
            </div>
          ) : (
            <>
              {/* Connection */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
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
                    <div className="flex flex-col gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-3 dark:border-green-700 dark:bg-green-900/30 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Connected: {bleDevice?.name || 'Unknown'}
                        </p>
                        <p className="break-words text-xs text-green-700 dark:text-green-400">
                          Current SSID: {bleCurrentSSID || '—'} | Status: {bleWifiStatus || '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleBleDisconnect}
                        className="w-full shrink-0 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 sm:w-auto dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
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
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
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

      {/* Invite Codes */}
      {activeTab === 'invites' && (
        <div className="mx-auto min-w-0 max-w-3xl space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Generate Invite Code</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                <select
                  value={inviteSelectedClient}
                  onChange={(e) => setInviteSelectedClient(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a client</option>
                  {inviteClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={inviteGenerating || !inviteSelectedClient}
                className="w-full rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {inviteGenerating ? 'Generating…' : 'Generate Code'}
              </button>
            </div>
            {inviteError && (
              <p className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{inviteError}</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Existing Codes</h2>
            {inviteLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
            {!inviteLoading && inviteCodes.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No invite codes yet.</p>
            )}
            {!inviteLoading && inviteCodes.length > 0 && (
              <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 [-webkit-overflow-scrolling:touch] dark:border-gray-700">
                <table className="min-w-[560px] divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['Code', 'Client', 'Status', 'Created', ''].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {inviteCodes.map((ic) => {
                      const isUsed = !!ic.used_by
                      const isExpired = ic.expires_at && new Date(ic.expires_at) < new Date()
                      return (
                        <tr key={ic.id}>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{ic.code}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {[ic.client_first_name, ic.client_last_name].filter(Boolean).join(' ') || ic.client_id.slice(0, 8)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {isUsed ? (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">Used</span>
                            ) : isExpired ? (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">Expired</span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">Active</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(ic.created_at).toLocaleDateString()}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                            {!isUsed && (
                              <button
                                onClick={() => handleCopyCode(ic.code)}
                                className="rounded-md px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                              >
                                {inviteCopied === ic.code ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
