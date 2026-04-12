import { supabase } from '@/lib/supabase'

export interface HourlyAnalysis {
  id: number
  created_at: string
  description: string | null
  is_alert: boolean | null
  sensor_id: number | null
}

export async function getHourlyAnalysesBySensor(
  sensorId: number,
  limit = 100,
): Promise<HourlyAnalysis[]> {
  const { data, error } = await supabase
    .from('1h_analysis')
    .select('id, created_at, description, is_alert, sensor_id')
    .eq('sensor_id', sensorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as HourlyAnalysis[]
}
