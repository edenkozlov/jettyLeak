import { supabase } from '@/lib/supabase'

export async function GET_CLIENTS() {
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const clientIds = (data ?? []).map((c: any) => c.id)

  let buildingsByClient: Record<string, any[]> = {}
  if (clientIds.length > 0) {
    const { data: buildings } = await supabase
      .from('building')
      .select('id, client_id, bhi, bhi_label')
      .in('client_id', clientIds)
    if (buildings) {
      for (const b of buildings) {
        if (!buildingsByClient[b.client_id]) buildingsByClient[b.client_id] = []
        buildingsByClient[b.client_id]!.push(b)
      }
    }
  }

  const allBuildingIds = Object.values(buildingsByClient).flat().map((b: any) => b.id)
  let sensorCountsByBuilding: Record<number, number> = {}
  if (allBuildingIds.length > 0) {
    const { data: sensors } = await supabase
      .from('sensor')
      .select('building_id')
      .in('building_id', allBuildingIds)
    if (sensors) {
      for (const s of sensors) {
        sensorCountsByBuilding[s.building_id] = (sensorCountsByBuilding[s.building_id] ?? 0) + 1
      }
    }
  }

  return {
    client: (data ?? []).map((c: any) => {
      const clientBuildings = buildingsByClient[c.id] ?? []
      return {
        ...c,
        buildings_aggregate: { aggregate: { count: clientBuildings.length } },
        buildings: clientBuildings.map((b: any) => ({
          ...b,
          sensors_aggregate: { aggregate: { count: sensorCountsByBuilding[b.id] ?? 0 } },
        })),
      }
    }),
  } as any
}
