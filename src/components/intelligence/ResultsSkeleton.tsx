import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STEP_KEYS = ['collecting', 'heuristics', 'scoring'] as const

interface ResultsSkeletonProps {
  /** When true, cycles through progress steps. */
  active: boolean
}

export function ResultsSkeleton({ active }: ResultsSkeletonProps) {
  const { t } = useTranslation('landing')
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (!active) {
      setStepIdx(0)
      return
    }
    const t1 = setTimeout(() => setStepIdx(1), 420)
    const t2 = setTimeout(() => setStepIdx(2), 840)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [active])

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-gray-200/70 bg-white/95 p-6 shadow-xl shadow-sky-500/5 sm:p-8"
      role="status"
      aria-live="polite"
    >
      {/* Top ambient shimmer */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-[50%] bg-sky-500/10 blur-3xl"
        aria-hidden
      />

      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
        </span>
        {t('intelligence.loading.title')}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center lg:mx-0">
          <div className="absolute inset-0 rounded-full border border-gray-100" />
          <div className="absolute inset-4 rounded-full border border-gray-100" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-sky-500/60 animate-spin"
            style={{ animationDuration: '1.6s' }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              {t('intelligence.loading.estimating')}
            </span>
            <span className="mt-1 text-[44px] font-bold leading-none text-gray-300 tabular-nums">—</span>
          </div>
        </div>

        <ol className="space-y-3">
          {STEP_KEYS.map((key, i) => {
            const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
            return (
              <li
                key={key}
                className={[
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                  state === 'done'
                    ? 'border-emerald-200/70 bg-emerald-50/60 text-emerald-800'
                    : state === 'active'
                    ? 'border-sky-200/70 bg-sky-50/60 text-sky-800'
                    : 'border-gray-200/70 bg-gray-50/60 text-gray-500',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    state === 'done'
                      ? 'bg-emerald-500 text-white'
                      : state === 'active'
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-200 text-gray-500',
                  ].join(' ')}
                >
                  {state === 'done' ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  ) : state === 'active' ? (
                    <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="text-[13px] font-medium">
                  {t(`intelligence.loading.steps.${key}`)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Skeleton rows */}
      <div className="mt-6 space-y-2">
        <div className="h-3 w-1/3 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent animate-[shimmer-sweep_1.6s_infinite]" />
        </div>
        <div className="h-3 w-2/3 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent animate-[shimmer-sweep_1.6s_infinite]" />
        </div>
      </div>
    </div>
  )
}
