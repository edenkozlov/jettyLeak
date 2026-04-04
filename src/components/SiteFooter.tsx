import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark, BRAND_LOGO_FOOTER_CLASS } from '@/components/BrandLogoMark'

import { LANDING_ANCHOR_LINKS } from '@/components/landing/constants'

const linkClass = 'text-[13px] text-gray-500 transition hover:text-gray-900'

const SUPPORT_URL = 'https://kmgtechnologies.com'

function NavHeading({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">{children}</span>
  )
}

export function SiteFooter({ variant = 'page' }: { variant?: 'landing' | 'page' }) {
  const year = new Date().getFullYear()
  const copyrightLine =
    variant === 'landing'
      ? `© ${year} Beluga — Water intelligence for buildings`
      : `© ${year} Beluga — Made in Canada`

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <Link to="/" className="inline-flex shrink-0">
            <BrandLogoMark className={BRAND_LOGO_FOOTER_CLASS} />
          </Link>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-14">
            <nav className="flex flex-col gap-3" aria-label="Site">
              <NavHeading>Explore</NavHeading>
              {variant === 'landing' ? (
                <>
                  {LANDING_ANCHOR_LINKS.map(({ label, href }) => (
                    <a key={href} href={href} className={linkClass}>
                      {label}
                    </a>
                  ))}
                  <Link to="/case-study" className={linkClass}>
                    Case Study
                  </Link>
                  <Link to="/quote" className={linkClass}>
                    Get a quote
                  </Link>
                  <a
                    href="https://pitch.com/v/belugapitchdeck-j52a9r"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    Investor
                  </a>
                  <Link to="/login" className={linkClass}>
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/" className={linkClass}>
                    Home
                  </Link>
                  <Link to="/case-study" className={linkClass}>
                    Case Study
                  </Link>
                  <Link to="/quote" className={linkClass}>
                    Get a quote
                  </Link>
                  <Link to="/login" className={linkClass}>
                    Sign In
                  </Link>
                </>
              )}
            </nav>

            <nav className="flex flex-col gap-3" aria-label="Product comparisons">
              <NavHeading>Compare</NavHeading>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-10">
                <Link to="/compare/flo-by-moen" className={linkClass}>
                  Beluga vs Flo
                </Link>
                <Link to="/compare/phyn" className={linkClass}>
                  Beluga vs Phyn
                </Link>
                <Link to="/compare/wint" className={linkClass}>
                  Beluga vs WINT
                </Link>
                <Link to="/compare/alert-labs" className={linkClass}>
                  Beluga vs Alert Labs
                </Link>
                <Link to="/compare/water-alert" className={linkClass}>
                  Beluga vs Water Alert
                </Link>
                <Link to="/compare/flume" className={linkClass}>
                  Beluga vs Flume
                </Link>
              </div>
            </nav>

            <nav className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1" aria-label="Legal and help">
              <NavHeading>Legal</NavHeading>
              <Link to="/faq" className={linkClass}>
                FAQ
              </Link>
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Support
              </a>
              <Link to="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              <Link to="/terms" className={linkClass}>
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6">
          <p className="text-[12px] text-gray-400">{copyrightLine}</p>
        </div>
      </div>
    </footer>
  )
}
