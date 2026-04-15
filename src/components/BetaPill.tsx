/**
 * Small β badge. Use on any value that comes from the experimental ML classifier
 * (signal_type, fixture_name, cosine_distance buckets). Never use on values from
 * the authoritative `fixtures` or `sensor` tables.
 */
export default function BetaPill({ title }: { title?: string }) {
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/50"
      title={title ?? 'Experimental: derived from the ML classifier. May be inaccurate.'}
    >
      Beta
    </span>
  )
}
