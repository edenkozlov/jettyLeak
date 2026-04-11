import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import leakImg from '@/assets/iphone2.png'

const DASHBOARD_ITEM_KEYS = [
  'usage',
  'breakdown',
  'flagged',
  'performance',
  'savings',
  'portfolio',
] as const

const DASHBOARD_ITEM_ICONS: Record<(typeof DASHBOARD_ITEM_KEYS)[number], ReactNode> = {
  usage: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  breakdown: (
    <>
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </>
  ),
  flagged: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  performance: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  savings: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </>
  ),
  portfolio: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
}

export function LandingDashboardSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(14,165,233,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.04),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          <div className="relative mx-auto lg:mx-0">
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-indigo-100/60 via-cyan-100/40 to-emerald-50/60 blur-2xl sm:-inset-8" />
            <img
              src={leakImg}
              alt={t('dashboard.telemetryAlt')}
              className="relative mx-auto w-52 rounded-[2rem] shadow-2xl sm:w-60 lg:w-64"
            />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-500 uppercase">
              {t('dashboard.eyebrow')}
            </p>
            <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[42px]">
              {t('dashboard.title')}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
              {t('dashboard.subtitle')}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {DASHBOARD_ITEM_KEYS.map((key) => (
                <div key={key}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {DASHBOARD_ITEM_ICONS[key]}
                    </svg>
                  </div>
                  <h3 className="mt-2 text-[13px] font-semibold text-gray-900">
                    {t(`dashboard.items.${key}.title`)}
                  </h3>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                    {t(`dashboard.items.${key}.desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
