import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, h3Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'afterLeakAlert'

export default function ArticleAfterLeakAlert() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  const intro = t(`${P}.intro`, { returnObjects: true }) as string[]

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero eyebrow={t('shared.labelArticle')} h1={t(`${P}.h1`)} subtitle={t(`${P}.subtitle`)} />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className={sectionCls}>
          {intro.map((para, i) => (
            <p key={i} className={i === 0 ? pCls : `${pCls} mt-4`}>
              {para}
            </p>
          ))}
        </section>

        <section className={sectionCls}>
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.steps.0.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.0.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.0.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.0.listChannels`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.0.p3`)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.steps.1.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.1.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.1.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.1.list`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.1.p3`)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.steps.2.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.2.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.2.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.2.listQuestions`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.2.p3`)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.steps.3.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.3.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.3.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.3.listMeans`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.steps.3.p3`}
                  components={[
                    <Link key="0" to="/articles/how-property-managers-handle-water-issues" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.steps.4.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.4.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.4.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.4.listMay`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.4.p3`)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.steps.5.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.5.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.5.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.5.listBut`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.breakdown.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.breakdown.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.breakdown.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.breakdown.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.breakdown.p3`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.whyMatters.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatters.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatters.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.whyMatters.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.whyMatters.p3`}
              components={[
                <Link key="0" to="/articles/what-is-water-intelligence-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatters.p4`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.betterWay.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.betterWay.p1`)}</p>
          <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.betterWay.quote1`)}&rdquo;</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.betterWay.p2`)}</p>
          <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.betterWay.quote2`)}&rdquo;</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.betterWay.p3`}
              components={[
                <Link key="0" to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <p className={`${pCls} mt-4`}>{t(`${P}.betterWay.p4`)}</p>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>{t(`${P}.closing.p1`)}</p>
          <p className={`${pCls} mt-3`}>{t(`${P}.closing.p2`)}</p>
          <p className={`${pCls} mt-3`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.closing.p3`}
              components={[<Link key="0" to="/best-water-monitoring-systems" className={inlineLinkCls} />]}
            />
          </p>
        </section>

        <ArticleRelatedReading
          translationBase={`${P}.related`}
          paths={[
            '/articles/why-leak-detection-not-enough-commercial',
            '/articles/how-property-managers-handle-water-issues',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
