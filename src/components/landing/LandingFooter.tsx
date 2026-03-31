import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'

import { LANDING_ANCHOR_LINKS } from './constants'

export function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 md:flex-row">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogoMark className="h-7 w-auto max-w-[min(100%,10rem)] shrink-0 object-contain object-left" />
          <span className="text-sm font-bold text-gray-900">Beluga</span>
        </Link>
        <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
          {LANDING_ANCHOR_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-[12px] text-gray-400 transition hover:text-gray-600"
            >
              {label}
            </a>
          ))}
          <Link to="/case-study" className="text-[12px] text-gray-400 transition hover:text-gray-600">
            Case Study
          </Link>
          <a
            href="https://pitch.com/v/belugapitchdeck-j52a9r"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-gray-400 transition hover:text-gray-600"
          >
            Investor
          </a>
          <Link to="/login" className="text-[12px] text-gray-400 transition hover:text-gray-600">
            Sign In
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
          <Link to="/support" className="text-[12px] text-gray-400 transition hover:text-gray-600">
            Support
          </Link>
          <Link to="/privacy" className="text-[12px] text-gray-400 transition hover:text-gray-600">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-[12px] text-gray-400 transition hover:text-gray-600">
            Terms of Service
          </Link>
        </div>
        <p className="text-[12px] text-gray-300">
          &copy; {new Date().getFullYear()} Beluga — Water intelligence for buildings
        </p>
      </div>
    </footer>
  )
}
