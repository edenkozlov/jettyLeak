import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import BuildingFootprintComponent from '@/components/BuildingFootprint'
import { useBuildingFootprint } from '@/hooks/useBuildingFootprint'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { GET_MAG_DOWNSAMPLED } from '@/queries/getFlowAnalytics'
import { getFixturesByBuilding, type Fixture } from '@/queries/getFixturesByBuilding'
import { FIXTURE_COLORS } from '@/types'
import type { Fixture as FixtureT, Sensor, MagReport } from '@/types'

const CHART_COLORS = {
  light: { grid: '#e5e7eb', axis: '#6b7280', tooltipBg: '#fff', tooltipBorder: '#e5e7eb', tooltipText: '#111827' },
  dark: { grid: '#374151', axis: '#9ca3af', tooltipBg: '#1f2937', tooltipBorder: '#374151', tooltipText: '#f3f4f6' },
} as const

interface Signal {
  id: number
  start_time: string
  end_time: string
  value: string
  sensor_id: number
}

interface ParsedSignalValue {
  signal_type?: string
  fixture_name?: string
  cosine_distance?: number
  duration_s?: number
  readings?: number
  classifications?: Array<{ type: string; name: string; distance: number }>
}

interface MagPoint {
  timestamp: number
  x: number | null
}

