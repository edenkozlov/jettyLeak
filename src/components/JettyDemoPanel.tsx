import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useTheme } from '@/contexts/ThemeContext'
import {
  createSimulatorState,
  getFreqHz,
  getLitersDelta,
  getPulseStrength,
  getReading,
  readingToMagReport,
  rng,
  stopLeak,
  triggerFlush,
  triggerLeak,
  type SimulatorState,
} from '@/lib/jettySimulator'
import { fetchJettyIncidents, type JettyIncident } from '@/lib/jettyIncidents'
import { invokeNightWatch } from '@/lib/jettyNightWatch'
import {
  JETTY_COLLECTION,
  JETTY_ROUTINE,
  JETTY_TASK,
  sensorStateUrl,
} from '@/lib/jettySensorState'
import { jettyDashboardUrl, jettyTaskUrl, jettyTrajectoryUrl } from '@/lib/jettyUi'
import {
  fetchJettyFlowHistory,
  fetchJettyMagHistory,
  persistJettyDemoBatch,
} from '@/lib/jettyPersist'
import type { MagReport } from '@/types/magReport'

const BUILDING_NAME = '4500 Rue Sherbrooke'
const SENSOR_ID = Number(import.meta.env.VITE_JETTY_SENSOR_ID) || 1
const MULTIPLIER = 11.5
const TICK_MS = 2_000 // UI cadence — seconds, not milliseconds
const SAMPLES_PER_TICK = 4 // sub-samples per tick — enough cycles for ~10s flush waves
const BUCKET_MS = 30_000 // 30s bars across the visible window
const DB_POLL_MS = 12_000
const JETTY_AUTO_FIRST_MS = 3 * 60_000
const JETTY_AUTO_INTERVAL_MS = 30 * 60_000
const SYNC_ID = 'jettyTelemetry'
const CHART_LEFT = 52
const CHART_RIGHT = 12

type HistoryRange = '5m' | '15m' | '1h' | '6h'
const HISTORY_MS: Record<HistoryRange, number> = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
}
/** Visual-only floor so zero-flow buckets still show a sliver (matches production charts). */
const MIN_BAR_LPM = 0.04
const MIN_BAR_LPH = 2
const MIN_BAR_L = 0.08
const NIGHT_START = 23
const NIGHT_END = 6
const ANOMALY_LPH = 9 // 0.15 L/min
const SUSTAINED_MS = 45_000

type WatchStatus = 'daytime' | 'clear' | 'anomaly_building' | 'anomaly_fired' | 'cooldown'
type BarMode = 'rate' | 'usage'
type RateUnit = 'lpm' | 'lph'

interface BarPoint {
  timestamp: number
  lpm: number
  lph: number
  volumeL: number
  partial: boolean
  barVisual: number
}

interface VolumeSample {
  ts: number
  liters: number
  lpm: number
}

