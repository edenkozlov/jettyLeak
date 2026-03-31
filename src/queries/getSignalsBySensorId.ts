import { fetchTimeSeriesRows } from '@/lib/supabaseFetch'

export async function GET_SIGNALS_BY_SENSOR_ID(variables?: Record<string, unknown>) {
  const sensorId = variables?.sensorId
  const since = variables?.since as string
  const until = variables?.until as string

  const data = await fetchTimeSeriesRows(
    'signal',
    'id, created_at, value, time, sensor_id, start_time, end_time',
    'start_time', since, until,
    (q: any) => q.eq('sensor_id', sensorId),
  )

  return { signal: data } as any
}
