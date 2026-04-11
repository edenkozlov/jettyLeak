import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleRelatedReading } from '@/components/articles/ArticleRelatedReading'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { h2Cls, h3Cls, inlineLinkCls, listCls, pCls, sectionCls } from '@/components/articles/articleClasses'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const strongCls = 'text-gray-900'

export default function ArticleWhatIsWaterMonitoring() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t('whatIsWaterMonitoring.pageTitle'), t('whatIsWaterMonitoring.metaDescription'))

  const intro = t('whatIsWaterMonitoring.intro', { returnObjects: true }) as string[]
  const basicListDesigned = t('whatIsWaterMonitoring.basicDefinition.listDesigned', {
    returnObjects: true,
  }) as string[]
  const basicListFurther = t('whatIsWaterMonitoring.basicDefinition.listFurther', {
    returnObjects: true,
  }) as string[]
  const misleadingList = t('whatIsWaterMonitoring.misleading.list', { returnObjects: true }) as string[]
  const distinctionList = t('whatIsWaterMonitoring.distinctionMatters.list', {
    returnObjects: true,
  }) as string[]

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero
        eyebrow={t('shared.labelArticle')}
        h1={t('whatIsWaterMonitoring.h1')}
        subtitle={t('whatIsWaterMonitoring.subtitle')}
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
          <h2 className={h2Cls}>{t('whatIsWaterMonitoring.basicDefinition.heading')}</h2>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.basicDefinition.introDesigned')}</p>
          <ul className={`${listCls} mt-3`}>
            {basicListDesigned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.basicDefinition.introFurther')}</p>
          <ul className={`${listCls} mt-3`}>
            {basicListFurther.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.basicDefinition.closing')}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t('whatIsWaterMonitoring.misleading.heading')}</h2>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.misleading.p1')}</p>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.misleading.p2')}</p>
          <ul className={`${listCls} mt-3`}>
            {misleadingList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey="whatIsWaterMonitoring.misleading.p3"
              components={[
                <Link key="0" to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.misleading.p4')}</p>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.misleading.p5')}</p>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t('whatIsWaterMonitoring.fourTypes.heading')}</h2>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.fourTypes.intro')}</p>

          <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t('whatIsWaterMonitoring.fourTypes.type1.title')}</h3>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type1.p1')}</p>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type1.p2')}</p>
              <ul className={`${listCls} mt-2`}>
                {(t('whatIsWaterMonitoring.fourTypes.type1.list', { returnObjects: true }) as string[]).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t('whatIsWaterMonitoring.fourTypes.type2.title')}</h3>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type2.p1')}</p>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type2.p2')}</p>
              <ul className={`${listCls} mt-2`}>
                {(t('whatIsWaterMonitoring.fourTypes.type2.list', { returnObjects: true }) as string[]).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey="whatIsWaterMonitoring.fourTypes.type2.p3"
                  components={[
                    <Link key="0" to="/flo-by-moen-alternative" className={inlineLinkCls} />,
                    <Link key="1" to="/phyn-alternative" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t('whatIsWaterMonitoring.fourTypes.type3.title')}</h3>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type3.p1')}</p>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type3.p2')}</p>
              <ul className={`${listCls} mt-2`}>
                {(t('whatIsWaterMonitoring.fourTypes.type3.list', { returnObjects: true }) as string[]).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>{t('whatIsWaterMonitoring.fourTypes.type4.title')}</h3>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type4.p1')}</p>
              <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.fourTypes.type4.p2')}</p>
              <ul className={`${listCls} mt-2`}>
                {(t('whatIsWaterMonitoring.fourTypes.type4.list', { returnObjects: true }) as string[]).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
              <p className={`${pCls} mt-3`}>
                <Trans
                  ns="articles"
                  i18nKey="whatIsWaterMonitoring.fourTypes.type4.p3"
                  components={[
                    <Link key="0" to="/articles/what-is-water-intelligence-system" className={inlineLinkCls} />,
                  ]}
                />
              </p>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className={h2Cls}>{t('whatIsWaterMonitoring.distinctionMatters.heading')}</h2>
          <p className={`${pCls} mt-4`}>
            <Trans
              ns="articles"
              i18nKey="whatIsWaterMonitoring.distinctionMatters.p1"
              components={[
                <Link key="0" to="/best-water-monitoring-systems" className={inlineLinkCls} />,
              ]}
            />
          </p>
          <div className="mt-4 space-y-4">
            <p className={pCls}>
              <Trans
                ns="articles"
                i18nKey="whatIsWaterMonitoring.distinctionMatters.comparison1"
                components={{ strong: <strong className={strongCls} /> }}
              />
            </p>
            <p className={pCls}>
              <Trans
                ns="articles"
                i18nKey="whatIsWaterMonitoring.distinctionMatters.comparison2"
                components={{ strong: <strong className={strongCls} /> }}
              />
            </p>
          </div>
          <p className={`${pCls} mt-4`}>{t('whatIsWaterMonitoring.distinctionMatters.p2')}</p>
          <ul className={`${listCls} mt-3`}>
            {distinctionList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>{t('whatIsWaterMonitoring.closing.p1')}</p>
          <p className={`${pCls} mt-3`}>{t('whatIsWaterMonitoring.closing.p2')}</p>
        </section>

        <ArticleRelatedReading
          translationBase="whatIsWaterMonitoring.related"
          paths={[
            '/articles/how-to-choose-water-monitoring-system',
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
