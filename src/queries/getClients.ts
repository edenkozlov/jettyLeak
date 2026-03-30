import { supabase } from '@/lib/supabase'

export async function GET_CLIENTS() {
  const { data, error } = await supabase
    .from('client')
    .select('id, created_at, email, first_name, last_name, building(id, bhi, bhi_label, sensor(id))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return {
    client: (data ?? []).map((c: any) => ({
      ...c,
      buildings_aggregate: { aggregate: { count: c.building?.length ?? 0 } },
      buildings: (c.building ?? []).map((b: any) => ({
        ...b,
        sensors_aggregate: { aggregate: { count: b.sensor?.length ?? 0 } },
        sensor: undefined,
      })),
      building: undefined,
    })),
  }
}
