import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import heroVideo from '@/assets/water.mp4'
import { AddressAutocomplete } from '@/components/intelligence'
import type { MapboxFeature } from '@/lib/scoring'

export function LandingHero() {
  const { t } = useTranslation('landing')
  const navigate = useNavigate()

  const onSelect = (feature: MapboxFeature) => {
    navigate('/property-intelligence', { state: { feature } })
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-white">
      <video
        ref={(el) => {
          if (el && !el.dataset.started) {
            el.dataset.started = 'true'
            el.addEventListener(
              'loadedmetadata',
              () => {
                el.currentTime = el.duration * 0.1
              },
              { once: true },
            )
          }
        }}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      >
        <source src={heroVideo} type="video/mp4" />
      </video>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0)_0%,rgba(255,255,255,0.55)_70%,rgba(255,255,255,0.85)_100%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl -mt-10 px-4 pt-20 pb-16 sm:-mt-14 sm:px-6 sm:pt-24 sm:pb-20">
        <div className="flex flex-col items-center text-center">
          <h1
            className="max-w-4xl text-[36px] leading-[1.08] font-bold tracking-tight text-gray-900 animate-slide-up sm:text-5xl md:text-6xl lg:text-[72px]"
            style={{ animationDelay: '0.05s' }}
          >
            {t('hero.titleBefore')}{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>{' '}
            {t('hero.titleAfter')}
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl animate-slide-up text-[18px] font-medium leading-snug text-gray-700 sm:mt-7 sm:text-[20px] md:text-[22px]"
            style={{ animationDelay: '0.15s' }}
          >
            {t('hero.subtitle')}
          </p>

          <div
            className="mt-8 w-full max-w-2xl animate-slide-up"
            style={{ animationDelay: '0.25s' }}
          >
            <AddressAutocomplete
              onSelect={onSelect}
              variant="hero"
              placeholder={t('hero.searchPlaceholder')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
