import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'leakDetectionNotEnough'

export default function ArticleLeakDetectionNotEnough() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero eyebrow={t('shared.labelArticle')} h1={t(`${P}.h1`)} subtitle={t(`${P}.subtitle`)} />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className={sectionCls}>
          <p className={pCls}>{t(`${P}.intro.0`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.intro.1`)}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.intro.2`}
              components={[
                <Link key="0" to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.assumption.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.assumption.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.assumption.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.assumption.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.assumption.p3`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.reality.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.reality.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.reality.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.reality.listExamples`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.reality.p3`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.reality.p4`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.reality.listImpact`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.visibilityGap.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.visibilityGap.p1`)}</p>
          <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.visibilityGap.quote`)}&rdquo;</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.visibilityGap.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.visibilityGap.listQuestions`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.visibilityGap.p3`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.visibilityGap.listDifficult`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.visibilityGap.p4`}
              components={[
                <Link key="0" to="/articles/what-is-water-intelligence-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.complexity.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.complexity.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.complexity.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.complexity.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.complexity.p3`}
              components={[
                <Link key="0" to="/wint-alternative" className={inlineLinkCls} />,
                <Link key="1" to="/alert-labs-alternative" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.whyMonitoring.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.whyMonitoring.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.whyMonitoring.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whyMonitoring.listThey`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.whyMonitoring.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whyMonitoring.listAllows`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.stillRole.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.stillRole.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.stillRole.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.stillRole.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.stillRole.p3`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.completeApproach.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.completeApproach.p1`)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.completeApproach.detectionTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.completeApproach.detectionDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.completeApproach.monitoringTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.completeApproach.monitoringDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.completeApproach.workflowsTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.completeApproach.workflowsDesc`)}</p>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.completeApproach.p2`}
              components={[
                <Link key="0" to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>{t(`${P}.closing.p1`)}</p>
          <p className={`${pCls} mt-3`}>{t(`${P}.closing.p2`)}</p>
        </section>

        <ArticleRelatedReading
          translationBase={`${P}.related`}
          paths={[
            '/articles/what-happens-after-leak-alert',
            '/articles/best-water-monitoring-commercial-buildings',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
