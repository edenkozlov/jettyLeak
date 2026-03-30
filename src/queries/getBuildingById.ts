import { supabase } from '@/lib/supabase'

export async function GET_BUILDING_BY_ID(variables?: Record<string, unknown>) {
  const id = variables?.id

  const { data: building, error } = await supabase
    .from('building')
    .select('*, client(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  if (!building) return { building_by_pk: null }

  const [sensorsRes, fixturesRes] = await Promise.all([
    supabase
      .from('sensor')
      .select('id, name, location, floor_number, location_on_floor, area_covered')
      .eq('building_id', id),
    supabase
      .from('fixtures')
      .select('id, created_at, type, floor_number, location_on_floor, sensor_id')
      .eq('building_id', id),
  ])

  return {
    building_by_pk: {
      ...building,
      sensors: sensorsRes.data ?? [],
      fixtures: fixturesRes.data ?? [],
    },
  } as any
}
