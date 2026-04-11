import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'nonInvasiveVsInline'

export default function ArticleNonInvasiveVsInline() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  const intro = t(`${P}.intro`, { returnObjects: true }) as string[]

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero eyebrow={t('shared.labelArticle')} h1={t(`${P}.h1`)} subtitle={t(`${P}.subtitle`)} />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className={sectionCls}>
          <p className={pCls}>{intro[0]}</p>
          <p className={`${pCls} mt-4`}>{intro[1]}</p>
          <p className={`${pCls} mt-4`}>{intro[2]}</p>
          <p className={`${pCls} mt-4`}>{intro[3]}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.intro.4`}
              components={[
                <Link key="0" to="/articles/4-types-of-water-monitoring-systems" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.inline.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.inline.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.inline.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.inline.listTypical`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.inline.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.inline.listProvide`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.inline.p4`}
                components={[
                  <Link key="0" to="/flo-by-moen-alternative" className={inlineLinkCls} />,
                  <Link key="1" to="/phyn-alternative" className={inlineLinkCls} />,
                ]}
              />
            </p>
            <p className={`${pCls} mt-4`}>{t(`${P}.inline.p5`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.inline.listRequire`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.nonInvasive.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.nonInvasive.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.nonInvasive.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.nonInvasive.listThey`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.nonInvasive.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.nonInvasive.listAllows`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.nonInvasive.p4`}
                components={[<Link key="0" to="/flume-alternative" className={inlineLinkCls} />]}
              />
            </p>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.keyDifferences.heading`)}</h2>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">
                  {t(`${P}.keyDifferences.inlineLabel`)}
                </p>
                <p className="mt-2 text-[14px] font-semibold text-gray-900">{t(`${P}.keyDifferences.installRowLabel`)}</p>
                <p className={`${pCls} mt-1`}>{t(`${P}.keyDifferences.inlineInstall`)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                <p className="text-[13px] font-semibold tracking-wide text-indigo-500 uppercase">
                  {t(`${P}.keyDifferences.nonInvLabel`)}
                </p>
                <p className="mt-2 text-[14px] font-semibold text-gray-900">{t(`${P}.keyDifferences.installRowLabel`)}</p>
                <p className={`${pCls} mt-1`}>{t(`${P}.keyDifferences.nonInvInstall`)}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">{t(`${P}.keyDifferences.deployLabel`)}</p>
                <p className={`${pCls} mt-1`}>{t(`${P}.keyDifferences.inlineDeploy`)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">{t(`${P}.keyDifferences.deployLabel`)}</p>
                <p className={`${pCls} mt-1`}>{t(`${P}.keyDifferences.nonInvDeploy`)}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">{t(`${P}.keyDifferences.flexLabel`)}</p>
                <p className={`${pCls} mt-1`}>{t(`${P}.keyDifferences.inlineFlex`)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
                <p className="mt-1 text-[14px] font-semibold text-gray-900">{t(`${P}.keyDifferences.flexLabel`)}</p>
                <p className={`${pCls} mt-1`}>{t(`${P}.keyDifferences.nonInvFlex`)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.accuracy.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.accuracy.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.accuracy.p2`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.accuracy.p3`)}</p>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.whenInline.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.whenInline.p1`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whenInline.listWhen`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.whenInline.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whenInline.listCommon`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.whenNonInv.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.whenNonInv.p1`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whenNonInv.listUseful`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.whenNonInv.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.whenNonInv.listRelevant`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
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
          <p className={`${pCls} mt-4`}>{t(`${P}.whyMatters.p3`)}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.whyMatters.p4`}
              components={[
                <Link key="0" to="/articles/best-water-monitoring-commercial-buildings" className={inlineLinkCls} />,
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
            '/articles/best-water-monitoring-commercial-buildings',
            '/articles/what-is-water-monitoring-system',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
