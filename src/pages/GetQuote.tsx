import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LandingLanguageSwitch } from '@/components/landing/LandingLanguageSwitch'
import { QuoteForm } from '@/components/QuoteForm'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

export default function GetQuote() {
  const { t } = useTranslation('landing')
  useDocumentMeta(t('quote.pageTitle'), t('quote.metaDescription'))

  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <LandingLanguageSwitch />
            <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
              {t('footer.links.home')}
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
            >
              {t('nav.signIn')}
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
        <p className="mb-6 text-center text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">{t('quote.eyebrow')}</p>
        <div className="relative overflow-hidden rounded-[20px] bg-gray-950 sm:rounded-[28px]">
          <QuoteForm />
        </div>
      </main>

      <SiteFooter variant="page" />

      <ScrollToTopButton />
    </div>
  )
}
