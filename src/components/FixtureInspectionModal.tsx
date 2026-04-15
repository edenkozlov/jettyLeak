import { useCallback, useEffect, useMemo, useState } from 'react'

import BetaPill from '@/components/BetaPill'
import { fixtureTypeStyle } from '@/components/FixtureTypeIcon'
import LiveFlowIndicator from '@/components/LiveFlowIndicator'
import { supabase } from '@/lib/supabase'
import {
  displayFixtureType,
  useBuildingFixtures,
} from '@/hooks/useBuildingFixtures'
import { parseSignalValue } from '@/types/signal'
import {
  getBenchmark,
  gradeAgainstBenchmark,
  TIER_LABEL,
  type EfficiencyTier,
} from '@/utils/waterBenchmarks'
import { detectRegionFromAddress } from '@/utils/regionDetection'
import {
  TIER_BG_SOLID,
  TIER_PILL,
} from '@/components/FixtureEfficiencyRow'
import { computeFlowFromPeaks, type MagDataPoint } from '@/utils/flowComputation'
import { GET_MAG_DOWNSAMPLED } from '@/queries/getFlowAnalytics'
import { GET_SENSORS_BY_BUILDING_ID } from '@/queries/getSensorsByBuildingId'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'waiting' | 'review' | 'saving' | 'saved' | 'error'

/** DB enum for fixtures.type (see the fixture_type enum in Postgres). */
const FIXTURE_DB_TYPES = [
  'toilet',
  'urinal',
  'sink',
  'shower',
  'dishwasher',
  'water_hose',
] as const
type FixtureDbType = typeof FIXTURE_DB_TYPES[number]

function dbTypeDisplay(t: FixtureDbType): string {
  if (t === 'water_hose') return 'Water Hose'
  return t[0]!.toUpperCase() + t.slice(1)
}

interface DetectedSignal {
  id: number
  sensorId: number
  startTime: string
  endTime: string | null
  durationS: number
  /** From signal.volume_l (fallback reference only — the peak-based number below is preferred). */
  storedVolumeL: number | null
  storedFlowLpm: number | null
  classifierType: string | null
  classifierName: string | null
  displayType: string
}

/**
 * Flow statistics computed from raw mag_report peaks inside the signal's
 * time range. This matches the "Segment Detail" view in admin exactly:
 *   - totalLitres = peak_count / multiplier        (same formula throughout)
 *   - maxFlow     = max per-peak-interval L/h
 *   - avgFlow     = mean per-peak-interval L/h
 */
