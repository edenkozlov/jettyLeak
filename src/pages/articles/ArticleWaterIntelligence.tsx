import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'waterIntelligence'

export default function ArticleWaterIntelligence() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero eyebrow={t('shared.labelArticle')} h1={t(`${P}.h1`)} subtitle={t(`${P}.subtitle`)} />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className={sectionCls}>
          <p className={pCls}>
            <Trans
              ns="articles"
              i18nKey={`${P}.intro.0`}
              components={{ strong: <strong className="text-gray-900" /> }}
            />
          </p>
          <p className={`${pCls} mt-4`}>{t(`${P}.intro.1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.intro.2`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.traditional.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.traditional.p1`)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.traditional.catLeak`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.traditional.catUsage`)}</p>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>{t(`${P}.traditional.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.traditional.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.traditional.p3`}
              components={[
                <Link key="0" to="/articles/4-types-of-water-monitoring-systems" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.whatMeans.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.whatMeans.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.whatMeans.p2`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.whatMeans.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whatMeans.list`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.dataToUnderstanding.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.dataToUnderstanding.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.dataToUnderstanding.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.dataToUnderstanding.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-2 text-center">
              <p className="text-[13px] text-gray-500">{t(`${P}.dataToUnderstanding.rawDataLabel`)}</p>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 px-4 py-2 text-center">
              <p className="text-[13px] font-medium text-indigo-700">{t(`${P}.dataToUnderstanding.insightLabel`)}</p>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.buildings.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.buildings.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.buildings.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.buildings.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.buildings.p3`}
              components={[
                <Link key="0" to="/articles/why-leak-detection-not-enough-commercial" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <p className={`${pCls} mt-4`}>{t(`${P}.buildings.p4`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.differsFromMonitoring.heading`)}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">
                {t(`${P}.differsFromMonitoring.monitoringLabel`)}
              </p>
              <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.differsFromMonitoring.monitoringQuestion`)}&rdquo;</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-indigo-500 uppercase">
                {t(`${P}.differsFromMonitoring.intelLabel`)}
              </p>
              <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.differsFromMonitoring.intelQuestion`)}&rdquo;</p>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.differsFromMonitoring.p1`}
              components={[
                <Link key="0" to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.valuable.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.valuable.p1`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.valuable.listAs`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.valuable.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.valuable.listIn`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.valuable.p3`}
              components={[
                <Link key="0" to="/articles/best-water-monitoring-commercial-buildings" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.notReplacement.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.notReplacement.p1`)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.notReplacement.detectionTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.notReplacement.detectionDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.notReplacement.monitoringTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.notReplacement.monitoringDesc`)}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.notReplacement.intelTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.notReplacement.intelDesc`)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>{t(`${P}.closing.p1`)}</p>
          <p className={`${pCls} mt-3`}>{t(`${P}.closing.p2`)}</p>
        </section>

        <ArticleRelatedReading
          translationBase={`${P}.related`}
          paths={[
            '/articles/how-property-managers-handle-water-issues',
            '/articles/4-types-of-water-monitoring-systems',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
