import { supabase } from '@/lib/supabase'
import { GET_MAG_REPORTS } from '@/queries/getMagReports'
import type { MagReport } from '@/types/magReport'

export interface JettyFlowSample {
  ts: number
  liters: number
  lpm: number
}

function rowToMagInsert(row: MagReport): Record<string, string | number | null> {
  return {
    created_at: row.created_at,
    x_axis_reading: row.x_axis_reading,
    y_axis_reading: row.y_axis_reading,
    z_axis_reading: row.z_axis_reading,
    total_magnitude: row.total_magnitude,
    band_energy_10s: row.band_energy_10s,
    band_energy_60s: row.band_energy_60s,
    band_energy_5m: row.band_energy_5m,
    dominant_freq_hz: row.dominant_freq_hz,
    vibration_rpm: row.vibration_rpm,
  }
}

export async function persistJettyDemoBatch(
  sensorId: number,
  magRows: MagReport[],
  flowSamples: JettyFlowSample[],
  live?: { simMode?: string; forceNight?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || (magRows.length === 0 && flowSamples.length === 0)) {
    return { ok: false, error: 'no client or empty batch' }
  }

  const { error } = await supabase.rpc('insert_jetty_demo_batch', {
    p_sensor_id: sensorId,
    p_mag_reports: magRows.map(rowToMagInsert),
    p_flow_samples: flowSamples.map((s) => ({
      created_at: new Date(s.ts).toISOString(),
      liters: s.liters,
      lpm: s.lpm,
    })),
    p_sim_mode: live?.simMode ?? null,
    p_force_night: live?.forceNight ?? null,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function fetchJettyMagHistory(
  sensorId: number,
  sinceMs: number,
  untilMs = Date.now(),
): Promise<MagReport[]> {
  const since = new Date(sinceMs).toISOString()
  const until = new Date(untilMs).toISOString()
  const res = await GET_MAG_REPORTS({ sensorIds: [sensorId], since, until })
  const rows = (res.mag_report ?? []) as MagReport[]
  return rows.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export async function fetchJettyFlowHistory(
  sensorId: number,
  sinceMs: number,
  untilMs = Date.now(),
): Promise<JettyFlowSample[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('jetty_flow_sample')
    .select('created_at, liters, lpm')
    .eq('sensor_id', sensorId)
    .gte('created_at', new Date(sinceMs).toISOString())
    .lte('created_at', new Date(untilMs).toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[jetty] flow history fetch failed:', error.message)
    return []
  }

  return (data ?? []).map((r) => ({
    ts: new Date(r.created_at as string).getTime(),
    liters: Number(r.liters) || 0,
    lpm: Number(r.lpm) || 0,
  }))
}

export function mergeMagReports(existing: MagReport[], incoming: MagReport[]): MagReport[] {
  const byKey = new Map<string, MagReport>()
  for (const r of existing) {
    byKey.set(`${r.id}:${r.created_at}`, r)
  }
  for (const r of incoming) {
    byKey.set(`${r.id}:${r.created_at}`, r)
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}
