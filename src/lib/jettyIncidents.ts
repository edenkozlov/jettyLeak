import { supabase } from '@/lib/supabase'

export interface JettyIncident {
  id: number
  created_at: string
  sensor_id: number
  liters_per_min: number
  total_liters_tonight: number
  sustained_seconds: number
  diagnosis: string | null
  severity: string | null
  reasoning: string | null
  sms: string | null
  sms_sent: boolean
  email_sent: boolean
  jetty_trajectory_id: string | null
  jetty_collection: string | null
  jetty_task: string | null
}

const INCIDENT_BASE_SELECT =
  'id, created_at, sensor_id, liters_per_min, total_liters_tonight, sustained_seconds, diagnosis, severity, reasoning, sms, sms_sent, email_sent'

function trajectoryFromRaw(raw: unknown): {
  jetty_trajectory_id: string | null
  jetty_collection: string | null
  jetty_task: string | null
} {
  if (!raw || typeof raw !== 'object') {
    return { jetty_trajectory_id: null, jetty_collection: null, jetty_task: null }
  }
  const jetty = (raw as { jetty?: Record<string, unknown> }).jetty
  if (!jetty || typeof jetty !== 'object') {
    return { jetty_trajectory_id: null, jetty_collection: null, jetty_task: null }
  }
  return {
    jetty_trajectory_id:
      typeof jetty.trajectoryId === 'string' ? jetty.trajectoryId : null,
    jetty_collection: typeof jetty.collection === 'string' ? jetty.collection : null,
    jetty_task: typeof jetty.task === 'string' ? jetty.task : null,
  }
}

function normalizeIncident(row: Record<string, unknown>): JettyIncident {
  const fromRaw = trajectoryFromRaw(row.jetty_raw)
  return {
    id: row.id as number,
    created_at: row.created_at as string,
    sensor_id: row.sensor_id as number,
    liters_per_min: row.liters_per_min as number,
    total_liters_tonight: row.total_liters_tonight as number,
    sustained_seconds: row.sustained_seconds as number,
    diagnosis: (row.diagnosis as string | null) ?? null,
    severity: (row.severity as string | null) ?? null,
    reasoning: (row.reasoning as string | null) ?? null,
    sms: (row.sms as string | null) ?? null,
    sms_sent: Boolean(row.sms_sent),
    email_sent: Boolean(row.email_sent),
    jetty_trajectory_id:
      (row.jetty_trajectory_id as string | null) ?? fromRaw.jetty_trajectory_id,
    jetty_collection:
      (row.jetty_collection as string | null) ?? fromRaw.jetty_collection,
    jetty_task: (row.jetty_task as string | null) ?? fromRaw.jetty_task,
  }
}

export async function fetchJettyIncidents(
  sensorId: number,
  limit = 10,
): Promise<JettyIncident[]> {
  if (!supabase) return []

  const fullSelect = `${INCIDENT_BASE_SELECT}, jetty_trajectory_id, jetty_collection, jetty_task, jetty_raw`
  const full = await supabase
    .from('jetty_incident')
    .select(fullSelect)
    .eq('sensor_id', sensorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  let rows: Record<string, unknown>[] | null = full.data as Record<string, unknown>[] | null
  let error = full.error

  // Migration 010 not applied yet — fall back without trajectory columns
  if (
    error?.message?.includes('jetty_trajectory_id') ||
    error?.message?.includes('jetty_collection')
  ) {
    const fallback = await supabase
      .from('jetty_incident')
      .select(`${INCIDENT_BASE_SELECT}, jetty_raw`)
      .eq('sensor_id', sensorId)
      .order('created_at', { ascending: false })
      .limit(limit)
    rows = fallback.data as Record<string, unknown>[] | null
    error = fallback.error
  }

  if (error) {
    console.warn('[jetty] incidents fetch failed:', error.message)
    return []
  }

  return (rows ?? []).map((row) => normalizeIncident(row))
}
