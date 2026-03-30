import { supabase } from '@/lib/supabase'

export async function GET_BUILDINGS_BY_CLIENT_ID(variables?: Record<string, unknown>) {
  const clientId = variables?.clientId
  const { data, error } = await supabase
    .from('building')
    .select('id, created_at, name, full_address, latitude, longitude, client_id, bhi, bhi_label, number_of_floors, sensor(id), client(id, first_name, last_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return {
    building: (data ?? []).map((b: any) => ({
      ...b,
      sensors_aggregate: { aggregate: { count: b.sensor?.length ?? 0 } },
      sensor: undefined,
    })),
  }
}
