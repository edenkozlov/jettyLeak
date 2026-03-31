import { fetchTimeSeriesRows } from '@/lib/supabaseFetch'

export async function GET_REPORTS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string

  const data = await fetchTimeSeriesRows(
    'report',
    'id, created_at, sensor_id, flow_value, temp_value',
    'created_at', since, until,
    (q: any) => q.eq('sensor_id', sensorId),
  )

  return { report: data } as any
}