interface LogEntry {
  id: number
  ts: number
  text: string
  tone?: 'info' | 'warn' | 'alert' | 'success'
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

function formatClockShort(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function isNightHour(): boolean {
  const h = new Date().getHours()
  return h >= NIGHT_START || h < NIGHT_END
}

function AlignedChartRow({
  title,
  height,
  children,
  showTimeAxis = false,
}: {
  title: string
  height: number
  children: React.ReactElement
  showTimeAxis?: boolean
}) {
  return (
    <div className={showTimeAxis ? '' : 'border-b border-gray-100 dark:border-gray-800'}>
      <h4 className="mb-0.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      <div className="w-full min-w-0" style={{ height, minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function JettyDemoPanel() {
  const { mode: themeMode } = useTheme()
  const colors = CHART_COLORS[themeMode]

  const simRef = useRef<SimulatorState>(createSimulatorState(77))
  const randRef = useRef(rng(77))
  const bandRef = useRef({ be10: 0.25, be60: 0.18, be5m: 0.12 })
  const logIdRef = useRef(0)
  const persistFailLoggedRef = useRef(false)

  const [historyRange, setHistoryRange] = useState<HistoryRange>('15m')
  const historyMs = HISTORY_MS[historyRange]

  const [rows, setRows] = useState<MagReport[]>([])
  const [dbStatus, setDbStatus] = useState<'loading' | 'live' | 'persisting' | 'error'>('loading')
  const [dbRowCount, setDbRowCount] = useState(0)
  const [incidents, setIncidents] = useState<JettyIncident[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [nightWatchBusy, setNightWatchBusy] = useState(false)
  const [nightWatchStatus, setNightWatchStatus] = useState<string | null>(null)
  const [forceNight, setForceNight] = useState(false)
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(() =>
    isNightHour() ? 'clear' : 'daytime',
  )
  const [anomalySince, setAnomalySince] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    {
      id: 0,
      ts: Date.now(),
      text: 'Night watch armed. Baseline: 0.02–0.08 L/min',
      tone: 'info',
    },
  ])
  const [totalLitersTonight, setTotalLitersTonight] = useState(0)
  const [barMode, setBarMode] = useState<BarMode>('usage')
  const [rateUnit, setRateUnit] = useState<RateUnit>('lpm')
  const volumeSamplesRef = useRef<VolumeSample[]>([])
  const [volumeTick, setVolumeTick] = useState(0)
  const firedRef = useRef(false)
  const lastFiredRef = useRef<number | null>(null)
  const flushLitersRef = useRef(0)
  const jettyScheduleTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const jettyScheduleIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null)

  const addLog = useCallback((text: string, tone: LogEntry['tone'] = 'info') => {
    logIdRef.current += 1
    setLogs((prev) => [...prev.slice(-24), { id: logIdRef.current, ts: Date.now(), text, tone }])
  }, [])

  const nightActive = forceNight || isNightHour()

  const evaluateNightWatch = useCallback(
    (currentLph: number, litersDelta: number, now: number) => {
      if (!nightActive) {
        setWatchStatus('daytime')
        setAnomalySince(null)
        firedRef.current = false
        return
      }

      if (litersDelta > 0) {
        setTotalLitersTonight((t) => t + litersDelta)
      }

      if (lastFiredRef.current && now - lastFiredRef.current < 30 * 60_000) {
        setWatchStatus('cooldown')
        return
      }

      if (currentLph > ANOMALY_LPH) {
        setAnomalySince((since) => {
          const start = since ?? now
          const sustained = now - start
          if (sustained >= SUSTAINED_MS && !firedRef.current) {
            firedRef.current = true
            lastFiredRef.current = now
            setWatchStatus('anomaly_fired')
            addLog('ANOMALY THRESHOLD MET — firing Jetty runbook…', 'alert')
            window.setTimeout(() => {
              addLog('Jetty agent diagnosed: slow supply line leak or running fixture', 'warn')
              addLog('SMS drafted — property manager notified', 'success')
            }, 2800)
          } else if (sustained < SUSTAINED_MS) {
            setWatchStatus('anomaly_building')
          }
          return start
        })
      } else {
        setAnomalySince(null)
        firedRef.current = false
        setWatchStatus('clear')
      }
    },
    [nightActive, addLog],
  )

  const prevModeRef = useRef(simRef.current.mode)

  const loadIncidents = useCallback(async () => {
    setIncidentsLoading(true)
    try {
      const data = await fetchJettyIncidents(SENSOR_ID, 8)
      setIncidents(data)
    } finally {
      setIncidentsLoading(false)
    }
  }, [])

  const refreshFromDb = useCallback(async () => {
    const until = Date.now()
    const since = until - historyMs
    try {
      const [mag, flow] = await Promise.all([
        fetchJettyMagHistory(SENSOR_ID, since, until),
        fetchJettyFlowHistory(SENSOR_ID, since, until),
      ])
      setRows(mag)
      volumeSamplesRef.current = flow
      setDbRowCount(mag.length)
      setVolumeTick((n) => n + 1)
      setDbStatus('live')
      persistFailLoggedRef.current = false
      void loadIncidents()
    } catch (e) {
      setDbStatus('error')
      if (!persistFailLoggedRef.current) {
        persistFailLoggedRef.current = true
        addLog(`DB sync failed: ${e instanceof Error ? e.message : String(e)}`, 'warn')
      }
    }
  }, [historyMs, addLog, loadIncidents])

  useEffect(() => {
    setDbStatus('loading')
    void refreshFromDb()
  }, [refreshFromDb])

  useEffect(() => {
    const id = window.setInterval(() => void refreshFromDb(), DB_POLL_MS)
    return () => window.clearInterval(id)
  }, [refreshFromDb])

  const tick = useCallback(() => {
    const now = Date.now()
    const state = simRef.current
    const rand = randRef.current
    const subDelta = TICK_MS / SAMPLES_PER_TICK
    const newRows: MagReport[] = []
    const newFlowSamples: VolumeSample[] = []
    let tickLiters = 0
    let tickLpm = 0

    for (let i = 0; i < SAMPLES_PER_TICK; i++) {
      const ts = now - (SAMPLES_PER_TICK - 1 - i) * subDelta
      const reading = getReading(state, ts, rand, subDelta)
      const pulse = getPulseStrength(state, ts, subDelta)
      const freq = getFreqHz(state, ts)
      const flow = getLitersDelta(state, ts, subDelta)
      tickLiters += flow.liters
      tickLpm = Math.max(tickLpm, flow.lpm)
      newFlowSamples.push({ ts, liters: flow.liters, lpm: flow.lpm })
      newRows.push(
        readingToMagReport(reading, -ts, SENSOR_ID, bandRef.current, pulse, freq, rand),
      )
    }

    const cutoff = now - historyMs
    volumeSamplesRef.current = [
      ...volumeSamplesRef.current.filter((s) => s.ts >= cutoff),
      ...newFlowSamples,
    ]

    setDbStatus('persisting')
    void persistJettyDemoBatch(SENSOR_ID, newRows, newFlowSamples, {
      simMode: state.mode,
      forceNight: nightActive,
    }).then((res) => {
      if (res.ok) {
        setDbStatus('live')
        persistFailLoggedRef.current = false
      } else if (!persistFailLoggedRef.current) {
        persistFailLoggedRef.current = true
        setDbStatus('error')
        addLog(
          `DB write failed — apply migration 007_jetty_demo_persist. ${res.error ?? ''}`.trim(),
          'warn',
        )
      }
    })

    if (prevModeRef.current === 'flush_pending' && state.mode === 'flush') {
      addLog(`Flow detected — ${state.flushTargetLiters.toFixed(1)} L expected`, 'info')
    }
    if (prevModeRef.current === 'leak_pending' && state.mode === 'leak') {
      addLog('Baseline drift started', 'warn')
    }
    if (prevModeRef.current === 'flush' && state.mode === 'idle') {
      addLog(`Flush complete — ${flushLitersRef.current.toFixed(1)} L`, 'success')
    }
    if (state.mode === 'flush') {
      flushLitersRef.current = state.flushTargetLiters
    }
    prevModeRef.current = state.mode

    evaluateNightWatch(tickLpm * 60, tickLiters, now)
    setVolumeTick((n) => n + 1)

    setRows((prev) => {
      const next = [...prev.filter((r) => new Date(r.created_at).getTime() >= cutoff), ...newRows]
      return next
    })
  }, [evaluateNightWatch, addLog, historyMs, nightActive])

  useEffect(() => {
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [tick])

  const runNightWatch = useCallback(
    async (dryRun: boolean) => {
      setNightWatchBusy(true)
      setNightWatchStatus(dryRun ? 'Checking pattern…' : 'Calling Jetty…')
      const res = await invokeNightWatch(dryRun)
      setNightWatchBusy(false)
      if (!res) {
        setNightWatchStatus('Failed — redeploy edge function with CORS fix')
        return
      }
      if (res.error) {
        setNightWatchStatus(`Error: ${res.error}`)
        return
      }
      const parts = [
        res.status,
        res.flowPattern && `pattern ${res.flowPattern}`,
        res.patternConfidence != null && `${(res.patternConfidence * 100).toFixed(0)}% conf`,
        res.diagnosis,
        res.smsSent != null && (res.smsSent ? 'SMS sent' : 'SMS skipped'),
      ].filter(Boolean)
      setNightWatchStatus(parts.join(' · '))
      if (res.status === 'anomaly_fired') {
        addLog('Jetty analysis complete — see panel below', 'success')
        void loadIncidents()
      }
    },
    [addLog, loadIncidents],
  )

  const clearJettySchedule = useCallback(() => {
    if (jettyScheduleTimeoutRef.current) {
      window.clearTimeout(jettyScheduleTimeoutRef.current)
      jettyScheduleTimeoutRef.current = null
    }
    if (jettyScheduleIntervalRef.current) {
      window.clearInterval(jettyScheduleIntervalRef.current)
      jettyScheduleIntervalRef.current = null
    }
  }, [])

  const scheduleJettyAuto = useCallback(() => {
    clearJettySchedule()
    addLog('Jetty scheduled — first run in 3 min, then every 30 min', 'info')
    setNightWatchStatus('Scheduled: Jetty runs in 3 min, then every 30 min')
    jettyScheduleTimeoutRef.current = window.setTimeout(() => {
      void runNightWatch(false)
      jettyScheduleIntervalRef.current = window.setInterval(
        () => void runNightWatch(false),
        JETTY_AUTO_INTERVAL_MS,
      )
    }, JETTY_AUTO_FIRST_MS)
  }, [addLog, clearJettySchedule, runNightWatch])

  useEffect(() => () => clearJettySchedule(), [clearJettySchedule])

  const handleFlush = useCallback(() => {
    triggerFlush(simRef.current, Date.now(), randRef.current)
    addLog('Flush queued — flow registers in ~1.4s', 'info')
  }, [addLog])

  const resetLeakWatch = useCallback(() => {
    setAnomalySince(null)
    firedRef.current = false
    if (nightActive) setWatchStatus('clear')
  }, [nightActive])

  const handleLeak = useCallback(() => {
    const state = simRef.current
    if (state.mode === 'leak' || state.mode === 'leak_pending') {
      stopLeak(state)
      clearJettySchedule()
      addLog('Leak stopped — returning to baseline', 'info')
      resetLeakWatch()
      return
    }
    triggerLeak(state, Date.now(), randRef.current)
    addLog('Leak queued — baseline drift in ~3s', 'warn')
    scheduleJettyAuto()
  }, [addLog, resetLeakWatch, clearJettySchedule, scheduleJettyAuto])

  const handleStopLeak = useCallback(() => {
    if (simRef.current.mode !== 'leak' && simRef.current.mode !== 'leak_pending') return
    stopLeak(simRef.current)
    clearJettySchedule()
    addLog('Leak stopped — returning to baseline', 'info')
    resetLeakWatch()
  }, [addLog, resetLeakWatch, clearJettySchedule])

  const handleToggleNight = useCallback(() => {
    setForceNight((v) => {
      const next = !v
      addLog(`Night mode: ${next ? 'ON' : 'OFF'}`, 'info')
      if (!next && !isNightHour()) {
        setWatchStatus('daytime')
        setAnomalySince(null)
        firedRef.current = false
      } else {
        setWatchStatus('clear')
      }
      return next
    })
  }, [addLog])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const k = e.key.toLowerCase()
      if (k === 'f') handleFlush()
      if (k === 'l') handleLeak()
      if (k === 's') handleStopLeak()
      if (k === 'n') handleToggleNight()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleFlush, handleLeak, handleStopLeak, handleToggleNight])

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

