import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark, BRAND_LOGO_FOOTER_CLASS } from '@/components/BrandLogoMark'

import { LANDING_ANCHOR_LINKS } from '@/components/landing/constants'
import { CONTACT_EMAIL, LINKEDIN_COMPANY_URL } from '@/globals/constants'

const linkClass =
  'text-[13px] leading-snug text-gray-600 transition-colors duration-200 hover:text-gray-950'

function NavHeading({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
      {children}
    </span>
  )
}

function FooterColumn({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <NavHeading>{heading}</NavHeading>
      <nav className="flex flex-col gap-2.5" aria-label={heading}>
        {children}
      </nav>
    </div>
  )
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export function SiteFooter({ variant = 'page' }: { variant?: 'landing' | 'page' }) {
  const year = new Date().getFullYear()
  const copyrightLine =
    variant === 'landing'
      ? `© ${year} Beluga — Water intelligence for buildings`
      : `© ${year} Beluga — Made in Canada`

  return (
    <footer className="border-t border-gray-200/90 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-0">
          <div className="lg:col-span-3">
            <Link to="/" className="inline-flex shrink-0">
              <BrandLogoMark className={BRAND_LOGO_FOOTER_CLASS} />
            </Link>
            <p className="mt-5 max-w-[16rem] text-[13px] leading-relaxed text-gray-500">
              Non-invasive water monitoring and leak intelligence for commercial buildings.
            </p>
            <a
              href={LINKEDIN_COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200/90 text-gray-500 transition-colors duration-200 hover:border-gray-300 hover:text-gray-900"
              aria-label="Beluga on LinkedIn"
            >
              <LinkedInGlyph className="h-[18px] w-[18px]" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:col-span-9 lg:gap-8">
            <FooterColumn heading="Product">
              {variant === 'landing' ? (
                <>
                  {LANDING_ANCHOR_LINKS.map(({ label, href }) => (
                    <a key={href} href={href} className={linkClass}>
                      {label}
                    </a>
                  ))}
                  <Link to="/quote" className={linkClass}>
                    Get a quote
                  </Link>
                  <Link to="/login" className={linkClass}>
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/" className={linkClass}>
                    Home
                  </Link>
                  <Link to="/quote" className={linkClass}>
                    Get a quote
                  </Link>
                  <Link to="/login" className={linkClass}>
                    Sign In
                  </Link>
                </>
              )}
            </FooterColumn>

            <FooterColumn heading="Resources">
              <Link to="/case-study" className={linkClass}>
                Case study
              </Link>
              <Link to="/articles" className={linkClass}>
                Articles
              </Link>
              <Link to="/faq" className={linkClass}>
                FAQ
              </Link>
              <Link to="/support" className={linkClass}>
                Support
              </Link>
              {variant === 'landing' ? (
                <a
                  href="https://pitch.com/v/belugapitchdeck-j52a9r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Investor deck
                </a>
              ) : null}
            </FooterColumn>

            <FooterColumn heading="Compare">
              <Link to="/flo-by-moen-alternative" className={linkClass}>
                Beluga vs Flo
              </Link>
              <Link to="/phyn-alternative" className={linkClass}>
                Beluga vs Phyn
              </Link>
              <Link to="/wint-alternative" className={linkClass}>
                Beluga vs WINT
              </Link>
              <Link to="/alert-labs-alternative" className={linkClass}>
                Beluga vs Alert Labs
              </Link>
              <Link to="/water-alert-alternative" className={linkClass}>
                Beluga vs Water Alert
              </Link>
              <Link to="/flume-alternative" className={linkClass}>
                Beluga vs Flume
              </Link>
              <Link to="/best-water-monitoring-systems" className={linkClass}>
                All comparisons
              </Link>
            </FooterColumn>

            <FooterColumn heading="Legal">
              <Link to="/privacy" className={linkClass}>
                Privacy policy
              </Link>
              <Link to="/terms" className={linkClass}>
                Terms of service
              </Link>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-gray-100 pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-[12px] text-gray-400">{copyrightLine}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[12px] text-gray-500 transition-colors duration-200 hover:text-gray-900 sm:text-right"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
