import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const FEATURE_CARD_KEYS = [
  'fixturePerformance',
  'cost',
  'benchmarking',
  'warranty',
  'leak',
] as const

const FEATURE_CARD_META: Record<
  (typeof FEATURE_CARD_KEYS)[number],
  { icon: ReactNode; glow: string }
> = {
  fixturePerformance: {
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
    glow: 'bg-indigo-500/20',
  },
  cost: {
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </>
    ),
    glow: 'bg-blue-500/20',
  },
  benchmarking: {
    icon: (
      <>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </>
    ),
    glow: 'bg-cyan-500/20',
  },
  warranty: {
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    glow: 'bg-emerald-500/20',
  },
  leak: {
    icon: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    glow: 'bg-amber-500/20',
  },
}

export function LandingFeaturesSection() {
  const { t } = useTranslation('landing')

  return (
    <section
      id="features"
      className="relative bg-gray-950 pt-12 pb-20 text-white sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">
          {t('features.eyebrow')}
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-center text-[26px] leading-tight font-bold tracking-tight sm:mt-5 sm:text-[34px] md:text-[46px]">
          {t('features.titleLine1')}
          <br className="hidden sm:block" /> {t('features.titleLine2')}
        </h2>

        <div className="mt-12 flex flex-wrap justify-center gap-3 sm:mt-20 sm:gap-4">
          {FEATURE_CARD_KEYS.map((key) => {
            const f = FEATURE_CARD_META[key]
            const title = t(`features.cards.${key}.title`)
            return (
              <div
                key={key}
                className="group relative w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/10 hover:bg-white/[0.04] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]"
              >
                <div
                  className={`absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full ${f.glow} blur-2xl opacity-0 transition-opacity group-hover:opacity-100`}
                />
                <div className="relative">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <svg
                      className="h-5 w-5 text-white/60"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {f.icon}
                    </svg>
                  </div>
                  <h3 className="text-[15px] font-semibold">{title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/35">
                    {t(`features.cards.${key}.desc`)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
