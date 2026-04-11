import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  CompareNav,
  CompareHero,
  CompareTable,
  CompareFaq,
  CompareDisclaimer,
  CompareCta,
  CompareOtherSystems,
  RelatedQuestions,
  FaqSchema,
  BreadcrumbSchema,
  usePageSeo,
  Bullet,
  HUB_PATH,
} from '@/components/ComparePageShell'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const CANONICAL = '/wint-alternative'
const P = 'wint' as const

type TableRow = { feature: string; beluga: string; competitor: string }
type FaqItem = { q: string; a: string }
type Rec = { to: string; title: string; desc: string }

export default function CompareWint() {
  const { t, i18n } = useTranslation('comparePages')

  const tableRows = useMemo(
    () => t(`${P}.tableRows`, { returnObjects: true }) as TableRow[],
    [t, i18n.resolvedLanguage],
  )
  const faqItems = useMemo(() => t(`${P}.faq`, { returnObjects: true }) as FaqItem[], [t, i18n.resolvedLanguage])
  const relatedQuestions = useMemo(
    () => t(`${P}.relatedQuestions`, { returnObjects: true }) as string[],
    [t, i18n.resolvedLanguage],
  )
  const whenCompetitorBullets = useMemo(
    () => t(`${P}.whenCompetitorBullets`, { returnObjects: true }) as string[],
    [t, i18n.resolvedLanguage],
  )
  const whenBelugaBullets = useMemo(
    () => t(`${P}.whenBelugaBullets`, { returnObjects: true }) as string[],
    [t, i18n.resolvedLanguage],
  )
  const recommended = useMemo(() => t(`${P}.recommended`, { returnObjects: true }) as Rec[], [t, i18n.resolvedLanguage])

  usePageSeo({
    title: t(`${P}.pageTitle`),
    description: t(`${P}.metaDescription`),
    canonicalPath: CANONICAL,
  })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />
      <CompareHero h1={t(`${P}.heroH1`)} subtitle={t(`${P}.heroSubtitle`)} />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>{t(`${P}.introP1`)}</p>
              <p>{t(`${P}.introP2`)}</p>
            </div>
          </section>

          <CompareTable competitorLabel={t(`${P}.competitorLabel`)} rows={tableRows} />

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t(`${P}.midTitle`)}</h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">{t(`${P}.midLeftTitle`)}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{t(`${P}.midLeftP1`)}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{t(`${P}.midLeftP2`)}</p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">{t(`${P}.midRightTitle`)}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{t(`${P}.midRightP1`)}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{t(`${P}.midRightP2`)}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('shell.whenEachTitle')}</h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">{t(`${P}.whenCompetitorHeading`)}</h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  {whenCompetitorBullets.map((b) => (
                    <Bullet key={b}>{b}</Bullet>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">{t(`${P}.whenBelugaHeading`)}</h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  {whenBelugaBullets.map((b) => (
                    <Bullet key={b} variant="indigo">
                      {b}
                    </Bullet>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">{t('shell.aboutBelugaTitle')}</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>{t('shell.aboutStandardP1')}</p>
              <p>{t('shell.aboutWintP2')}</p>
            </div>
          </section>

          <CompareFaq items={faqItems} />
          <CompareDisclaimer competitorName={t(`${P}.disclaimerCompetitorName`)} />
        </div>

        <CompareCta competitorName={t(`${P}.ctaCompetitorName`)} competitorUrl="https://wint.ai/" />
        <RelatedQuestions questions={relatedQuestions} />
        <CompareOtherSystems currentPath={CANONICAL} />

        <section className="mt-16 sm:mt-20">
          <h2 className="text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">{t('shell.recommendedReading')}</h2>
          <div className="mt-5 space-y-3">
            {recommended.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5"
              >
                <p className="text-[15px] font-semibold text-gray-900">{r.title}</p>
                <p className="mt-1 text-[13px] text-gray-500">{r.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </article>

      <FaqSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: t('shell.breadcrumbHome'), path: '/' },
          { name: t('shell.breadcrumbHub'), path: HUB_PATH },
          { name: t(`${P}.breadcrumbVs`), path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
