import { supabase } from '@/lib/supabase'

/**
 * Fetch rows matching filters. Single request, no pagination.
 * Use for small result sets (buildings, clients, sensors).
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  select: string,
  filters: (query: any) => any,
  orderColumn = 'created_at',
  orderAscending = true,
): Promise<T[]> {
  let query = supabase
    .from(table)
    .select(select)
    .order(orderColumn, { ascending: orderAscending })

  query = filters(query)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as T[]
}

/**
 * Fetch time-series rows by splitting the time window into parallel chunks.
 * Each chunk is ONE request (no inner pagination loop).
 *
 * At 10Hz, 90 seconds = 900 rows which fits in Supabase's 1000 row limit.
 * 15 min = 10 chunks = 10 parallel requests.
 * 1 hour = 40 chunks = 40 parallel requests.
 */
export async function fetchTimeSeriesRows<T = Record<string, unknown>>(
  table: string,
  select: string,
  timeColumn: string,
  since: string,
  until: string,
  extraFilters: (query: any) => any,
  chunkMs = 90_000,
): Promise<T[]> {
  const sinceMs = new Date(since).getTime()
  const untilMs = new Date(until).getTime()
  if (untilMs <= sinceMs) return []

  const numChunks = Math.max(1, Math.ceil((untilMs - sinceMs) / chunkMs))

  const chunkPromises: Promise<T[]>[] = []
  for (let i = 0; i < numChunks; i++) {
    const cStart = new Date(sinceMs + i * chunkMs).toISOString()
    const cEnd = new Date(Math.min(sinceMs + (i + 1) * chunkMs, untilMs)).toISOString()
    const isLast = i === numChunks - 1

    chunkPromises.push(
      (async () => {
        let query = supabase
          .from(table)
          .select(select)
          .gte(timeColumn, cStart)
          .order(timeColumn, { ascending: true })

        query = isLast ? query.lte(timeColumn, cEnd) : query.lt(timeColumn, cEnd)
        query = extraFilters(query)

        const { data, error } = await query
        if (error) throw error
        return (data ?? []) as T[]
      })(),
    )
  }

  const chunks = await Promise.all(chunkPromises)
  const all: T[] = []
  for (const chunk of chunks) all.push(...chunk)
  return all
}
