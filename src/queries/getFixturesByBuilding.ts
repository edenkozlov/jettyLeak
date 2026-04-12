import { supabase } from '@/lib/supabase'

export interface Fixture {
  id: number
  created_at: string
  building_id: number | null
  floor_number: number | null
  type: string | null
  name: string | null
  sensor_id: number | null
}

export async function getFixturesByBuilding(
  buildingId: number,
): Promise<Fixture[]> {
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, created_at, building_id, floor_number, type, name, sensor_id')
    .eq('building_id', buildingId)
    .order('floor_number', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Fixture[]
}
