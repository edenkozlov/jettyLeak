import type { ReactNode } from 'react'

/**
 * Shared visual for fixture types. Keep all fixture-type visuals in one place
 * so the Overview, Fixtures page, Building Detail, and Activity feed all
 * render the same icon/colour for the same type.
 */

export interface FixtureTypeStyle {
  /** Tailwind classes for a muted icon-chip background + fg. */
  chip: string
  /** Hex (or tw token) for a solid accent dot — used in timelines. */
  accent: string
  icon: ReactNode
}

const stroke = 1.6

const ICONS: Record<string, ReactNode> = {
  Toilet: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v8a5 5 0 01-5 5h-2a5 5 0 01-5-5V3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 16l-1 5h8l-1-5" />
    </svg>
  ),
  Sink: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16v4a4 4 0 01-4 4H8a4 4 0 01-4-4v-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11V6a2 2 0 012-2h3" />
      <circle cx={12} cy={11} r={0.8} fill="currentColor" />
    </svg>
  ),
  Urinal: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v9a5 5 0 01-10 0V4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 18v3m4-3v3M9 4V2m6 2V2" />
    </svg>
  ),
  Shower: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h14a0 0 0 010 0v0a0 0 0 01-14 0v0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10l-1 3m3-3v3m3-3v3m3-3v3m3-3l1 3M12 16v4M9 18v3m6-3v3" />
    </svg>
  ),
  Dishwasher: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <rect x={4} y={3} width={16} height={18} rx={2} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16" />
      <circle cx={8} cy={5.5} r={0.8} fill="currentColor" />
      <circle cx={11} cy={5.5} r={0.8} fill="currentColor" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12v5m6-5v5" />
    </svg>
  ),
  Washer: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <rect x={4} y={3} width={16} height={18} rx={2} />
      <circle cx={12} cy={14} r={4} />
      <circle cx={8} cy={6} r={0.8} fill="currentColor" />
      <circle cx={11} cy={6} r={0.8} fill="currentColor" />
    </svg>
  ),
  Faucet: (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v4m8-4v4M5 9h14v3a7 7 0 01-14 0V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19v3" />
    </svg>
  ),
  'Main line': (
    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h12a3 3 0 013 3v4a3 3 0 003 3h0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
    </svg>
  ),
}

const COLORS: Record<string, { chip: string; accent: string }> = {
  Toilet: {
    chip: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
    accent: '#0ea5e9',
  },
  Sink: {
    chip: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    accent: '#14b8a6',
  },
  Urinal: {
    chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    accent: '#6366f1',
  },
  Shower: {
    chip: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
    accent: '#06b6d4',
  },
  Dishwasher: {
    chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    accent: '#10b981',
  },
  Washer: {
    chip: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    accent: '#a855f7',
  },
  Faucet: {
    chip: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    accent: '#f59e0b',
  },
  'Main line': {
    chip: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    accent: '#f43f5e',
  },
}

const DEFAULT_COLOR = {
  chip: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  accent: '#9ca3af',
}

const DEFAULT_ICON: ReactNode = (
  <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={stroke}>
    <circle cx={12} cy={12} r={9} />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
  </svg>
)

export function fixtureTypeStyle(type: string): FixtureTypeStyle {
  const color = COLORS[type] ?? DEFAULT_COLOR
  const icon = ICONS[type] ?? DEFAULT_ICON
  return { chip: color.chip, accent: color.accent, icon }
}

/**
 * Small square icon chip. `size` is a Tailwind size class like "h-8 w-8".
 */
export default function FixtureTypeIcon({
  type,
  size = 'h-9 w-9',
  padding = 'p-2',
}: {
  type: string
  size?: string
  padding?: string
}) {
  const style = fixtureTypeStyle(type)
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg ${size} ${padding} ${style.chip}`}>
      {style.icon}
    </div>
  )
}
