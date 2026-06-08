/**
 * MockSensorDashboard — self-contained, realistic fake water-flow sensor data + charts.
 *
 * Drop this single file into any React + Vite/Next project. Only deps: react + recharts.
 *   npm i recharts
 *
 * It mimics the real Beluga/flomo pipeline:
 *   raw magnetometer waveform (x/y/z/total + band energy + dominant freq)
 *     -> peak detection -> flow rate (L/h) + accumulated volume (L)
 *
 * Everything (data shapes, flow math, chart styling/colors) matches the production app
 * so screenshots/demos look identical to the real Admin "Sensors" view.
 *
 * Usage:
 *   import MockSensorDashboard from './MockSensorDashboard'
 *   <MockSensorDashboard />
 */

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ===========================================================================
// Types — identical shape to the real DB rows (mag_report) + computed flow.
// ===========================================================================

export interface MagReport {
  id: number
  created_at: string
  x_axis_reading: number | null
  y_axis_reading: number | null
  z_axis_reading: number | null
  total_magnitude: number | null
  sensor_id: number | null
  band_energy_10s: number | null
  band_energy_60s: number | null
  band_energy_5m: number | null
  dominant_freq_hz: number | null
  vibration_rpm: number | null
}

export interface FlowPoint {
  timestamp: number
  /** Flow rate in litres per hour. */
  flowRateLph: number
  /** Cumulative volume in litres since the start of the dataset. */
  accumulatedL: number
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

// ===========================================================================
// Mock data generator
// ===========================================================================

interface GenOptions {
  /** How many minutes of data to synthesize. */
  durationMin?: number
  /** Sample spacing in ms (real device is dense; 100ms keeps peaks visible). */
  sampleMs?: number
  /** Sensor calibration: cycles per litre. 1/multiplier = litres per cycle. */
  multiplier?: number
  /** Deterministic seed for repeatable demos. */
  seed?: number
  sensorId?: number
}

/** Tiny seeded PRNG (mulberry32) so demos are repeatable. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface FlowSession {
  startFrac: number // 0..1 across the window
  durFrac: number
  freqHz: number // oscillation frequency while flowing
  amp: number // waveform amplitude
}

/**
 * Generates realistic raw mag_report rows: quiet baseline noise punctuated by
 * a few "flow sessions" where the total magnitude oscillates at a fixed
 * frequency (a faucet/toilet running). Band energy + dominant freq + vibration
 * rpm all rise during sessions, exactly like field data.
 */
export function generateMockMagReports(opts: GenOptions = {}): MagReport[] {
  const {
    durationMin = 5,
    sampleMs = 100,
    seed = 42,
    sensorId = 1,
  } = opts

  const rand = rng(seed)
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2 // ~N(0,~0.3)

  const now = Date.now()
  const start = now - durationMin * 60_000
  const n = Math.floor((durationMin * 60_000) / sampleMs)

  // DC offsets for each axis (sensor mounting bias) — like real hardware.
  const xBias = -18 + gauss() * 4
  const yBias = 32 + gauss() * 4
  const zBias = -57 + gauss() * 4

  // A few flow sessions scattered across the window.
  const sessionCount = 2 + Math.floor(rand() * 3)
  const sessions: FlowSession[] = []
  for (let i = 0; i < sessionCount; i++) {
    sessions.push({
      startFrac: 0.08 + rand() * 0.8,
      durFrac: 0.04 + rand() * 0.12,
      freqHz: 1.5 + rand() * 3.5, // 1.5–5 Hz
      amp: 6 + rand() * 14,
    })
  }
  sessions.sort((a, b) => a.startFrac - b.startFrac)

  const rows: MagReport[] = []
  // rolling band-energy state (smoothed activity)
  let be10 = 0
  let be60 = 0
  let be5m = 0

  for (let i = 0; i < n; i++) {
    const ts = start + i * sampleMs
    const frac = i / n

    // Is this sample inside a flow session?
    let active: FlowSession | null = null
    for (const s of sessions) {
      if (frac >= s.startFrac && frac < s.startFrac + s.durFrac) {
        active = s
        break
      }
    }

    let osc = 0
    let instantEnergy = 0
    let domFreq = 0
    if (active) {
      const tSec = (ts - start) / 1000
      // primary cycle + a softer harmonic for a more organic waveform
      osc =
        active.amp * Math.sin(2 * Math.PI * active.freqHz * tSec) +
        active.amp * 0.25 * Math.sin(2 * Math.PI * active.freqHz * 2 * tSec)
      instantEnergy = active.amp * (3 + rand() * 2)
      domFreq = active.freqHz + gauss() * 0.15
    }

    // Smooth band energies toward instant energy (10s fast, 60s/5m slow).
    be10 += (instantEnergy - be10) * 0.12
    be60 += (instantEnergy - be60) * 0.02
    be5m += (instantEnergy - be5m) * 0.004

    const noise = gauss() * 1.2
    const x = xBias + osc + noise
    const y = yBias + osc * 0.4 + gauss() * 1.2
    const z = zBias + osc * 0.2 + gauss() * 1.2
    const total = Math.sqrt(x * x + y * y + z * z)

    rows.push({
      id: i + 1,
      created_at: new Date(ts).toISOString(),
      x_axis_reading: round(x, 3),
      y_axis_reading: round(y, 3),
      z_axis_reading: round(z, 3),
      total_magnitude: round(total, 3),
      sensor_id: sensorId,
      band_energy_10s: round(Math.max(0, be10), 3),
      band_energy_60s: round(Math.max(0, be60), 3),
      band_energy_5m: round(Math.max(0, be5m), 3),
      dominant_freq_hz: active ? round(Math.max(0, domFreq), 3) : 0,
      vibration_rpm: active ? round(Math.max(0, domFreq) * 60, 1) : 0,
    })
  }

  return rows
}

function round(v: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(v * f) / f
}

// ===========================================================================
// Flow computation (faithful, self-contained port of the production logic)
//   raw waveform peaks -> L/h between peaks -> accumulated litres
// ===========================================================================

const MIN_VARIANCE = 20 // window must wobble this much to count as "flow"
const PEAK_DEDUP_MS = 500
const MIN_VIBRATION = 5 // band energy floor below which peaks are noise

/** Detect local-maxima peaks in the total-magnitude series (variance-gated). */
function detectFlowPeaks(
  data: { timestamp: number; value: number; energy: number }[],
): number[] {
  if (data.length < 5) return []

  const span = data[data.length - 1]!.timestamp - data[0]!.timestamp
  const avgSpacing = span / (data.length - 1)
  const windowMs = Math.max(avgSpacing * 10, 10_000)
  const hopMs = windowMs / 2

  const peakSet = new Set<number>()
  const startTs = data[0]!.timestamp
  const endTs = data[data.length - 1]!.timestamp

  let lo = 0
  for (let winStart = startTs; winStart < endTs; winStart += hopMs) {
    const winEnd = winStart + windowMs
    while (lo < data.length && data[lo]!.timestamp < winStart) lo++
    let hi = lo
    while (hi < data.length && data[hi]!.timestamp <= winEnd) hi++
    const win = data.slice(lo, hi)
    if (win.length < 5) continue

    // variance gate
    let sum = 0
    for (const p of win) sum += p.value
    const mean = sum / win.length
    let variance = 0
    for (const p of win) variance += (p.value - mean) ** 2
    variance /= win.length
    if (variance < MIN_VARIANCE) continue

    // local maxima above the window mean
    for (let i = 1; i < win.length - 1; i++) {
      const prev = win[i - 1]!.value
      const cur = win[i]!.value
      const next = win[i + 1]!.value
      if (cur > prev && cur >= next && cur > mean && win[i]!.energy >= MIN_VIBRATION) {
        peakSet.add(win[i]!.timestamp)
      }
    }
  }

  const sorted = [...peakSet].sort((a, b) => a - b)
  const deduped: number[] = []
  for (const ts of sorted) {
    if (deduped.length === 0 || ts - deduped[deduped.length - 1]! > PEAK_DEDUP_MS) {
      deduped.push(ts)
    }
  }
  return deduped
}

/**
 * Convert raw rows into flow points. For each consecutive pair of detected
 * peaks: flowRateLph = litresPerCycle / (intervalMs / 3,600,000).
 */
export function computeFlow(rows: MagReport[], multiplier: number): FlowPoint[] {
  if (multiplier <= 0 || rows.length < 5) return []
  const litresPerCycle = 1 / multiplier

  const series = rows
    .filter((r) => r.total_magnitude != null)
    .map((r) => ({
      timestamp: new Date(r.created_at).getTime(),
      value: r.total_magnitude!,
      energy: r.band_energy_10s ?? 0,
    }))

  const peaks = detectFlowPeaks(series)
  if (peaks.length < 2) return []

  const points: FlowPoint[] = []
  let cumulativeCycles = 0
  for (let i = 1; i < peaks.length; i++) {
    const intervalMs = peaks[i]! - peaks[i - 1]!
    if (intervalMs <= 0) continue
    cumulativeCycles++
    const flowRateLph = litresPerCycle / (intervalMs / 3_600_000)
    if (!Number.isFinite(flowRateLph)) continue
    points.push({
      timestamp: peaks[i]!,
      flowRateLph: round(flowRateLph, 2),
      accumulatedL: round(cumulativeCycles * litresPerCycle, 4),
    })
  }
  return points
}

// ===========================================================================
// Chart styling — matches the production Admin theme.
// ===========================================================================

const CHART_COLORS = {
  light: { grid: '#e5e7eb', axis: '#6b7280', tooltipBg: '#fff', tooltipBorder: '#e5e7eb', tooltipText: '#111827' },
  dark: { grid: '#374151', axis: '#9ca3af', tooltipBg: '#1f2937', tooltipBorder: '#374151', tooltipText: '#f3f4f6' },
} as const

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// ===========================================================================
// Component
// ===========================================================================

const MULTIPLIER = 11.5 // cycles per litre (typical calibration)

export default function MockSensorDashboard() {
  const [dark, setDark] = useState(true)
  const [seed, setSeed] = useState(42)

  const rows = useMemo(
    () => generateMockMagReports({ durationMin: 5, sampleMs: 100, multiplier: MULTIPLIER, seed }),
    [seed],
  )

  const chartData: ChartPoint[] = useMemo(
    () =>
      rows.map((r) => ({
        timestamp: new Date(r.created_at).getTime(),
        x: r.x_axis_reading,
        y: r.y_axis_reading,
        z: r.z_axis_reading,
        total: r.total_magnitude,
        bandEnergy10s: r.band_energy_10s,
        bandEnergy60s: r.band_energy_60s,
        dominantFreqHz: r.dominant_freq_hz,
        vibrationRpm: r.vibration_rpm,
      })),
    [rows],
  )

  const flowData = useMemo(() => computeFlow(rows, MULTIPLIER), [rows])

  const colors = dark ? CHART_COLORS.dark : CHART_COLORS.light
  const tooltipStyle = {
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: colors.tooltipText,
  }

  const totalVolume = flowData.length ? flowData[flowData.length - 1]!.accumulatedL : 0
  const peakFlow = flowData.reduce((m, p) => Math.max(m, p.flowRateLph), 0)
  const avgFlow = flowData.length
    ? flowData.reduce((s, p) => s + p.flowRateLph, 0) / flowData.length
    : 0

  const axisProps = {
    type: 'number' as const,
    domain: ['dataMin', 'dataMax'] as const,
    tickFormatter: formatTime,
    tick: { fontSize: 10, fill: colors.axis },
    axisLine: { stroke: colors.grid },
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-gray-900 dark:text-white sm:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Sensor #1 — Raw Data</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Live magnetometer waveform &amp; computed flow (mock)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSeed((s) => s + 1)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => setDark((d) => !d)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-600"
              >
                {dark ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Total Volume', value: `${totalVolume.toFixed(3)} L` },
              { label: 'Peak Flow', value: `${peakFlow.toFixed(1)} L/h` },
              { label: 'Avg Flow', value: `${avgFlow.toFixed(1)} L/h` },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {s.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            {/* X / Y / Z */}
            <ChartBlock title="Magnetometer X / Y / Z" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="timestamp" {...axisProps} />
                <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                <Line type="monotone" dataKey="x" stroke="#ef4444" dot={false} strokeWidth={1.5} name="X" />
                <Line type="monotone" dataKey="y" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Y" />
                <Line type="monotone" dataKey="z" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Z" />
              </LineChart>
            </ChartBlock>

            {/* Total Magnitude */}
            <ChartBlock title="Total Magnitude" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="timestamp" {...axisProps} />
                <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" dot={false} strokeWidth={1.5} name="Total" />
              </LineChart>
            </ChartBlock>

            {/* Band Energy */}
            <ChartBlock title="Band Energy" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="timestamp" {...axisProps} />
                <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                <Line type="monotone" dataKey="bandEnergy10s" stroke="#f97316" dot={false} strokeWidth={1.5} name="10s" />
                <Line type="monotone" dataKey="bandEnergy60s" stroke="#06b6d4" dot={false} strokeWidth={1.5} name="60s" />
              </LineChart>
            </ChartBlock>

            {/* Dominant Frequency */}
            <ChartBlock title="Dominant Frequency (Hz)" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="timestamp" {...axisProps} />
                <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={{ stroke: colors.grid }} width={50} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
                <Line type="monotone" dataKey="dominantFreqHz" stroke="#ec4899" dot={false} strokeWidth={1.5} name="Freq Hz" />
              </LineChart>
            </ChartBlock>

            {/* Flow Rate (L/h) + Accumulated (L) */}
            {flowData.length > 0 && (
              <ChartBlock title="Flow Rate (L/h) & Accumulated (L)" height={180}>
                <LineChart data={flowData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="timestamp" {...axisProps} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#3b82f6' }}
                    axisLine={{ stroke: colors.grid }}
                    width={50}
                    label={{ value: 'L/h', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#3b82f6' } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#10b981' }}
                    axisLine={{ stroke: colors.grid }}
                    width={50}
                    label={{ value: 'L', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#10b981' } }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(ts) => formatTime(Number(ts))}
                    formatter={(value: unknown, name: unknown) => [
                      typeof value === 'number' ? value.toFixed(2) : '—',
                      String(name ?? ''),
                    ]}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="flowRateLph" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Flow L/h" />
                  <Line yAxisId="right" type="monotone" dataKey="accumulatedL" stroke="#10b981" dot={false} strokeWidth={1.5} name="Accumulated L" />
                </LineChart>
              </ChartBlock>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartBlock({
  title,
  height,
  children,
}: {
  title: string
  height: number
  children: React.ReactElement
}) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</h4>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
