import { supabase } from '@/lib/supabase'

export async function GET_BUILDINGS() {
  const { data, error } = await supabase
    .from('building')
    .select('*, client(*)')
    .order('created_at', { ascending: false })
  if (error) throw error

  // Fetch sensor counts per building in a single query
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
