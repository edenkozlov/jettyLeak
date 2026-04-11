import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  CompareNav,
  CompareFaq,
  FaqSchema,
  BreadcrumbSchema,
  usePageSeo,
  COMPARISON_ROUTE_ENTRIES,
  HUB_PATH,
} from '@/components/ComparePageShell'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

type HubCategory = { title: string; description: string }
type HubSystem = { name: string; summary: string; path: string; tags: string[] }
type HubArticle = { to: string; title: string; desc: string }
type FaqItem = { q: string; a: string }

export default function WaterMonitoringSystems() {
  const { t: tHub, i18n } = useTranslation('comparePages')
  const { t: tLanding } = useTranslation('landing')

  const categories = useMemo(
    () => tHub('hub.categories', { returnObjects: true }) as HubCategory[],
    [tHub, i18n.resolvedLanguage],
  )
  const systems = useMemo(
    () => tHub('hub.systems', { returnObjects: true }) as HubSystem[],
    [tHub, i18n.resolvedLanguage],
  )
  const articles = useMemo(
    () => tHub('hub.articles', { returnObjects: true }) as HubArticle[],
    [tHub, i18n.resolvedLanguage],
  )
  const faqItems = useMemo(() => tHub('hub.faq', { returnObjects: true }) as FaqItem[], [tHub, i18n.resolvedLanguage])

  usePageSeo({
    title: tHub('hub.pageTitle'),
    description: tHub('hub.metaDescription'),
    canonicalPath: HUB_PATH,
  })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">{tHub('hub.heroEyebrow')}</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            {tHub('hub.heroTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
            {tHub('hub.heroSubtitle')}
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>{tHub('hub.introP1')}</p>
              <p>{tHub('hub.introP2')}</p>
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              {tHub('hub.categoriesTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              {tHub('hub.categoriesSubtitle')}
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              {categories.map((cat) => (
                <div
                  key={`${i18n.resolvedLanguage}-${cat.title}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">{cat.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{cat.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              {tHub('hub.systemsTitle')}
            </h2>
            <div className="mx-auto mt-10 max-w-3xl space-y-6">
              {systems.map((sys) => (
                <div
                  key={sys.path}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[17px] font-bold text-gray-900 sm:text-[19px]">{sys.name}</h3>
                    {sys.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{sys.summary}</p>
                  <Link
                    to={sys.path}
                    className="mt-4 inline-block text-[14px] font-medium text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 transition hover:decoration-indigo-600"
                  >
                    {sys.name === 'Beluga'
                      ? tLanding('compare.learnBeluga')
                      : tLanding('compare.compareVsName', { name: sys.name })}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              {tHub('hub.detailedTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              {tHub('hub.detailedSubtitle')}
            </p>
            <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-4">
              {COMPARISON_ROUTE_ENTRIES.map((c) => (
                <Link
                  key={c.path}
                  to={c.path}
                  className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
                >
                  {tLanding(c.labelKey)}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              {tHub('hub.articlesTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              {tHub('hub.articlesSubtitle')}
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-4">
              {articles.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-8"
                >
                  <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">{a.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{a.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          <CompareFaq items={faqItems} />
        </div>

        <section className="mt-16 border-t border-gray-100 pt-14 sm:mt-24 sm:pt-18">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{tHub('shell.hubCtaTitle')}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">{tHub('shell.hubCtaSubtitle')}</p>
            <Link
              to="/quote"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 hover:shadow-xl"
            >
              {tHub('shell.ctaButton')}
            </Link>
          </div>
        </section>
      </article>

      <FaqSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: tHub('shell.breadcrumbHome'), path: '/' },
          { name: tHub('shell.breadcrumbHub'), path: HUB_PATH },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
