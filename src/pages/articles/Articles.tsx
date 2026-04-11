import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { ArticleHero } from '@/components/articles/ArticleHero'
import { ArticleTopNav } from '@/components/articles/ArticleTopNav'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const HUB_ENTRIES = [
  { itemKey: 'whatIs', path: '/articles/what-is-water-monitoring-system' },
  { itemKey: 'howToChoose', path: '/articles/how-to-choose-water-monitoring-system' },
  { itemKey: 'monitoringVsDetection', path: '/articles/water-monitoring-vs-leak-detection' },
  { itemKey: 'fourTypes', path: '/articles/4-types-of-water-monitoring-systems' },
  { itemKey: 'bestCommercial', path: '/articles/best-water-monitoring-commercial-buildings' },
  { itemKey: 'nonInvasiveVsInline', path: '/articles/non-invasive-vs-inline-water-monitoring' },
  { itemKey: 'afterLeakAlert', path: '/articles/what-happens-after-leak-alert' },
  { itemKey: 'leakDetectionNotEnough', path: '/articles/why-leak-detection-not-enough-commercial' },
  { itemKey: 'propertyManagers', path: '/articles/how-property-managers-handle-water-issues' },
  { itemKey: 'waterIntelligence', path: '/articles/what-is-water-intelligence-system' },
] as const

export default function Articles() {
  const { t } = useTranslation('articles')
  useDocumentMeta(t('index.pageTitle'), t('index.metaDescription'))

  return (
    <div className="min-h-screen bg-white antialiased">
      <ArticleTopNav />

      <ArticleHero
        eyebrow={t('index.eyebrow')}
        h1={t('index.title')}
        subtitle={t('index.subtitle')}
      />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-4">
          {HUB_ENTRIES.map((article, i) => (
            <Link
              key={article.path}
              to={article.path}
              className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-400 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">
                  {i + 1}
                </span>
                <h2 className="text-[16px] font-semibold leading-snug text-gray-900 sm:text-[17px]">
                  {t(`index.items.${article.itemKey}.title`)}
                </h2>
              </div>
              <p className="mt-2 pl-9 text-[14px] leading-relaxed text-gray-500">
                {t(`index.items.${article.itemKey}.description`)}
              </p>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