interface PeakFlowStats {
  maxFlowLph: number
  avgFlowLph: number
  totalLitres: number
  peakCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Web Audio chime (no external asset)
// ─────────────────────────────────────────────────────────────────────────────

function playChime() {
  try {
    const AudioCtx =
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    // Two-note chime: C5 -> E5
    const notes: Array<{ freq: number; start: number; dur: number }> = [
      { freq: 523.25, start: now, dur: 0.2 },
      { freq: 659.26, start: now + 0.14, dur: 0.3 },
    ]
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(n.freq, n.start)
      gain.gain.setValueAtTime(0, n.start)
      gain.gain.linearRampToValueAtTime(0.18, n.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, n.start + n.dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(n.start)
      osc.stop(n.start + n.dur + 0.05)
    }
    setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch {
    // Silent — audio is a nice-to-have, not critical.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  buildingId: number
  buildingName: string | null
  buildingAddress: string | null
  /** Optional pre-selected sensor; otherwise the modal picks the first one. */
  defaultSensorId?: number | null
}

export default function FixtureInspectionModal({
  open,
  onClose,
  buildingId,
  buildingName,
  buildingAddress,
  defaultSensorId,
}: Props) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [detected, setDetected] = useState<DetectedSignal | null>(null)
  const [peakStats, setPeakStats] = useState<PeakFlowStats | null>(null)
  const [peakLoading, setPeakLoading] = useState(false)
  const [sensorMultipliers, setSensorMultipliers] = useState<Map<number, number>>(new Map())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [listeningSince, setListeningSince] = useState<number>(() => Date.now())

  // Choice state
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing')
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null)
  const [newFixtureType, setNewFixtureType] = useState<FixtureDbType>('toilet')
  const [newFixtureName, setNewFixtureName] = useState('')
  const [newFixtureFloor, setNewFixtureFloor] = useState<string>('')

  // Building fixtures list (reused hook — already fetches + groups + matches)
  const fixturesState = useBuildingFixtures(open ? buildingId : null)

  const region = useMemo(
    () => detectRegionFromAddress(buildingAddress),
    [buildingAddress],
  )

  // Reset when the modal opens
  useEffect(() => {
    if (!open) return
    setPhase('waiting')
    setDetected(null)
    setPeakStats(null)
    setPeakLoading(false)
    setErrorMsg(null)
    setAssignMode('existing')
    setSelectedFixtureId(null)
    setNewFixtureType('toilet')
    setNewFixtureName('')
    setNewFixtureFloor('')
    setListeningSince(Date.now())
  }, [open])

  // Fetch sensor multipliers once so the peak-flow computation has what it needs
  useEffect(() => {
    if (!open) return
    let cancelled = false
    GET_SENSORS_BY_BUILDING_ID({ buildingId })
      .then((res: any) => {
        if (cancelled) return
        const rows = ((res?.sensor ?? []) as Array<{
          id: number
          multiplier: number | string | null
        }>)
        const map = new Map<number, number>()
        for (const r of rows) {
          const m = r.multiplier != null ? Number(r.multiplier) : 0
          if (Number.isFinite(m) && m > 0) map.set(r.id, m)
        }
        setSensorMultipliers(map)
      })
      .catch(() => {
        if (!cancelled) setSensorMultipliers(new Map())
      })
    return () => { cancelled = true }
  }, [open, buildingId])

  // Lock page scroll + Escape to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // ───────────────────────────────────────────────────────────────────────
  // Signal detection — realtime subscription with polling fallback
  // ───────────────────────────────────────────────────────────────────────

  const handleNewSignal = useCallback(
    (row: Record<string, unknown>) => {
      if (phase !== 'waiting') return
      if (row == null) return

      const id = typeof row.id === 'number' ? row.id : Number(row.id ?? 0)
      const sensorId = typeof row.sensor_id === 'number' ? row.sensor_id : Number(row.sensor_id ?? 0)
      const startTime = typeof row.start_time === 'string' ? row.start_time : null
      const endTime = typeof row.end_time === 'string' ? row.end_time : null
      if (!id || !sensorId || !startTime) return

      // Filter: only accept signals started after we began listening
      const sigStartMs = Date.parse(startTime)
      if (!Number.isFinite(sigStartMs) || sigStartMs < listeningSince - 2000) return

      const rawValue = typeof row.value === 'string' ? row.value : ''
      const parsed = parseSignalValue(rawValue)
      const durationS = Number(parsed?.duration_s ?? 0)
      const storedVolumeL =
        typeof row.volume_l === 'number' && Number.isFinite(row.volume_l) && row.volume_l > 0
          ? row.volume_l
          : null
      const storedFlowLpm =
        typeof row.avg_flow_lpm === 'number' && Number.isFinite(row.avg_flow_lpm) && row.avg_flow_lpm > 0
          ? row.avg_flow_lpm
          : null
      const classifierType = parsed?.signal_type != null ? String(parsed.signal_type) : null
      const displayType = displayFixtureType(classifierType)

      setDetected({
        id,
        sensorId,
        startTime,
        endTime,
        durationS,
        storedVolumeL,
        storedFlowLpm,
        classifierType,
        classifierName: parsed?.fixture_name ?? null,
        displayType,
      })
      setPhase('review')
      // Seed the new-fixture form type from the classifier's guess
      const lowered = (classifierType ?? '').toLowerCase()
      const matched = FIXTURE_DB_TYPES.find((t) => t === lowered)
      if (matched) setNewFixtureType(matched)
      playChime()
    },
    [phase, listeningSince],
  )

  // Subscribe to realtime signal inserts filtered to this building's sensors
  useEffect(() => {
    if (!open || phase !== 'waiting') return
    if (fixturesState.fixtures.length === 0) {
      // Still loading fixtures — wait
      return
    }
    const sensorIds = Array.from(
      new Set(
        fixturesState.fixtures
          .map((f) => f.fixture.sensor_id)
          .filter((id): id is number => id != null),
      ),
    )
    if (sensorIds.length === 0) return

    // Supabase realtime channel
    const channel = supabase
      .channel(`fixture-inspect-${buildingId}-${listeningSince}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal',
          filter: `sensor_id=in.(${sensorIds.join(',')})`,
        },
        (payload) => {
          handleNewSignal(payload.new as Record<string, unknown>)
        },
      )
      .subscribe()

    // Polling fallback — every 3s, fetch the newest signal on this building's
    // sensors. If we see one inserted after listeningSince, treat it as detected.
    const poll = setInterval(async () => {
      if (phase !== 'waiting') return
      try {
        const { data } = await supabase
          .from('signal')
          .select('id, sensor_id, start_time, end_time, value, volume_l, avg_flow_lpm')
          .in('sensor_id', sensorIds)
          .gte('start_time', new Date(listeningSince - 2000).toISOString())
          .order('start_time', { ascending: false })
          .limit(1)
        if (data && data.length > 0) {
          handleNewSignal(data[0]! as unknown as Record<string, unknown>)
        }
      } catch {
        // Non-fatal — realtime may catch it
      }
    }, 3000)

    return () => {
      channel.unsubscribe()
      clearInterval(poll)
    }
  }, [open, phase, buildingId, fixturesState.fixtures, listeningSince, handleNewSignal])

  // ───────────────────────────────────────────────────────────────────────
  // Compute peak-based flow stats for the detected signal
  // (same pipeline as the admin "Segment Detail" view)
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!detected || phase !== 'review') {
      setPeakStats(null)
      return
    }
    const multiplier = sensorMultipliers.get(detected.sensorId)
    if (!multiplier || multiplier <= 0) {
      setPeakStats(null)
      return
    }
    const endIso = detected.endTime ?? detected.startTime
    // Pad the window by 2s on each side so peak detection has context at the
    // edges (same as the DB trigger's approach).
    const sinceMs = Date.parse(detected.startTime) - 2000
    const untilMs = Date.parse(endIso) + 2000
    if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs)) return

    let cancelled = false
    setPeakLoading(true)
    GET_MAG_DOWNSAMPLED({
      sensorIds: [detected.sensorId],
      since: new Date(sinceMs).toISOString(),
      until: new Date(untilMs).toISOString(),
      maxPoints: 1500,
    })
      .then((res) => {
        if (cancelled) return
        const rows = res.mag_report ?? []
        // Keep only rows inside the actual signal window (discard the padding)
        const signalStart = Date.parse(detected.startTime)
        const signalEnd = Date.parse(endIso)
        const magPoints: MagDataPoint[] = rows
          .filter((r) => {
            const t = new Date(r.created_at).getTime()
            return t >= signalStart && t <= signalEnd
          })
          .map((r) => ({
            timestamp: new Date(r.created_at).getTime(),
            x: r.x_axis_reading,
            total: r.total_magnitude,
            bandEnergy10s: r.band_energy_10s,
            bandEnergy60s: r.band_energy_60s,
          }))
        const flowPoints = computeFlowFromPeaks(magPoints, multiplier)
        if (flowPoints.length === 0) {
          setPeakStats({ maxFlowLph: 0, avgFlowLph: 0, totalLitres: 0, peakCount: 0 })
          return
        }
        const maxFlowLph = Math.max(...flowPoints.map((p) => p.flowRateLph))
        const avgFlowLph =
          flowPoints.reduce((a, p) => a + p.flowRateLph, 0) / flowPoints.length
        const totalLitres = flowPoints[flowPoints.length - 1]?.accumulatedL ?? 0
        setPeakStats({
          maxFlowLph,
          avgFlowLph,
          totalLitres,
          peakCount: flowPoints.length,
        })
      })
      .catch(() => {
        if (!cancelled) setPeakStats(null)
      })
      .finally(() => {
        if (!cancelled) setPeakLoading(false)
      })

    return () => { cancelled = true }
  }, [detected, phase, sensorMultipliers])

  // ───────────────────────────────────────────────────────────────────────
  // Save action
  // ───────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!detected) return
    setPhase('saving')
    setErrorMsg(null)
    try {
      let fixtureId: number | null = null
      if (assignMode === 'existing') {
        if (selectedFixtureId == null) {
          throw new Error('Pick a fixture to assign this signal to')
        }
        fixtureId = selectedFixtureId
      } else {
        // Create new fixture
        const floorNum = newFixtureFloor.trim() !== '' ? Number(newFixtureFloor) : null
        const payload: Record<string, unknown> = {
          building_id: buildingId,
          type: newFixtureType,
          sensor_id: detected.sensorId,
        }
        if (newFixtureName.trim()) payload.name = newFixtureName.trim()
        if (floorNum != null && Number.isFinite(floorNum)) payload.floor_number = floorNum
        const { data: inserted, error: insErr } = await supabase
          .from('fixtures')
          .insert(payload)
          .select('id')
          .single()
        if (insErr) throw insErr
        fixtureId = (inserted as { id: number } | null)?.id ?? null
        if (fixtureId == null) throw new Error('Failed to create fixture')
      }

      // Link the signal's time range to the fixture via calibration_label
      const { error: labelErr } = await supabase
        .from('calibration_label')
        .insert({
          fixture_id: fixtureId,
          start_time: detected.startTime,
          end_time: detected.endTime ?? detected.startTime,
          ordering: 1,
        })
      if (labelErr) throw labelErr

      setPhase('saved')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [
    detected,
    assignMode,
    selectedFixtureId,
    newFixtureType,
    newFixtureName,
    newFixtureFloor,
    buildingId,
  ])

  const inspectAnother = useCallback(() => {
    setPhase('waiting')
    setDetected(null)
    setSelectedFixtureId(null)
    setNewFixtureName('')
    setListeningSince(Date.now())
  }, [])

  // Prefer peak-based stats when we have them; fall back to stored values
  // while the mag fetch is in flight.
  const displayVolumeL = peakStats?.totalLitres ?? detected?.storedVolumeL ?? null
  const displayFlowLpm =
    peakStats && peakStats.avgFlowLph > 0
      ? peakStats.avgFlowLph / 60
      : detected?.storedFlowLpm ?? null
  // Compute the detected signal's tier for health readout
  const detectedTier: EfficiencyTier | null = useMemo(() => {
    if (!detected || !displayVolumeL) return null
    const benchmark = getBenchmark(detected.displayType, region)
    if (!benchmark) return null
    const measured =
      benchmark.kind === 'volume_per_use'
        ? displayVolumeL
        : displayFlowLpm ?? (detected.durationS > 0 ? (displayVolumeL * 60) / detected.durationS : 0)
    if (!Number.isFinite(measured) || measured <= 0) return null
    return gradeAgainstBenchmark(measured, benchmark)
  }, [detected, displayVolumeL, displayFlowLpm, region])

  // Reference to keep the defaultSensorId unused warning away while still
  // letting callers pre-seed a sensor in a future iteration.
  void defaultSensorId

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspection-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-400 backdrop-blur transition-colors hover:bg-gray-100 hover:text-gray-600 dark:bg-gray-900/80 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-6 pb-5 pt-6 dark:border-gray-700 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Fixture Inspection
          </p>
          <h2 id="inspection-title" className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {phase === 'waiting' && 'Listening for water…'}
            {phase === 'review' && 'Signal detected'}
            {phase === 'saving' && 'Saving…'}
            {phase === 'saved' && 'Saved!'}
            {phase === 'error' && 'Something went wrong'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {buildingName || `Building #${buildingId}`}
          </p>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5 sm:px-8">
          {phase === 'waiting' && (
            <WaitingView
              buildingId={buildingId}
              loadingFixtures={fixturesState.loading}
              sensorCount={
                new Set(
                  fixturesState.fixtures
                    .map((f) => f.fixture.sensor_id)
                    .filter((id) => id != null),
                ).size
              }
            />
          )}

          {phase === 'review' && detected && (
            <ReviewView
              detected={detected}
              peakStats={peakStats}
              peakLoading={peakLoading}
              tier={detectedTier}
              existingFixtures={fixturesState.fixtures.map((f) => ({
                id: f.fixture.id,
                name: f.fixture.name,
                type: f.dbType,
                floor: f.fixture.floor_number,
                sensorId: f.fixture.sensor_id,
              }))}
              assignMode={assignMode}
              onAssignModeChange={setAssignMode}
              selectedFixtureId={selectedFixtureId}
              onSelectFixture={setSelectedFixtureId}
              newFixtureType={newFixtureType}
              onNewFixtureType={setNewFixtureType}
              newFixtureName={newFixtureName}
              onNewFixtureName={setNewFixtureName}
              newFixtureFloor={newFixtureFloor}
              onNewFixtureFloor={setNewFixtureFloor}
              onSave={handleSave}
              canSave={
                assignMode === 'existing'
                  ? selectedFixtureId != null
                  : newFixtureType != null
              }
            />
          )}

          {phase === 'saving' && (
            <div className="flex h-48 items-center justify-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Saving…</div>
            </div>
          )}

          {phase === 'saved' && (
            <SavedView onAnother={inspectAnother} onClose={onClose} />
          )}

          {phase === 'error' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg ?? 'Unknown error'}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPhase('review')}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: waiting — engaging listening screen with live flow indicator
// ─────────────────────────────────────────────────────────────────────────────

function WaitingView({
  buildingId,
  loadingFixtures,
  sensorCount,
}: {
  buildingId: number
  loadingFixtures: boolean
  sensorCount: number
}) {
  return (
    <div className="flex flex-col items-center py-6">
      {/* Animated pulse rings */}
      <div className="relative flex h-48 w-48 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-200/60 opacity-75 dark:bg-indigo-900/40" />
        <div className="absolute inset-4 animate-ping rounded-full bg-indigo-300/60 opacity-75 [animation-delay:400ms] dark:bg-indigo-800/40" />
        <div className="absolute inset-8 animate-ping rounded-full bg-indigo-400/60 opacity-75 [animation-delay:800ms] dark:bg-indigo-700/40" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg">
          {/* Water-drop icon */}
          <svg className="h-12 w-12 text-white animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5c.3 0 .6.14.8.38 0 0 2.2 2.55 4.2 5.75s4 7.06 4 9.87c0 4.97-4.03 9-9 9s-9-4.03-9-9c0-2.81 2-6.67 4-9.87s4.2-5.75 4.2-5.75c.2-.24.5-.38.8-.38Z" />
          </svg>
        </div>
      </div>

      <p className="mt-6 text-lg font-semibold text-gray-900 dark:text-white">
        Run the fixture now
      </p>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        Turn on the sink, flush the toilet, or start the shower you want to inspect.
        We'll detect the signal automatically.
      </p>

      {/* Live flow indicator as engagement */}
      <div className="mt-6 w-full max-w-xs rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Live flow
          </span>
          <LiveFlowIndicator buildingId={buildingId} />
        </div>
      </div>

      {loadingFixtures && (
        <p className="mt-4 text-xs text-gray-400">Loading building sensors…</p>
      )}
      {!loadingFixtures && sensorCount === 0 && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          No sensors assigned to this building's fixtures. The inspection can still
          run, but no signals will arrive.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: review — show detected signal + pick existing or new fixture
// ─────────────────────────────────────────────────────────────────────────────

interface ExistingFixtureOption {
  id: number
  name: string | null
  type: string
  floor: number | null
  sensorId: number | null
}

function ReviewView({
  detected,
  peakStats,
  peakLoading,
  tier,
  existingFixtures,
  assignMode,
  onAssignModeChange,
  selectedFixtureId,
  onSelectFixture,
  newFixtureType,
  onNewFixtureType,
  newFixtureName,
  onNewFixtureName,
  newFixtureFloor,
  onNewFixtureFloor,
  onSave,
  canSave,
}: {
  detected: DetectedSignal
  peakStats: PeakFlowStats | null
  peakLoading: boolean
  tier: EfficiencyTier | null
  existingFixtures: ExistingFixtureOption[]
  assignMode: 'existing' | 'new'
  onAssignModeChange: (m: 'existing' | 'new') => void
  selectedFixtureId: number | null
  onSelectFixture: (id: number) => void
  newFixtureType: FixtureDbType
  onNewFixtureType: (t: FixtureDbType) => void
  newFixtureName: string
  onNewFixtureName: (s: string) => void
  newFixtureFloor: string
  onNewFixtureFloor: (s: string) => void
  onSave: () => void
  canSave: boolean
}) {
  const style = fixtureTypeStyle(detected.displayType)

  // Only show fixtures on the same sensor as the detected signal
  const relevantFixtures = existingFixtures.filter(
    (f) => f.sensorId == null || f.sensorId === detected.sensorId,
  )

  // Prefer peak-based stats (same pipeline as admin Segment Detail) when available
  const totalL = peakStats?.totalLitres ?? detected.storedVolumeL ?? null
  const avgLph = peakStats?.avgFlowLph ?? null
  const maxLph = peakStats?.maxFlowLph ?? null

  return (
    <div className="space-y-5">
      {/* Detected signal summary */}
      <div className={`rounded-xl border bg-white p-5 dark:bg-gray-800 ${tier ? '' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${style.chip}`}>
            <div className="h-8 w-8">{style.icon}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {detected.displayType}
              </p>
              <BetaPill title="Type guessed by the classifier — you'll confirm below." />
              {tier && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${TIER_PILL[tier]}`}>
                  {TIER_LABEL[tier]}
                </span>
              )}
            </div>

            {/* Primary metrics — matches the admin "Segment Detail" view */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                label="Total"
                value={totalL != null ? `${totalL.toFixed(2)} L` : peakLoading ? '…' : '—'}
              />
              <Metric
                label="Avg flow"
                value={avgLph != null ? `${avgLph.toFixed(1)} L/h` : peakLoading ? '…' : '—'}
              />
              <Metric
                label="Max flow"
                value={maxLph != null ? `${maxLph.toFixed(1)} L/h` : peakLoading ? '…' : '—'}
              />
              <Metric
                label="Duration"
                value={
                  detected.durationS < 60
                    ? `${detected.durationS.toFixed(1)}s`
                    : `${Math.floor(detected.durationS / 60)}m ${Math.round(detected.durationS % 60)}s`
                }
              />
            </div>

            {peakStats != null && peakStats.peakCount > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                {peakStats.peakCount} cycle{peakStats.peakCount === 1 ? '' : 's'} detected from raw mag data
              </p>
            )}
            {peakLoading && (
              <p className="mt-2 text-xs text-gray-400">Computing from raw mag data…</p>
            )}
            {detected.classifierName && (
              <p className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                ML sees: <span className="ml-1 italic">{detected.classifierName}</span>
                <BetaPill />
              </p>
            )}
          </div>
        </div>
        {tier && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div className={`h-full ${TIER_BG_SOLID[tier]}`} style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {/* Assign question */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Which fixture produced this signal?
        </p>

        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => onAssignModeChange('existing')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              assignMode === 'existing'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Existing fixture
          </button>
          <button
            type="button"
            onClick={() => onAssignModeChange('new')}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              assignMode === 'new'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-800 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            New fixture
          </button>
        </div>

        {assignMode === 'existing' ? (
          <div className="space-y-2">
            {relevantFixtures.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
                No fixtures assigned to this sensor yet. Switch to "New fixture" to add one.
              </p>
            ) : (
              relevantFixtures.map((f) => {
                const active = selectedFixtureId === f.id
                const fs = fixtureTypeStyle(f.type)
                const name = f.name || `Fixture #${f.id}`
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectFixture(f.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-900/20'
                        : 'border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500/40'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${fs.chip}`}>
                      <div className="h-6 w-6">{fs.icon}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {f.type}
                        {f.floor != null ? ` · Floor ${f.floor}` : ''}
                        {f.sensorId != null ? ` · Sensor #${f.sensorId}` : ''}
                      </p>
                    </div>
                    {active && (
                      <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {FIXTURE_DB_TYPES.map((t) => {
                  const active = newFixtureType === t
                  const fs = fixtureTypeStyle(dbTypeDisplay(t))
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onNewFixtureType(t)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 transition-colors ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-900/20'
                          : 'border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${fs.chip}`}>
                        <div className="h-6 w-6">{fs.icon}</div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                        {dbTypeDisplay(t)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={newFixtureName}
                  onChange={(e) => onNewFixtureName(e.target.value)}
                  placeholder="e.g. Men's toilet A"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Floor (optional)
                </label>
                <input
                  type="number"
                  value={newFixtureFloor}
                  onChange={(e) => onNewFixtureFloor(e.target.value)}
                  placeholder="e.g. 2"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          Save fixture
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: saved — confirmation + option to inspect another
// ─────────────────────────────────────────────────────────────────────────────

function SavedView({
  onAnother,
  onClose,
}: {
  onAnother: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
        Fixture labeled
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The signal is now linked to this fixture.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Inspect another
        </button>
      </div>
    </div>
  )
}
