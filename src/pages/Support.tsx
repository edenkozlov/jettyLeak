import { useTranslation } from 'react-i18next'

import { MarketingSubpageNav } from '@/components/MarketingSubpageNav'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/globals/constants'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function Support() {
  const { t } = useTranslation('landing')
  useDocumentMeta(t('support.pageTitle'), t('support.metaDescription'))

  return (
    <div className="min-h-screen bg-white antialiased">
      <MarketingSubpageNav />

      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6">
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900 sm:text-[40px]">{t('support.title')}</h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
          <p>{t('support.intro')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('support.contactTitle')}</h2>
          <p>{t('support.contactBody')}</p>
          <p className="space-y-2">
            <span className="block">
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {CONTACT_EMAIL}
              </a>
            </span>
            <span className="block">
              <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {CONTACT_PHONE_DISPLAY}
              </a>
            </span>
          </p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('support.commonTitle')}</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">{t('support.q1')}</h3>
              <p className="mt-1">{t('support.a1')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('support.q2')}</h3>
              <p className="mt-1">{t('support.a2')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('support.q3')}</h3>
              <p className="mt-1">{t('support.a3')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('support.q4')}</h3>
              <p className="mt-1">{t('support.a4')}</p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
