import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'fourTypes'

export default function ArticleFourTypes() {
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
              <h2 className={h2Cls}>{t(`${P}.type1.heading`)}</h2>
              <p className={`${pCls} mt-4`}>{t(`${P}.type1.p1`)}</p>
              <p className={`${pCls} mt-4`}>{t(`${P}.type1.p2`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type1.listFocus`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>{t(`${P}.type1.p3`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type1.listAre`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.type1.p4`}
                  components={[
                    <Link key="0" to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>{t(`${P}.type2.heading`)}</h2>
              <p className={`${pCls} mt-4`}>{t(`${P}.type2.p1`)}</p>
              <p className={`${pCls} mt-4`}>{t(`${P}.type2.p2`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type2.listThey`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>{t(`${P}.type2.p3`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type2.listWhere`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.type2.p4`}
                  components={[
                    <Link key="0" to="/flo-by-moen-alternative" className={inlineLinkCls} />,
                    <Link key="1" to="/phyn-alternative" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>{t(`${P}.type3.heading`)}</h2>
              <p className={`${pCls} mt-4`}>{t(`${P}.type3.p1`)}</p>
              <p className={`${pCls} mt-4`}>{t(`${P}.type3.p2`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type3.listTypical`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>{t(`${P}.type3.p3`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type3.listUseful`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.type3.p4`}
                  components={[
                    <Link key="0" to="/articles/non-invasive-vs-inline-water-monitoring" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>{t(`${P}.type4.heading`)}</h2>
              <p className={`${pCls} mt-4`}>{t(`${P}.type4.p1`)}</p>
              <p className={`${pCls} mt-4`}>{t(`${P}.type4.p2`)}</p>
              <p className={`${pCls} mt-4`}>{t(`${P}.type4.p3`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type4.listThey`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>{t(`${P}.type4.p4`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.type4.listFor`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-4`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.type4.p5`}
                  components={[
                    <Link key="0" to="/articles/what-is-water-intelligence-system" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.whyMatter.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatter.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatter.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.whyMatter.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatter.p3`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.framework.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.framework.p1`)}</p>
          <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.framework.quote1`)}&rdquo;</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.framework.p2`)}</p>
          <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.framework.quote2`)}&rdquo;</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.framework.p3`)}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.framework.p4`}
              components={[
                <Link key="0" to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.summary.heading`)}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.summary.leakTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.summary.leakDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.summary.shutoffTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.summary.shutoffDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.summary.nonInvTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.summary.nonInvDesc`)}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.summary.intelTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.summary.intelDesc`)}</p>
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
            '/articles/what-is-water-monitoring-system',
            '/articles/how-to-choose-water-monitoring-system',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
