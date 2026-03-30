import { supabase } from '@/lib/supabase'

export async function INSERT_SIGNAL(variables?: Record<string, unknown>) {
  const { sensor_id, start_time, end_time, value, time } = variables ?? {}
  const { data, error } = await supabase
    .from('signal')
    .insert({ sensor_id, start_time, end_time, value, time })
    .select('id, value, start_time, end_time, sensor_id, created_at, sensor(name)')
    .single()
  if (error) throw error
  return { insert_signal_one: data }
}

export async function DELETE_SIGNAL(variables?: Record<string, unknown>) {
  const { id } = variables ?? {}
  const { data, error } = await supabase
    .from('signal')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return { delete_signal_by_pk: data }
}

export async function UPDATE_PREDICTED_SIGNAL(variables?: Record<string, unknown>) {
  const { id, prediction } = variables ?? {}
  const { data, error } = await supabase
    .from('predicted_signal')
    .update({ prediction })
    .eq('id', id)
    .select('id, prediction')
    .single()
  if (error) throw error
  return { update_predicted_signal_by_pk: data }
}
