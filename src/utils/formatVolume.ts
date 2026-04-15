/**
 * Shared formatting helpers for water volume + relative time.
 * Volume is stored in litres throughout the app (derived from sensor multiplier
 * via flowComputation.ts — see that file for the canonical math).
 */

export function formatLitres(litres: number): string {
  if (!Number.isFinite(litres) || litres <= 0) return '0'
  if (litres >= 1_000_000) return `${(litres / 1_000_000).toFixed(2)}M`
  if (litres >= 10_000) return `${(litres / 1000).toFixed(0)}k`
  if (litres >= 1000) return `${(litres / 1000).toFixed(1)}k`
  if (litres >= 100) return litres.toFixed(0)
  return litres.toFixed(1)
}

export function formatLitresUnit(litres: number): string {
  if (Math.abs(litres) >= 1000) return 'kL'
  return 'L'
}

export function formatDelta(a: number, b: number): {
  text: string
  sign: 'up' | 'down' | 'flat'
} {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) {
    return { text: '—', sign: 'flat' }
  }
  const pct = ((a - b) / b) * 100
  if (Math.abs(pct) < 1) return { text: 'flat vs yesterday', sign: 'flat' }
  const sign = pct > 0 ? 'up' : 'down'
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}% vs yesterday`, sign }
}

/**
 * Compact relative time e.g. "2m ago", "3h ago", "yesterday", "3d ago".
 * Null-safe: returns "—" for null/invalid input.
 */
export function formatRelative(iso: string | null | undefined, nowMs = Date.now()): string {
  if (!iso) return '—'
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return '—'
  const diffSec = Math.max(0, Math.round((nowMs - ts) / 1000))
  if (diffSec < 45) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.round(diffH / 24)
  if (diffD === 1) return 'yesterday'
  if (diffD < 7) return `${diffD}d ago`
  if (diffD < 30) return `${Math.round(diffD / 7)}w ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
