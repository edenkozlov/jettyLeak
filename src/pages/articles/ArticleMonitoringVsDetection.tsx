import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const P = 'monitoringVsDetection'

export default function ArticleMonitoringVsDetection() {
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
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.intro.2`}
              components={[
                <Link key="0" to="/articles/what-is-water-monitoring-system" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.leakDetection.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.leakDetection.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.leakDetection.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.leakDetection.list`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.leakDetection.p3`}
                components={{ strong: <strong className="text-gray-900" /> }}
              />
            </p>
            <p className={`${pCls} mt-4`}>{t(`${P}.leakDetection.p4`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.leakDetection.listUsed`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.leakDetection.p5`}
                components={[
                  <Link key="0" to="/flo-by-moen-alternative" className={inlineLinkCls} />,
                  <Link key="1" to="/phyn-alternative" className={inlineLinkCls} />,
                ]}
              />
            </p>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.waterMonitoring.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.waterMonitoring.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.waterMonitoring.p2`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.waterMonitoring.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.waterMonitoring.list`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.waterMonitoring.p4`}
                components={{ strong: <strong className="text-gray-900" /> }}
              />
            </p>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.keyDifference.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.keyDifference.p1`)}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">
                {t(`${P}.keyDifference.leakLabel`)}
              </p>
              <p className="mt-2 text-[17px] font-semibold text-gray-900">{t(`${P}.keyDifference.leakMode`)}</p>
              <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.keyDifference.leakQuestion`)}&rdquo;</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-indigo-500 uppercase">
                {t(`${P}.keyDifference.monitorLabel`)}
              </p>
              <p className="mt-2 text-[17px] font-semibold text-gray-900">{t(`${P}.keyDifference.monitorMode`)}</p>
              <p className={`${pCls} mt-2 italic`}>&ldquo;{t(`${P}.keyDifference.monitorQuestion`)}&rdquo;</p>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.confusion.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.confusion.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.confusion.p2`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.confusion.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.confusion.p3`)}</p>
          <div className="mt-4 space-y-3">
            <p className={pCls}>
              <Trans
                ns="articles"
                i18nKey={`${P}.confusion.p4`}
                components={{ strong: <strong className="text-gray-900" /> }}
              />
            </p>
            <p className={pCls}>
              <Trans
                ns="articles"
                i18nKey={`${P}.confusion.p5`}
                components={{ strong: <strong className="text-gray-900" /> }}
              />
            </p>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.realBuildings.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.realBuildings.p1`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.realBuildings.p2`)}</p>
          <p className={`${pCls} mt-4`}>{t(`${P}.realBuildings.p3`)}</p>
          <ul className={`${listCls} mt-3`}>
            {(t(`${P}.realBuildings.list`, { returnObjects: true }) as string[]).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t(`${P}.realBuildings.p4`)}</p>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.realBuildings.p5`}
              components={[
                <Link key="0" to="/articles/why-leak-detection-not-enough-commercial" className={inlineLinkCls} />,
              ]}
            />
          </p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t(`${P}.whichChoose.heading`)}</h2>
          <p className={`${pCls} mt-4`}>{t(`${P}.whichChoose.p1`)}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.whichChoose.ifLeakHeading`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.whichChoose.ifLeak`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <p className="text-[14px] font-semibold text-gray-900">{t(`${P}.whichChoose.ifMonitorHeading`)}</p>
              <ul className={`${listCls} mt-3`}>
                {(t(`${P}.whichChoose.ifMonitor`, { returnObjects: true }) as string[]).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.whichChoose.p2`}
              components={[<Link key="0" to="/best-water-monitoring-systems" className={inlineLinkCls} />]}
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
            '/articles/4-types-of-water-monitoring-systems',
            '/articles/why-leak-detection-not-enough-commercial',
            '/best-water-monitoring-systems',
          ]}
        />
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
