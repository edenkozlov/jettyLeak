import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, h3Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'bestCommercial'

export default function ArticleBestCommercial() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero eyebrow={t('shared.labelArticle')} h1={t(`${P}.h1`)} subtitle={t(`${P}.subtitle`)} />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className={sectionCls}>
          <p className={pCls}>{t(`${P}.intro.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.intro.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.intro.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.intro.p3`)}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.intro.p4`}
              components={[<Link key="0" to="/best-water-monitoring-systems" className={inlineLinkCls} />]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.whatMatters.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.whatMatters.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.whatMatters.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.whatMatters.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.whatMatters.p3`)}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.categories.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.categories.intro`)}</p>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.categories.cat1.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat1.p1`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.categories.cat1.listFocus`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat1.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.categories.cat1.listUseful`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.categories.cat1.p3`}
                  components={[
                    <Link key="0" to="/flo-by-moen-alternative" className={inlineLinkCls} />,
                    <Link key="1" to="/phyn-alternative" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.categories.cat2.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat2.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat2.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.categories.cat2.list`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.categories.cat2.p3`}
                  components={[
                    <Link key="0" to="/wint-alternative" className={inlineLinkCls} />,
                    <Link key="1" to="/alert-labs-alternative" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.categories.cat3.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat3.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat3.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.categories.cat3.list`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.categories.cat3.p3`}
                  components={[
                    <Link key="0" to="/flume-alternative" className={inlineLinkCls} />,
                    <Link key="1" to="/articles/non-invasive-vs-inline-water-monitoring" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t(`${P}.categories.cat4.title`)}</h3>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat4.p1`)}</p>
              <p className={`${pCls} mt-3`}>{t(`${P}.categories.cat4.p2`)}</p>
              <ul className={`${listCls} mt-2`}>
                {(t(`${P}.categories.cat4.list`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey={`${P}.categories.cat4.p3`}
                  components={[
                    <Link key="0" to="/articles/what-is-water-intelligence-system" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.howToChoose.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.howToChoose.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.howToChoose.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.howToChoose.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.howToChoose.p3`)}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.howToChoose.p4`}
              components={[
                <Link key="0" to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.whenMakesSense.heading`)}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.whenMakesSense.leakTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.whenMakesSense.leakDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.whenMakesSense.platformTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.whenMakesSense.platformDesc`)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.whenMakesSense.nonInvTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.whenMakesSense.nonInvDesc`)}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.whenMakesSense.intelTitle`)}</p>
              <p className={`${pCls} mt-1`}>{t(`${P}.whenMakesSense.intelDesc`)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>{t(`${P}.closing.p1`)}</p>
          <p className={`${pCls} mt-3`}>{t(`${P}.closing.p2`)}</p>
          <p className={`${pCls} mt-3`}>{t(`${P}.closing.p3`)}</p>
        </section>

        <ArticleRelatedReading
          translationBase={`${P}.related`}
          paths={[
            '/articles/how-to-choose-water-monitoring-system',
            '/articles/non-invasive-vs-inline-water-monitoring',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
