import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LandingLanguageSwitch } from '@/components/landing/LandingLanguageSwitch'

export function ArticleTopNav() {
  const { t } = useTranslation('articles')

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogoMark />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <LandingLanguageSwitch />
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
            {t('shared.navHome')}
          </Link>
          <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">
            {t('shared.navCaseStudy')}
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
          >
            {t('shared.navSignIn')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
