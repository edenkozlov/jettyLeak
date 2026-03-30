import { supabase } from '@/lib/supabase'

export async function GET_BUILDINGS_BY_CLIENT_ID(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId
  const { data, error } = await supabase
    .from('building')
    .select('*, client(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const buildingIds = (data ?? []).map((b: any) => b.id)
  let sensorCounts: Record<number, number> = {}
  if (buildingIds.length > 0) {
    const { data: sensors } = await supabase
      .from('sensor')
      .select('building_id')
      .in('building_id', buildingIds)
    if (sensors) {
      for (const s of sensors) {
        sensorCounts[s.building_id] = (sensorCounts[s.building_id] ?? 0) + 1
      }
    }
  }

  return {
    building: (data ?? []).map((b: any) => ({
      ...b,
      sensors_aggregate: { aggregate: { count: sensorCounts[b.id] ?? 0 } },
    })),
  } as any
}
