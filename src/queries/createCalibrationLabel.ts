import { supabase } from '@/lib/supabase'

export async function createCalibrationLabels(params: {
  startTime: string
  endTime: string
  fixtures: Array<{ fixtureId: number; ordering: number }>
}): Promise<{ ids: number[] }> {
  const rows = params.fixtures.map((f) => ({
    start_time: params.startTime,
    end_time: params.endTime,
    fixture_id: f.fixtureId,
    ordering: f.ordering,
  }))

  const { data, error } = await supabase
    .from('calibration_label')
    .insert(rows)
    .select('id')

  if (error) throw error
  return { ids: (data ?? []).map((r) => (r as { id: number }).id) }
}
