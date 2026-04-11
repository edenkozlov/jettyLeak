import { useTranslation } from 'react-i18next'

import { MarketingSubpageNav } from '@/components/MarketingSubpageNav'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/globals/constants'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function Privacy() {
  const { t } = useTranslation('landing')
  useDocumentMeta(t('privacy.pageTitle'), t('privacy.metaDescription'))

  return (
    <div className="min-h-screen bg-white antialiased">
      <MarketingSubpageNav />

      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 sm:px-6">
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900 sm:text-[40px]">{t('privacy.h1')}</h1>
        <p className="mt-2 text-[13px] text-gray-400">{t('privacy.lastUpdated')}</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
          <p>{t('privacy.intro')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('privacy.collectTitle')}</h2>
          <p>{t('privacy.collectBody')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('privacy.useTitle')}</h2>
          <p>{t('privacy.useBody')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('privacy.securityTitle')}</h2>
          <p>{t('privacy.securityBody')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('privacy.retentionTitle')}</h2>
          <p>{t('privacy.retentionBody')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('privacy.thirdPartyTitle')}</h2>
          <p>{t('privacy.thirdPartyBody')}</p>

          <h2 className="text-[20px] font-semibold text-gray-900 sm:text-[22px]">{t('privacy.contactTitle')}</h2>
          <p>
            {t('privacy.contactBeforeEmail')}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-indigo-600 hover:text-indigo-500">
              {CONTACT_EMAIL}
            </a>{' '}
            {t('privacy.contactOrCall')}{' '}
            <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-medium text-indigo-600 hover:text-indigo-500">
              {CONTACT_PHONE_DISPLAY}
            </a>
            .
          </p>
        </div>
      </main>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
