import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const strongCls = 'text-gray-900'
const P = 'howToChoose'

export default function ArticleHowToChoose() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t(`${P}.pageTitle`), t(`${P}.metaDescription`))

  const intro = t(`${P}.intro`, { returnObjects: true }) as string[]
  const goalListGoals = t(`${P}.sections.goal.listGoals`, { returnObjects: true }) as string[]

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero
        eyebrow={t('shared.labelArticle')}
        h1={t(`${P}.h1`)}
        subtitle={t(`${P}.subtitle`)}
      />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <section className={sectionCls}>
          {intro.map((para, i) => (
            <p key={i} className={i === 0 ? pCls : `${pCls} mt-4`}>
              {para}
            </p>
          ))}
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.sections.buildingType.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.buildingType.p1`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.buildingType.listTypes`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.buildingType.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.buildingType.listEnv`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.buildingType.p3`)}</p>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.sections.goal.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.goal.p1`)}</p>
            <ul className={`${listCls} mt-3`}>
              {goalListGoals.map((_, i) => (
                <li key={i}>
                  <Trans
                    ns="articles"
                    i18nKey={`${P}.sections.goal.listGoals.${i}`}
                    components={{ strong: <strong className={strongCls} /> }}
                  />
                </li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.goal.p2`)}</p>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.sections.goal.p3`}
                components={[
                  <Link key="0" to="/articles/what-is-water-intelligence-system" className={inlineLinkCls} />,
                ]}
              />
            </p>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.goal.p4`)}</p>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.sections.installation.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.installation.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.installation.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.installation.listRequire`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.installation.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.installation.listOthers`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.sections.installation.p4`}
                components={[
                  <Link key="0" to="/articles/non-invasive-vs-inline-water-monitoring" className={inlineLinkCls} />,
                ]}
              />
            </p>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.sections.afterDetection.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.afterDetection.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.afterDetection.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.afterDetection.listWhen`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.afterDetection.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.afterDetection.listAlerts`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>
              <Trans
                ns="articles"
                i18nKey={`${P}.sections.afterDetection.p4`}
                components={[
                  <Link key="0" to="/articles/what-happens-after-leak-alert" className={inlineLinkCls} />,
                ]}
              />
            </p>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.sections.visibility.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.visibility.p1`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.visibility.listTell`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.visibility.p2`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.visibility.listUnderstand`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.visibility.p3`)}</p>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>{t(`${P}.sections.workflow.heading`)}</h2>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.workflow.p1`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.workflow.p2`)}</p>
            <p className={`${pCls} mt-4`}>{t(`${P}.sections.workflow.p3`)}</p>
            <ul className={`${listCls} mt-3`}>
              {(t(`${P}.sections.workflow.list`, { returnObjects: true }) as string[]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            <Trans
              ns="articles"
              i18nKey={`${P}.closing.p1`}
              components={[
                <Link key="0" to="/best-water-monitoring-systems" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <p className={`${pCls} mt-3`}>{t(`${P}.closing.p2`)}</p>
        </section>

        <ArticleRelatedReading
          translationBase={`${P}.related`}
          paths={[
            '/articles/what-is-water-monitoring-system',
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
