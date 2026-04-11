import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LandingLanguageSwitch } from '@/components/landing/LandingLanguageSwitch'
import { SiteFooter } from '@/components/SiteFooter'
import cs1 from '@/assets/CS1.jpg'
import cs2 from '@/assets/CS2.jpg'
import cs3 from '@/assets/CS3.jpg'
import cs4 from '@/assets/CS4.jpg'
import cs5 from '@/assets/CS5.jpg'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const strongCls = 'font-semibold text-gray-900'

export default function CaseStudy() {
  const { t } = useTranslation('landing')
  useDocumentMeta(t('caseStudy.pageTitle'), t('caseStudy.metaDescription'))

  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <LandingLanguageSwitch />
            <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
              {t('footer.links.home')}
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
            >
              {t('caseStudy.getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">{t('caseStudy.eyebrow')}</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            {t('caseStudy.heroTitle')}
          </h1>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.spark.title')}</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>{t('caseStudy.spark.p1')}</p>
              <p>
                <Trans
                  i18nKey="caseStudy.spark.p2"
                  ns="landing"
                  components={{ strong: <strong className={strongCls} /> }}
                />
              </p>
              <p>{t('caseStudy.spark.p3')}</p>
            </div>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
            <figure>
              <img src={cs1} alt={t('caseStudy.prototype.imgAlt')} className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-left">{t('caseStudy.prototype.caption')}</figcaption>
            </figure>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.prototype.title')}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>{t('caseStudy.prototype.p1')}</p>
              </div>
            </div>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-[1fr_280px] lg:gap-14">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.calibration.title')}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>{t('caseStudy.calibration.p1')}</p>
                <p>{t('caseStudy.calibration.p2')}</p>
                <p className="text-lg font-semibold text-gray-900 sm:text-xl">{t('caseStudy.calibration.highlight')}</p>
                <p>{t('caseStudy.calibration.p3')}</p>
                <p>{t('caseStudy.calibration.p4')}</p>
              </div>
            </div>
            <figure className="order-first lg:order-last">
              <img src={cs2} alt={t('caseStudy.calibration.imgAlt')} className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-right">{t('caseStudy.calibration.caption')}</figcaption>
            </figure>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
            <figure>
              <img src={cs3} alt={t('caseStudy.findingSource.imgAlt')} className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-left">{t('caseStudy.findingSource.caption')}</figcaption>
            </figure>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.findingSource.title')}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>{t('caseStudy.findingSource.p1')}</p>
                <p>{t('caseStudy.findingSource.p2')}</p>
              </div>
            </div>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-[1fr_280px] lg:gap-14">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.validation.title')}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>{t('caseStudy.validation.p1')}</p>
                <p>{t('caseStudy.validation.p2')}</p>
              </div>
            </div>
            <figure className="order-first lg:order-last">
              <img src={cs4} alt={t('caseStudy.validation.imgAlt')} className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-right">{t('caseStudy.validation.caption')}</figcaption>
            </figure>
          </section>

          <section className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
            <figure>
              <img src={cs5} alt={t('caseStudy.mitigation.imgAlt')} className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-left">{t('caseStudy.mitigation.caption')}</figcaption>
            </figure>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.mitigation.title')}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>{t('caseStudy.mitigation.p1')}</p>
                <p>{t('caseStudy.mitigation.p2')}</p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('caseStudy.whyMattered.title')}</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>{t('caseStudy.whyMattered.p1')}</p>
              <p>
                <Trans
                  i18nKey="caseStudy.whyMattered.p2"
                  ns="landing"
                  components={{ strong: <strong className={strongCls} /> }}
                />
              </p>
              <p>{t('caseStudy.whyMattered.p3')}</p>
              <p>
                <Trans
                  i18nKey="caseStudy.whyMattered.p4"
                  ns="landing"
                  components={{ strong: <strong className={strongCls} /> }}
                />
              </p>
              <p>{t('caseStudy.whyMattered.p5')}</p>
            </div>
          </section>
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 border-t border-gray-100 pt-16 text-center sm:mt-24 sm:pt-20">
          <Link
            to="/"
            className="rounded-full border border-gray-200 px-8 py-3.5 text-center text-sm font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
          >
            {t('nav.backHome')}
          </Link>
        </div>
      </article>

      <SiteFooter variant="page" />

      <ScrollToTopButton />
    </div>
  )
}
