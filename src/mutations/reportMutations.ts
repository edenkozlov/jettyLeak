import { supabase } from '@/lib/supabase'

export async function CREATE_REPORT(variables?: Record<string, unknown>) {
  const { sensor_id, flow_value, temp_value } = variables ?? {}
  const { data, error } = await supabase
    .from('report')
    .insert({ sensor_id, flow_value, temp_value })
    .select('id, created_at, sensor_id, flow_value, temp_value')
    .single()
  if (error) throw error
  return { insert_report_one: data }
}

export async function DELETE_REPORT(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('report')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_report_by_pk: data }
}
