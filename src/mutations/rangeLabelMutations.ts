import { supabase } from '@/lib/supabase'

export async function INSERT_RANGE_LABEL(variables?: Record<string, unknown>) {
  const { sensor, start_date, end_date, label } = variables ?? {}
  const { data, error } = await supabase
    .from('range_label')
    .insert({ sensor, start_date, end_date, label })
    .select('id, created_at, start_date, end_date, label, sensor')
    .single()
  if (error) throw error
  return { insert_range_label_one: data }
}

export async function DELETE_RANGE_LABEL(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('range_label')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_range_label_by_pk: data }
}
