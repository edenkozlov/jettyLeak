interface CacheEntry {
  data: unknown
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL_MS = 60_000

function makeKey(query: string, variables: Record<string, unknown>): string {
  return query.replace(/\s+/g, ' ').trim() + '|' + JSON.stringify(variables)
}

export function getCached<T>(
  query: string,
  variables: Record<string, unknown>,
  ttlMs = DEFAULT_TTL_MS,
): T | undefined {
  const key = makeKey(query, variables)
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(key)
    return undefined
  }
  return entry.data as T
}

export function setCache(
  query: string,
  variables: Record<string, unknown>,
  data: unknown,
): void {
  cache.set(makeKey(query, variables), { data, timestamp: Date.now() })
}

export function invalidateCache(
  query: string,
  variables: Record<string, unknown>,
): void {
  cache.delete(makeKey(query, variables))
}

/**
 * Deduplicates identical in-flight requests. If a fetch for the same
 * query + variables is already running, returns the existing promise
 * instead of firing a second network call.
 */
export function dedupeInflight<T>(
  query: string,
  variables: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const key = makeKey(query, variables)
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>

  const promise = fn().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}
