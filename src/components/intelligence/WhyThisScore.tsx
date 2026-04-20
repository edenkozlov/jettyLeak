import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PropertyScore } from '@/lib/scoring'

interface WhyThisScoreProps {
  result: PropertyScore
}

export function WhyThisScore({ result }: WhyThisScoreProps) {
  const { t } = useTranslation('landing')
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </span>
          <span className="text-[14px] font-semibold text-gray-900">
            {t('intelligence.why.title')}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-relaxed text-gray-600">
            {t('intelligence.why.intro')}
          </p>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            {t('intelligence.why.signalsHeading')}
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {result.signalKeys.map((key) => (
              <li
                key={key}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[12px] font-medium text-gray-700"
              >
                {t(`intelligence.signals.${key}`, { defaultValue: key })}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            {t('intelligence.why.categoriesHeading')}
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {result.categories.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-gray-600">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span>
                  <span className="font-semibold text-gray-800">
                    {t(`intelligence.categories.${c.key}.title`)}:
                  </span>{' '}
                  {t(`intelligence.categories.${c.key}.rationale.${c.rationaleKey}`, {
                    defaultValue: t(`intelligence.categories.${c.key}.rationale.default`),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
