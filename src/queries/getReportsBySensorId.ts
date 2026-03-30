import { fetchAllRows } from '@/lib/supabaseFetch'

export async function GET_REPORTS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string

  const data = await fetchAllRows(
    'report',
    'id, created_at, sensor_id, flow_value, temp_value',
    (q: any) => q.eq('sensor_id', sensorId).gte('created_at', since).lte('created_at', until),
  )

  return { report: data }
}
