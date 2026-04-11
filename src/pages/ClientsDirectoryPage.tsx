import { useTranslation } from 'react-i18next'

import { MarketingSubpageNav } from '@/components/MarketingSubpageNav'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { LANDING_SHOWCASE_BUILDINGS } from '@/data/landingShowcaseBuildings'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function ClientsDirectoryPage() {
  const { t } = useTranslation('landing')
  useDocumentMeta(t('clientsDirectory.pageTitle'), t('clientsDirectory.metaDescription'))

  return (
    <div className="min-h-screen bg-gray-50 antialiased">
      <MarketingSubpageNav />

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{t('clientsDirectory.title')}</h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-600">{t('clientsDirectory.subtitle')}</p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_SHOWCASE_BUILDINGS.map((b) => (
            <li key={b.id}>
              <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  <img
                    src={b.imageSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{b.label}</p>
                  <p className="mt-1 text-[15px] font-semibold text-gray-900">{b.addressLine1}</p>
                  {b.cityLine ? (
                    <p className="mt-0.5 text-[13px] text-gray-500">{b.cityLine}</p>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
