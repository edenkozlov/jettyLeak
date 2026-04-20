import { useTranslation } from 'react-i18next'

import type { CategoryScore } from '@/lib/scoring'

interface CategoryScoreCardProps {
  category: CategoryScore
  index?: number
}

function toneFor(score: number) {
  if (score >= 9) return { dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'excellent' as const }
  if (score >= 7) return { dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-600', label: 'good' as const }
  if (score >= 5) return { dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-600', label: 'watch' as const }
  return { dot: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-600', label: 'action' as const }
}

export function CategoryScoreCard({ category, index = 0 }: CategoryScoreCardProps) {
  const { t } = useTranslation('landing')
  const tone = toneFor(category.score)

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/5"
      style={{
        animation: 'fade-scale 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        animationDelay: `${80 + index * 55}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            {t(`intelligence.categories.${category.key}.eyebrow`)}
          </p>
          <h3 className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">
            {t(`intelligence.categories.${category.key}.title`)}
          </h3>
        </div>
        <div className="flex items-baseline gap-0.5 font-sans">
          <span className={`text-[28px] font-bold leading-none tabular-nums ${tone.text}`}>
            {category.score}
          </span>
          <span className="text-[12px] font-medium text-gray-400">/10</span>
        </div>
      </div>

      {/* Segmented 10-step bar */}
      <div className="mt-4 flex gap-1" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < category.score
          return (
            <span
              key={i}
              className={[
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                filled ? tone.bar : 'bg-gray-100',
              ].join(' ')}
              style={{
                transitionDelay: `${index * 55 + i * 30}ms`,
              }}
            />
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.16em] ${tone.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {t(`intelligence.bands.${tone.label}`)}
        </span>
        <span className="text-gray-400">
          {t('intelligence.results.confidenceShort', { pct: Math.round(category.confidence * 100) })}
        </span>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-gray-600">
        {t(`intelligence.categories.${category.key}.rationale.${category.rationaleKey}`, {
          defaultValue: t(`intelligence.categories.${category.key}.rationale.default`),
        })}
      </p>
    </div>
  )
}
