import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'

import { LANDING_ANCHOR_LINKS } from './constants'
import { LandingLanguageSwitch } from './LandingLanguageSwitch'

export function LandingNav() {
  const { t } = useTranslation('landing')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogoMark />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 md:gap-8">
          <div className="hidden gap-7 md:flex">
            {LANDING_ANCHOR_LINKS.map(({ labelKey, href }) => (
              <a
                key={href}
                href={href}
                className="text-[13px] text-gray-400 transition hover:text-gray-700"
              >
                {t(labelKey)}
              </a>
            ))}
            <Link
              to="/case-study"
              className="text-[13px] text-gray-400 transition hover:text-gray-700"
            >
              {t('nav.caseStudy')}
            </Link>
            <a
              href="https://pitch.com/v/belugapitchdeck-j52a9r"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-gray-400 transition hover:text-gray-700"
            >
              {t('nav.investor')}
            </a>
          </div>
          <LandingLanguageSwitch />
          <Link
            to="/login"
            className="hidden text-[13px] text-gray-400 transition hover:text-gray-700 sm:block"
          >
            {t('nav.signIn')}
          </Link>
          <Link
            to="/quote"
            className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
          >
            {t('nav.getQuote')}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 md:hidden"
            aria-label={t('nav.toggleMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-3">
            {LANDING_ANCHOR_LINKS.map(({ labelKey, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="text-[14px] text-gray-500 transition hover:text-gray-900"
              >
                {t(labelKey)}
              </a>
            ))}
            <Link
              to="/case-study"
              onClick={() => setMenuOpen(false)}
              className="text-[14px] text-gray-500 transition hover:text-gray-900"
            >
              {t('nav.caseStudy')}
            </Link>
            <a
              href="https://pitch.com/v/belugapitchdeck-j52a9r"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="text-[14px] text-gray-500 transition hover:text-gray-900"
            >
              {t('nav.investor')}
            </a>
            <div className="py-1">
              <LandingLanguageSwitch />
            </div>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-[14px] text-gray-500 transition hover:text-gray-900"
            >
              {t('nav.signIn')}
            </Link>
            <Link
              to="/quote"
              onClick={() => setMenuOpen(false)}
              className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-indigo-500 py-3 text-[14px] font-semibold text-white"
            >
              {t('nav.getQuote')}
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