  const barChartData = useMemo<BarPoint[]>(() => {
    const now = Date.now()
    const windowStart = now - historyMs
    const numBuckets = Math.ceil(historyMs / BUCKET_MS)
    const samples = volumeSamplesRef.current
    const points: BarPoint[] = []

    for (let i = 0; i < numBuckets; i++) {
      const bStart = windowStart + i * BUCKET_MS
      const bEnd = bStart + BUCKET_MS
      const bMid = bStart + BUCKET_MS / 2
      const inBucket = samples.filter((s) => s.ts >= bStart && s.ts < bEnd)

      let volumeL = 0
      let peakLpm = 0
      for (const s of inBucket) {
        volumeL += s.liters
        if (s.lpm > peakLpm) peakLpm = s.lpm
      }
      volumeL = Math.round(volumeL * 100) / 100
      const lph = peakLpm * 60

      points.push({
        timestamp: bMid,
        lpm: peakLpm,
        lph,
        volumeL,
        partial: bStart <= now && now < bEnd,
        barVisual:
          barMode === 'usage'
            ? volumeL > 0
              ? volumeL
              : MIN_BAR_L
            : rateUnit === 'lpm'
              ? peakLpm > 0
                ? peakLpm
                : MIN_BAR_LPM
              : lph > 0
                ? lph
                : MIN_BAR_LPH,
      })
    }

    return points
  }, [volumeTick, barMode, rateUnit, historyMs])

