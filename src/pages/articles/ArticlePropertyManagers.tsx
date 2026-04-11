import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'propertyManagers'

export default function ArticlePropertyManagers() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  const intro = t(`${P}.intro`, { returnObjects: true }) as string[]
  const quotes = t(`${P}.steps.0.quotes`, { returnObjects: true }) as string[]

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
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
                  1
                </span>
                <h2 className="text-[17px] font-semibold text-gray-900">{t(`${P}.steps.0.title`)}</h2>
              </div>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.0.p1`)}</p>
              <div className="mt-3 space-y-1 border-l-2 border-gray-200 pl-4">
                {quotes.map((q) => (
                  <p key={q} className={`${pCls} italic`}>
                    &ldquo;{q}&rdquo;
                  </p>
                ))}
              </div>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.0.p2`)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
                  2
                </span>
                <h2 className="text-[17px] font-semibold text-gray-900">{t(`${P}.steps.1.title`)}</h2>
              </div>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.1.p1`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.1.listDoes`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.1.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.1.listWhere`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
                  3
                </span>
                <h2 className="text-[17px] font-semibold text-gray-900">{t(`${P}.steps.2.title`)}</h2>
              </div>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.2.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.2.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.2.listMay`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.2.p3`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.2.listDepends`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
                  4
                </span>
                <h2 className="text-[17px] font-semibold text-gray-900">{t(`${P}.steps.3.title`)}</h2>
              </div>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.3.p1`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.3.list`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.3.p2`)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
                  5
                </span>
                <h2 className="text-[17px] font-semibold text-gray-900">{t(`${P}.steps.4.title`)}</h2>
              </div>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.4.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.steps.4.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.steps.4.list`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.systemsFit.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.systemsFit.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.systemsFit.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.systemsFit.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.systemsFit.p3`}
              components={[
                <Link key="0" to="/articles/what-happens-after-leak-alert" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.challenge.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.challenge.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.challenge.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.challenge.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.challenge.p3`}
              components={[
                <Link key="0" to="/articles/why-leak-detection-not-enough-commercial" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.whatHelps.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.whatHelps.p1`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.whatHelps.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.whatHelps.p2`}
              components={[
                <Link key="0" to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <p className={`${pCls} mt-4`}>{t(`${P}.whatHelps.p3`)}</p>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>{t(`${P}.closing.p1`)}</p>
          <p className={`${pCls} mt-3`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.closing.p2`}
              components={[<Link key="0" to="/best-water-monitoring-systems" className={inlineLinkCls} />]}
            />
          </p>
        </section>

        <ArticleRelatedReading
          translationBase={`${P}.related`}
          paths={[
            '/articles/what-is-water-intelligence-system',
            '/articles/what-happens-after-leak-alert',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
