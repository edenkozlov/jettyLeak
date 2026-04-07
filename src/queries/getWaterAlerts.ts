import { supabase } from '@/lib/supabase'
import type { WaterAlert, WaterAlertFilters, WaterAlertStats } from '@/types'

export async function getWaterAlerts(
  filters?: WaterAlertFilters,
): Promise<WaterAlert[]> {
  let query = supabase
    .from('montreal_water_alerts')
    .select('*')
    .order('published_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.borough) {
    query = query.eq('borough', filters.borough)
  }

  if (filters?.q) {
    query = query.ilike('title', `%${filters.q}%`)
  }

  if (filters?.from) {
    query = query.gte('published_at', filters.from)
  }

  if (filters?.to) {
    query = query.lte('published_at', filters.to)
  }

  const { data, error } = await query.limit(500)
  if (error) throw error
  return (data ?? []) as WaterAlert[]
}

export async function getWaterAlert(id: number): Promise<WaterAlert | null> {
  const { data, error } = await supabase
    .from('montreal_water_alerts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as WaterAlert | null
}

export async function getWaterAlertStats(): Promise<WaterAlertStats> {
  const { data, error } = await supabase.rpc('get_water_alert_stats')
  if (error) throw error
  return data as WaterAlertStats
}

export async function getWaterAlertBoroughs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('montreal_water_alerts')
    .select('borough')
    .not('borough', 'is', null)
    .order('borough')

  if (error) throw error

  const unique = [...new Set((data ?? []).map((r) => r.borough as string))]
  return unique
}
