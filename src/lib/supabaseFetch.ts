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

const PAGE_SIZE = 1000
const MAX_CONCURRENCY = 20

/**
 * Fetch a single time-range page by page until all rows are retrieved.
 * Returns every row in the window — no silent truncation.
 */
async function fetchChunkAllPages<T>(
  table: string,
  select: string,
  timeColumn: string,
  cStart: string,
  cEnd: string,
  isLast: boolean,
  extraFilters: (query: any) => any,
): Promise<T[]> {
  const allRows: T[] = []
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .gte(timeColumn, cStart)
      .order(timeColumn, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    query = isLast ? query.lte(timeColumn, cEnd) : query.lt(timeColumn, cEnd)
    query = extraFilters(query)

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as T[]
    allRows.push(...rows)

    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allRows
}

/**
 * Run an array of async tasks with at most `limit` in flight at once.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++
      results[i] = await tasks[i]!()
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    worker(),
  )
  await Promise.all(workers)
  return results
}

/**
 * Fetch time-series rows by splitting the window into parallel chunks.
 * Each chunk is fully paginated so no rows are silently dropped.
 *
 * Default chunk size: 1 day.  Concurrency is capped at MAX_CONCURRENCY so
 * even large ranges don't overwhelm the browser / server.
 *
 * For a 15-min range this is just 1 chunk (1–few requests).
 * For 28 days this is 28 chunks running 20-at-a-time, each paginating
 * internally — far fewer connections than the old 90-second chunk approach.
 */
export async function fetchTimeSeriesRows<T = Record<string, unknown>>(
  table: string,
  select: string,
  timeColumn: string,
  since: string,
  until: string,
  extraFilters: (query: any) => any,
  chunkMs = 86_400_000, // 1 day
): Promise<T[]> {
  const sinceMs = new Date(since).getTime()
  const untilMs = new Date(until).getTime()
  if (untilMs <= sinceMs) return []

  const numChunks = Math.max(1, Math.ceil((untilMs - sinceMs) / chunkMs))

  const tasks = Array.from({ length: numChunks }, (_, i) => {
    const cStart = new Date(sinceMs + i * chunkMs).toISOString()
    const cEnd = new Date(
      Math.min(sinceMs + (i + 1) * chunkMs, untilMs),
    ).toISOString()
    const isLast = i === numChunks - 1

    return () =>
      fetchChunkAllPages<T>(
        table,
        select,
        timeColumn,
        cStart,
        cEnd,
        isLast,
        extraFilters,
      )
  })

  const chunks = await runWithConcurrency(tasks, MAX_CONCURRENCY)
  const all: T[] = []
  for (const chunk of chunks) all.push(...chunk)
  return all
}