  const flowStats = useMemo(() => {
    const now = Date.now()
    const windowStart = now - historyMs
    const samples = volumeSamplesRef.current.filter((s) => s.ts >= windowStart)
    if (!samples.length) {
      return { currentLpm: 0, totalLitres: 0, peakLpm: 0 }
    }

    const recentCutoff = now - 10_000
    const recent = samples.filter((s) => s.ts >= recentCutoff)
    const currentLpm = (recent.length ? recent : samples).reduce(
      (m, s) => Math.max(m, s.lpm),
      0,
    )
    const totalLitres = samples.reduce((sum, s) => sum + s.liters, 0)
    const peakLpm = samples.reduce((m, s) => Math.max(m, s.lpm), 0)

    return {
      currentLpm: Math.round(currentLpm * 100) / 100,
      totalLitres: Math.round(totalLitres * 100) / 100,
      peakLpm: Math.round(peakLpm * 100) / 100,
    }
  }, [volumeTick, historyMs])

  const isFlowing = flowStats.currentLpm > 0.02
  const currentLpm = flowStats.currentLpm
  const barColor = barMode === 'usage' ? '#6366f1' : '#3b82f6'
  const barYLabel = barMode === 'usage' ? 'L' : rateUnit === 'lpm' ? 'L/min' : 'L/h'
  const totalBarVolume = barChartData.reduce((s, b) => s + b.volumeL, 0)
  const peakBarRate = barChartData.reduce((m, b) => Math.max(m, rateUnit === 'lpm' ? b.lpm : b.lph), 0)

