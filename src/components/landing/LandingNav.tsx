import { useState } from 'react'
import { Link } from 'react-router'

import logo from '@/assets/belugaLogo.png'

import { LANDING_ANCHOR_LINKS } from './constants'

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Beluga" className="h-8 sm:h-9" />
          <span className="text-lg font-bold text-gray-900 sm:text-xl">Beluga</span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="hidden gap-7 md:flex">
            {LANDING_ANCHOR_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-[13px] text-gray-400 transition hover:text-gray-700"
              >
                {label}
              </a>
            ))}
            <Link
              to="/case-study"
              className="text-[13px] text-gray-400 transition hover:text-gray-700"
            >
              Case Study
            </Link>
            <a
              href="https://pitch.com/v/belugapitchdeck-j52a9r"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-gray-400 transition hover:text-gray-700"
            >
              Investor
            </a>
          </div>
          <Link
            to="/login"
            className="hidden text-[13px] text-gray-400 transition hover:text-gray-700 sm:block"
          >
            Sign In
          </Link>
          <a
            href="#interested"
            className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
          >
            Get Started
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 md:hidden"
            aria-label="Toggle menu"
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
            {LANDING_ANCHOR_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="text-[14px] text-gray-500 transition hover:text-gray-900"
              >
                {label}
              </a>
            ))}
            <Link
              to="/case-study"
              onClick={() => setMenuOpen(false)}
              className="text-[14px] text-gray-500 transition hover:text-gray-900"
            >
              Case Study
            </Link>
            <a
              href="https://pitch.com/v/belugapitchdeck-j52a9r"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="text-[14px] text-gray-500 transition hover:text-gray-900"
            >
              Investor
            </a>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-[14px] text-gray-500 transition hover:text-gray-900"
            >
              Sign In
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