interface FixturesViewProps {
  buildingId: number | null
  sensorId: number | null
  magSensorIds: number[]
  sensors: Sensor[]
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function fixtureLabel(f: Fixture): string {
  const parts: string[] = []
  if (f.name) parts.push(f.name)
  if (f.type) {
    const color = FIXTURE_COLORS[f.type as keyof typeof FIXTURE_COLORS]
    parts.push(color?.label ?? f.type)
  }
  if (f.floor_number != null) parts.push(`Floor ${f.floor_number}`)
  return parts.length > 0 ? parts.join(' · ') : `Fixture #${f.id}`
}

function SignalChart({
  signal,
  magSensorIds,
}: {
  signal: Signal
  magSensorIds: number[]
}) {
  const { mode } = useTheme()
  const colors = CHART_COLORS[mode]
  const [points, setPoints] = useState<MagPoint[]>([])
  const [loading, setLoading] = useState(true)

  const sinceMs = new Date(signal.start_time).getTime()
  const untilMs = new Date(signal.end_time).getTime()
  const padMs = 30_000
  const chartSince = sinceMs - padMs
  const chartUntil = untilMs + padMs

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    GET_MAG_DOWNSAMPLED({
      sensorIds: magSensorIds,
      since: new Date(chartSince).toISOString(),
      until: new Date(chartUntil).toISOString(),
      maxPoints: 1000,
    })
      .then((res) => {
        if (cancelled) return
        const pts = (res.mag_report as unknown as MagReport[])
          .map((r) => ({
            timestamp: new Date(r.created_at).getTime(),
            x: r.x_axis_reading,
          }))
          .sort((a, b) => a.timestamp - b.timestamp)
        setPoints(pts)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [signal.id, magSensorIds, chartSince, chartUntil])

  const ticks = useMemo(() => {
    const count = 5
    const step = (chartUntil - chartSince) / (count - 1)
    return Array.from({ length: count }, (_, i) => chartSince + step * i)
  }, [chartSince, chartUntil])

  if (loading) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-gray-400">
        Loading…
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-gray-400">
        No mag data
      </div>
    )
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={[chartSince, chartUntil]}
            ticks={ticks}
            tickFormatter={(v: number) => formatClock(v)}
            tick={{ fontSize: 10, fill: colors.axis }}
            tickLine={{ stroke: colors.grid }}
            axisLine={{ stroke: colors.grid }}
            allowDataOverflow
          />
          <YAxis
            width={44}
            tick={{ fontSize: 10, fill: colors.axis }}
            tickLine={{ stroke: colors.grid }}
            axisLine={{ stroke: colors.grid }}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: colors.tooltipText,
            }}
            formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(3) : '—', 'X']}
            labelFormatter={(ts: unknown) => formatClock(Number(ts))}
          />
          {/* Signal region highlight */}
          <rect x={0} y={0} width={0} height={0} />
          <Line
            type="monotone"
            dataKey="x"
            name="X"
            stroke="#f43f5e"
            strokeWidth={1.25}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function FixturesView({
  buildingId,
  sensorId,
  magSensorIds,
  sensors,
}: FixturesViewProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [signalsLoading, setSignalsLoading] = useState(false)
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'signals' | 'labels'>('signals')

  interface CalibrationLabelRow {
    id: number
    created_at: string
    start_time: string
    end_time: string
    ordering: number | null
    fixture_id: number | null
  }
  const [calibrationLabels, setCalibrationLabels] = useState<CalibrationLabelRow[]>([])
  const [labelsLoading, setLabelsLoading] = useState(false)

  const selectedSensor = useMemo(
    () => sensors.find((s) => s.id === sensorId) ?? null,
    [sensors, sensorId],
  )

  const building = selectedSensor?.building ?? null
  const { footprints: overpassFootprints } = useBuildingFootprint(
    building?.latitude ?? null,
    building?.longitude ?? null,
  )

  const displayFootprints = useMemo(() => {
    if (building?.footprint && building.footprint.length > 0) {
      return [{ id: building.id, coordinates: building.footprint }]
    }
    return overpassFootprints
  }, [building, overpassFootprints])

  const fixturesAsType: FixtureT[] = useMemo(
    () =>
      fixtures.map((f) => ({
        id: f.id,
        created_at: f.created_at,
        building_id: f.building_id,
        floor_number: f.floor_number,
        type: (f.type as FixtureT['type']) ?? null,
        location_on_floor: f.location_on_floor ?? null,
        sensor_id: f.sensor_id,
      })),
    [fixtures],
  )

  // Fetch fixtures
  useEffect(() => {
    if (buildingId == null) return
    let cancelled = false
    setFixturesLoading(true)
    getFixturesByBuilding(buildingId)
      .then((rows) => {
        if (cancelled) return
        setFixtures(rows)
        setFixturesLoading(false)
      })
      .catch(() => {
        if (!cancelled) setFixturesLoading(false)
      })
    return () => { cancelled = true }
  }, [buildingId])

  // Fetch signals for sensor
  useEffect(() => {
    if (sensorId == null) return
    let cancelled = false
    setSignalsLoading(true)
    supabase
      .from('signal')
      .select('id, start_time, end_time, value, sensor_id')
      .eq('sensor_id', sensorId)
      .order('start_time', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('[FixturesView] signal fetch failed', error)
          setSignals([])
        } else {
          setSignals((data ?? []) as Signal[])
        }
        setSignalsLoading(false)
      })
    return () => { cancelled = true }
  }, [sensorId])

  const selectedFixture = useMemo(
    () => fixtures.find((f) => f.id === selectedFixtureId) ?? null,
    [fixtures, selectedFixtureId],
  )

  // Filter signals matching selected fixture
  const matchingSignals = useMemo(() => {
    if (!selectedFixture || !selectedFixture.name) return []
    const name = selectedFixture.name
    return signals.filter((s) => {
      try {
        const parsed: ParsedSignalValue = JSON.parse(s.value)
        return parsed.fixture_name === name
      } catch {
        return false
      }
    })
  }, [signals, selectedFixture])

  // Fetch calibration labels for the selected fixture
  useEffect(() => {
    if (selectedFixtureId == null) {
      setCalibrationLabels([])
      return
    }
    let cancelled = false
    setLabelsLoading(true)
    supabase
      .from('calibration_label')
      .select('id, created_at, start_time, end_time, ordering, fixture_id')
      .eq('fixture_id', selectedFixtureId)
      .order('start_time', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('[FixturesView] calibration label fetch failed', error)
          setCalibrationLabels([])
        } else {
          setCalibrationLabels((data ?? []) as CalibrationLabelRow[])
        }
        setLabelsLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedFixtureId])

  // Group calibration labels by event (same start_time + end_time)
  const groupedLabels = useMemo(() => {
    if (calibrationLabels.length === 0) return []
    const groups = new Map<string, CalibrationLabelRow[]>()
    for (const lbl of calibrationLabels) {
      const key = `${lbl.start_time}|${lbl.end_time}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(lbl)
    }
    return [...groups.entries()].map(([key, rows]) => {
      const [start_time, end_time] = key.split('|')
      rows.sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0))
      return {
        key,
        start_time: start_time!,
        end_time: end_time!,
        labels: rows,
      }
    })
  }, [calibrationLabels])

  const handleFixtureClick = useCallback((id: number) => {
    setSelectedFixtureId((prev) => (prev === id ? null : id))
  }, [])

  if (buildingId == null) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        No building associated with this sensor.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Map */}
      {displayFootprints.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Building Floor Plan
          </h3>
          <div className="h-[280px]">
            <BuildingFootprintComponent
              footprints={displayFootprints}
              fixtures={fixturesAsType}
              numberOfFloors={building?.number_of_floors ?? 1}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Fixture selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Fixtures
          {fixturesLoading && (
            <span className="ml-2 text-xs font-normal text-gray-400">Loading…</span>
          )}
        </h3>
        {fixtures.length === 0 && !fixturesLoading ? (
          <p className="py-4 text-center text-xs text-gray-400">No fixtures for this building.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fixtures.map((f) => {
              const isSelected = f.id === selectedFixtureId
              const colorKey = f.type as keyof typeof FIXTURE_COLORS | undefined
              const color = colorKey ? FIXTURE_COLORS[colorKey] : null
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFixtureClick(f.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400 dark:border-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  {color && (
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: color.fill }}
                    />
                  )}
                  {fixtureLabel(f)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Signal / Label cards for selected fixture */}
      {selectedFixture && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setViewMode('signals')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    viewMode === 'signals'
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  Signals
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('labels')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    viewMode === 'labels'
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  Calibration Labels
                </button>
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {fixtureLabel(selectedFixture)}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {viewMode === 'signals'
                ? signalsLoading
                  ? 'Loading…'
                  : `${matchingSignals.length} signal${matchingSignals.length !== 1 ? 's' : ''}`
                : labelsLoading
                  ? 'Loading…'
                  : `${groupedLabels.length} labeled event${groupedLabels.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {viewMode === 'signals' ? (
            matchingSignals.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">
                {signalsLoading ? 'Loading signals…' : 'No signals found for this fixture.'}
              </p>
            ) : (
              <div className="space-y-3">
                {matchingSignals.map((sig) => {
                  let parsed: ParsedSignalValue = {}
                  try {
                    parsed = JSON.parse(sig.value)
                  } catch {}
                  const durationS = parsed.duration_s ?? (
                    (new Date(sig.end_time).getTime() - new Date(sig.start_time).getTime()) / 1000
                  )
                  return (
                    <div
                      key={sig.id}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/30"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            {parsed.signal_type ?? 'unknown'}
                            {parsed.fixture_name ? ` (${parsed.fixture_name})` : ''}
                          </span>
                          {parsed.cosine_distance != null && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              d={parsed.cosine_distance.toFixed(3)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                          <span>{formatDate(sig.start_time)}</span>
                          <span>{durationS.toFixed(1)}s</span>
                          {parsed.readings && <span>{parsed.readings} readings</span>}
                        </div>
                      </div>
                      <SignalChart signal={sig} magSensorIds={magSensorIds} />
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            groupedLabels.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">
                {labelsLoading ? 'Loading labels…' : 'No calibration labels for this fixture.'}
              </p>
            ) : (
              <div className="space-y-3">
                {groupedLabels.map((group) => {
                  const durationS = (
                    (new Date(group.end_time).getTime() - new Date(group.start_time).getTime()) / 1000
                  )
                  const fakeSignal: Signal = {
                    id: group.labels[0]!.id,
                    start_time: group.start_time,
                    end_time: group.end_time,
                    value: '',
                    sensor_id: sensorId ?? 0,
                  }
                  return (
                    <div
                      key={group.key}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-900/10"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {group.labels.map((lbl) => {
                            const f = lbl.fixture_id != null ? fixtures.find((fx) => fx.id === lbl.fixture_id) : null
                            return (
                              <span
                                key={lbl.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                              >
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                                  {lbl.ordering ?? '·'}
                                </span>
                                {f ? (f.name ?? f.type ?? `#${f.id}`) : `#${lbl.fixture_id}`}
                              </span>
                            )
                          })}
                        </div>
                        <div className="flex gap-3 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                          <span>{formatDate(group.start_time)}</span>
                          <span>{durationS.toFixed(1)}s</span>
                        </div>
                      </div>
                      <SignalChart signal={fakeSignal} magSensorIds={magSensorIds} />
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