  const watchLabel = useMemo(() => {
    switch (watchStatus) {
      case 'daytime':
        return { text: 'Daytime — watch idle', color: 'text-gray-500' }
      case 'clear':
        return { text: 'Night watch clear', color: 'text-emerald-600 dark:text-emerald-400' }
      case 'anomaly_building': {
        const sec = anomalySince ? Math.floor((Date.now() - anomalySince) / 1000) : 0
        return {
          text: `Flow exceeding baseline — ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
          color: 'text-amber-600 dark:text-amber-400',
        }
      }
      case 'anomaly_fired':
        return { text: 'ANOMALY — Jetty invoked', color: 'text-red-600 dark:text-red-400' }
      case 'cooldown':
        return { text: 'Cooldown (30 min)', color: 'text-gray-400' }
    }
  }, [watchStatus, anomalySince])

  // Re-render watch timer every second while building
  const [, setTickUI] = useState(0)
  useEffect(() => {
    if (watchStatus !== 'anomaly_building') return
    const id = window.setInterval(() => setTickUI((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [watchStatus])

  const sensorEndpoint = sensorStateUrl(SENSOR_ID)

  const tooltipStyle = {
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: colors.tooltipText,
  }

  const timeWindow = useMemo(() => {
    const end = Date.now()
    return { start: end - historyMs, end }
  }, [historyMs, volumeTick, rows.length])

  const bucketBoundaries = useMemo(() => {
    const lines: number[] = []
    for (let t = timeWindow.start; t <= timeWindow.end; t += BUCKET_MS) {
      lines.push(t)
    }
    return lines
  }, [timeWindow])

  const xDomain: [number, number] = [
    timeWindow.start - BUCKET_MS / 2,
    timeWindow.end + BUCKET_MS / 2,
  ]

  const chartMargin = { top: 2, right: CHART_RIGHT, left: CHART_LEFT, bottom: 0 }
  const chartMarginBottom = { top: 2, right: CHART_RIGHT, left: CHART_LEFT, bottom: 18 }

  const sharedXProps = {
    dataKey: 'timestamp' as const,
    type: 'number' as const,
    domain: xDomain,
    syncId: SYNC_ID,
    tickFormatter: formatTime,
    tick: { fontSize: 10, fill: colors.axis },
    axisLine: { stroke: colors.grid },
    tickLine: false,
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {BUILDING_NAME} — Supply Line
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sensor #{SENSOR_ID} · {TICK_MS / 1000}s cadence ·{' '}
            <span
              className={
                dbStatus === 'error'
                  ? 'text-amber-600 dark:text-amber-400'
                  : dbStatus === 'live'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400'
              }
            >
              DB {dbStatus}
              {dbRowCount > 0 ? ` · ${dbRowCount} rows` : ''}
            </span>
          </p>
        </div>
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs dark:border-gray-600 dark:bg-gray-800">
          {(['5m', '15m', '1h', '6h'] as HistoryRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setHistoryRange(r)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                historyRange === r
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor card — matches AdminSensorCard */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isFlowing ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
            }`}
          >
            <svg
              className={`h-5 w-5 ${isFlowing ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Sensor #{SENSOR_ID}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Multiplier: {MULTIPLIER} · {BUILDING_NAME}
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

        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Current flow', value: `${flowStats.currentLpm}`, unit: 'L/min', highlight: isFlowing },
            { label: 'Total usage', value: `${flowStats.totalLitres}`, unit: 'L' },
            { label: 'Peak flow', value: `${flowStats.peakLpm}`, unit: 'L/min' },
            { label: 'Tonight (unaccounted)', value: `${totalLitersTonight.toFixed(1)}`, unit: 'L' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {s.label}
              </p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  s.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                }`}
              >
                {s.value} <span className="text-xs font-normal text-gray-400">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Night watch strip */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Night watch</span>
          <span className={`text-xs font-medium ${watchLabel.color}`}>{watchLabel.text}</span>
          <span className="text-xs text-gray-400">
            · {currentLpm.toFixed(2)} L/min now
            {nightActive ? '' : ' · daytime'}
          </span>
        </div>

        {/* Time-aligned telemetry stack — usage on top, raw waveform below */}
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Telemetry · {historyRange} window · 30s buckets
            </p>
            <div className="flex flex-wrap gap-1.5">
              <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs dark:border-gray-600 dark:bg-gray-800">
                {(['rate', 'usage'] as BarMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBarMode(m)}
                    className={`rounded px-2 py-1 font-medium transition-colors ${
                      barMode === m
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {m === 'rate' ? 'Flow rate' : 'Usage'}
                  </button>
                ))}
              </div>
              {barMode === 'rate' && (
                <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs dark:border-gray-600 dark:bg-gray-800">
                  {(['lpm', 'lph'] as RateUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setRateUnit(u)}
                      className={`rounded px-2 py-1 font-medium transition-colors ${
                        rateUnit === u
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {u === 'lpm' ? 'L/min' : 'L/h'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <AlignedChartRow title={barMode === 'usage' ? `Usage (${totalBarVolume.toFixed(1)} L total)` : `Flow rate (peak ${peakBarRate.toFixed(1)} ${barYLabel})`} height={130}>
            <BarChart data={barChartData} margin={chartMargin}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis {...sharedXProps} hide />
              <YAxis
                width={CHART_LEFT}
                tick={{ fontSize: 10, fill: colors.axis }}
                tickLine={false}
                axisLine={false}
                domain={[0, (max: number) => Math.max(max * 1.15, barMode === 'usage' ? 8 : rateUnit === 'lpm' ? 12 : 400)]}
                tickFormatter={(v: number) => (v < 0.05 ? '' : v < 10 ? v.toFixed(1) : String(Math.round(v)))}
              />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]?.payload as BarPoint | undefined
                  if (!p) return null
                  return (
                    <div style={tooltipStyle} className="rounded-lg px-3 py-2 text-xs">
                      <p className="font-medium">{formatTime(p.timestamp)}</p>
                      <p className="mt-1 font-semibold tabular-nums" style={{ color: barColor }}>
                        {barMode === 'usage'
                          ? `${p.volumeL.toFixed(2)} L`
                          : rateUnit === 'lpm'
                            ? `${p.lpm.toFixed(2)} L/min`
                            : `${p.lph.toFixed(1)} L/h`}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="barVisual" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {barChartData.map((b, i) => (
                  <Cell
                    key={i}
                    fill={barColor}
                    fillOpacity={b.partial ? 0.4 : 1}
                    stroke={b.partial ? barColor : 'none'}
                    strokeWidth={b.partial ? 1.5 : 0}
                    strokeDasharray={b.partial ? '4 2' : 'none'}
                  />
                ))}
              </Bar>
            </BarChart>
          </AlignedChartRow>

          <AlignedChartRow title="Total magnitude" height={110}>
            <LineChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis {...sharedXProps} hide />
              <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={false} tickLine={false} width={CHART_LEFT} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
              {bucketBoundaries.map((x) => (
                <ReferenceLine key={x} x={x} stroke={colors.grid} strokeDasharray="2 4" strokeOpacity={0.55} />
              ))}
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" dot={false} strokeWidth={1.5} name="Total" isAnimationActive={false} />
            </LineChart>
          </AlignedChartRow>

          <AlignedChartRow title="Magnetometer X / Y / Z" height={130} showTimeAxis>
            <LineChart data={chartData} margin={chartMarginBottom}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis {...sharedXProps} />
              <YAxis tick={{ fontSize: 10, fill: colors.axis }} axisLine={false} tickLine={false} width={CHART_LEFT} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(ts) => formatTime(Number(ts))} />
              {bucketBoundaries.map((x) => (
                <ReferenceLine key={x} x={x} stroke={colors.grid} strokeDasharray="2 4" strokeOpacity={0.55} />
              ))}
              <Line type="monotone" dataKey="x" stroke="#ef4444" dot={false} strokeWidth={1.5} name="X" isAnimationActive={false} />
              <Line type="monotone" dataKey="y" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Y" isAnimationActive={false} />
              <Line type="monotone" dataKey="z" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Z" isAnimationActive={false} />
            </LineChart>
          </AlignedChartRow>
        </div>
      </div>

      {/* Jetty routine + system log */}
      <div className="rounded-lg border border-gray-200 bg-gray-900 p-4 font-mono text-xs dark:border-gray-700">
        <div className="mb-4 border-b border-gray-800 pb-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
              Jetty routine
            </p>
            <a
              href={jettyTaskUrl(JETTY_COLLECTION, JETTY_TASK)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-sky-400 hover:text-sky-300"
            >
              flows.jetty.io →
            </a>
          </div>
          <p className="mb-2 text-[11px] leading-relaxed text-gray-400">
            Routine <span className="text-gray-300">{JETTY_ROUTINE}</span> (hourly) → workflow{' '}
            <span className="text-gray-300">{JETTY_TASK}</span> → runbook{' '}
            <span className="text-gray-300">WATER_ANOMALY.md</span> fetches sensor state, diagnoses,
            sends SMS/email from Jetty sandbox. Every run = trajectory.
          </p>
          {sensorEndpoint ? (
            <p className="mb-2 break-all text-[11px] text-emerald-400/90">
              SENSOR_ENDPOINT: {sensorEndpoint}
            </p>
          ) : (
            <p className="mb-2 text-amber-400">Set VITE_SUPABASE_URL for sensor-state URL</p>
          )}
          <p className="mb-2 text-[11px] text-gray-500">
            Demo: N → night · L → leak · then{' '}
            <code className="text-gray-400">npm run jetty:run-now</code>
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={nightWatchBusy}
              onClick={() => void runNightWatch(true)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-indigo-300 hover:bg-gray-700 disabled:opacity-50"
            >
              Check pattern (legacy)
            </button>
            <button
              type="button"
              disabled={nightWatchBusy}
              onClick={() => void runNightWatch(false)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-indigo-300 hover:bg-gray-700 disabled:opacity-50"
            >
              Edge fn Jetty (legacy)
            </button>
            <a
              href={jettyDashboardUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-gray-700 px-2 py-0.5 text-[10px] font-medium text-sky-400 hover:bg-gray-800"
            >
              View trajectories
            </a>
          </div>
          {nightWatchStatus && (
            <p className="mb-2 text-[11px] text-gray-400">{nightWatchStatus}</p>
          )}
          {incidentsLoading ? (
            <p className="text-gray-500">Loading edge-fn incidents…</p>
          ) : incidents.length === 0 ? (
            <p className="text-gray-500">
              No edge-fn incidents. Routine runs log to flows.jetty.io only — trigger with jetty:run-now
              after a leak.
            </p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">Legacy edge-fn incidents</p>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-md border border-gray-800 bg-gray-800/50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-indigo-300">
                      {formatClockShort(new Date(inc.created_at).getTime())} ·{' '}
                      {inc.severity ?? 'unknown'} · {inc.liters_per_min.toFixed(2)} L/min
                    </p>
                    {inc.jetty_trajectory_id ? (
                      <a
                        href={jettyTrajectoryUrl(
                          inc.jetty_trajectory_id,
                          inc.jetty_collection,
                          inc.jetty_task,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-medium text-sky-400 hover:text-sky-300"
                      >
                        trajectory →
                      </a>
                    ) : null}
                  </div>
                  {inc.diagnosis && <p className="mt-1 text-gray-300">{inc.diagnosis}</p>}
                  {inc.sms && (
                    <p className="mt-1 text-[11px] text-emerald-400">
                      SMS{inc.sms_sent ? ' sent' : ''}: {inc.sms}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">System log</p>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {logs.map((entry) => (
            <p
              key={entry.id}
              className={
                entry.tone === 'alert'
                  ? 'text-red-400'
                  : entry.tone === 'warn'
                    ? 'text-amber-400'
                    : entry.tone === 'success'
                      ? 'text-emerald-400'
                      : 'text-gray-400'
              }
            >
              <span className="text-gray-600">{formatClockShort(entry.ts)}</span> {entry.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
