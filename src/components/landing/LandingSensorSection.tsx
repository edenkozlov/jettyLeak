import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const SENSOR_POINT_KEYS = ['tracking', 'fixture', 'insights'] as const

const SENSOR_POINT_ICONS: Record<(typeof SENSOR_POINT_KEYS)[number], ReactNode> = {
  tracking: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  fixture: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="2" x2="9" y2="4" />
      <line x1="15" y1="2" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="22" />
      <line x1="15" y1="20" x2="15" y2="22" />
      <line x1="20" y1="9" x2="22" y2="9" />
      <line x1="20" y1="14" x2="22" y2="14" />
      <line x1="2" y1="9" x2="4" y2="9" />
      <line x1="2" y1="14" x2="4" y2="14" />
    </>
  ),
  insights: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

export function LandingSensorSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-emerald-600 uppercase">
            {t('sensor.eyebrow')}
          </p>
          <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[46px]">
            {t('sensor.title')}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:mt-4 sm:text-[16px]">
            {t('sensor.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4">
          {SENSOR_POINT_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 text-center sm:p-6"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {SENSOR_POINT_ICONS[key]}
                </svg>
              </div>
              <h3 className="mt-4 text-[14px] font-semibold text-gray-900">
                {t(`sensor.points.${key}.title`)}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                {t(`sensor.points.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
