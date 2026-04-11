import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LandingLanguageSwitch } from '@/components/landing/LandingLanguageSwitch'

/** Minimal top bar for legal/support/marketing subpages (logo, language, back to home). */
export function MarketingSubpageNav() {
  const { t } = useTranslation('landing')

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogoMark />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <LandingLanguageSwitch />
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
            {t('nav.backHome')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
