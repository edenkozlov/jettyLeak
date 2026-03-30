import { supabase } from '@/lib/supabase'

/**
 * Fetch rows from a Supabase table with filters, ordering, and a high limit.
 *
 * NOTE: Supabase has a server-side max-rows setting (default 1000).
 * Set it to 50000+ in the Supabase dashboard under Settings > API > Max Rows.
 * This function does NOT paginate — it sends a single request with a large limit.
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
    .limit(50000)

  query = filters(query)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as T[]
}
