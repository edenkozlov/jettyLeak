import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function InterestSection() {
  const { t } = useTranslation('landing')

  return (
    <section id="interested" className="bg-white px-4 pt-12 pb-20 sm:px-0 sm:pt-16 sm:pb-28">
      <div className="mx-auto max-w-5xl sm:px-6">
        <div className="relative overflow-hidden rounded-[20px] bg-gray-950 px-6 py-14 text-center sm:rounded-[28px] sm:px-16 sm:py-20">
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px] animate-glow-pulse" />
          <div
            className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px] animate-glow-pulse"
            style={{ animationDelay: '2s' }}
          />

          <div className="relative">
            <h2 className="text-[26px] leading-tight font-bold tracking-tight text-white sm:text-[34px] md:text-[46px]">
              {t('interest.titleLine1')}
              <br className="hidden sm:block" /> {t('interest.titleLine2')}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] text-white/40 sm:mt-4 sm:text-[15px]">
              {t('interest.subtitle')}
            </p>
            <Link
              to="/quote"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 hover:shadow-xl sm:mt-10"
            >
              {t('interest.cta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
