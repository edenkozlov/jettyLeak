import { useTranslation } from 'react-i18next'

interface ConfidenceBadgeProps {
  confidence: number
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { t } = useTranslation('landing')
  const pct = Math.round(confidence * 100)
  const tier = confidence >= 0.75 ? 'high' : confidence >= 0.55 ? 'medium' : 'low'

  const tone =
    tier === 'high'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tier === 'medium'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-amber-200 bg-amber-50 text-amber-700'

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        tone,
      ].join(' ')}
      title={t('intelligence.confidence.tooltip')}
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2 4 6v6c0 5 3.4 9.1 8 10 4.6-.9 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      {t(`intelligence.confidence.${tier}`)}
      <span className="ml-0.5 rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] tabular-nums">
        {pct}%
      </span>
    </span>
  )
}
