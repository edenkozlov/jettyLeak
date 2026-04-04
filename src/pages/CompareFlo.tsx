import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark, BRAND_LOGO_FOOTER_CLASS } from '@/components/BrandLogoMark'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE = 'Beluga vs Flo by Moen: A Practical Comparison of Water Monitoring Systems'
const META_DESCRIPTION =
  'Compare Beluga and Flo by Moen. Understand the differences between leak detection and water intelligence systems for homes and commercial buildings.'

const COMPARISON_ROWS: { feature: string; beluga: string; flo: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water system intelligence and monitoring',
    flo: 'Leak detection and automatic shutoff',
  },
  {
    feature: 'Installation',
    beluga: 'Non-invasive (no pipe cutting)',
    flo: 'Installed directly on main water line',
  },
  {
    feature: 'Leak detection',
    beluga: 'Yes (via anomaly detection)',
    flo: 'Yes (real-time detection + shutoff)',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    flo: 'Yes',
  },
  {
    feature: 'Water usage insights',
    beluga: 'Detailed, system-level visibility',
    flo: 'Basic usage tracking',
  },
  {
    feature: 'Fixture-level understanding',
    beluga: 'Yes (pattern-based identification)',
    flo: 'Limited',
  },
  {
    feature: 'Target use case',
    beluga: 'Commercial / multi-unit / infrastructure',
    flo: 'Residential homes',
  },
  {
    feature: 'Data over time',
    beluga: 'Continuous monitoring and benchmarking',
    flo: 'Historical usage tracking',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is Beluga a leak detector?',
    a: 'Beluga includes leak detection capabilities, but its primary focus is on system-wide monitoring and anomaly detection rather than only identifying active leaks.',
  },
  {
    q: 'Does Flo by Moen work for commercial buildings?',
    a: 'Flo by Moen is primarily designed for residential use cases. Some commercial applications may be possible depending on system configuration.',
  },
  {
    q: 'Does Beluga shut off water automatically?',
    a: 'Automatic shutoff is not a core feature of Beluga. Its focus is on monitoring, detection, and insight rather than direct intervention.',
  },
  {
    q: 'Which system is more accurate?',
    a: 'Both systems rely on different detection methods and are designed for different use cases. Accuracy depends on the context in which each is deployed.',
  },
]

export default function CompareFlo() {
  useEffect(() => {
    document.title = PAGE_TITLE
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', META_DESCRIPTION)
    } else {
      const el = document.createElement('meta')
      el.name = 'description'
      el.content = META_DESCRIPTION
      document.head.appendChild(el)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white antialiased">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">Home</Link>
            <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">Case Study</Link>
            <Link
              to="/login"
              className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">
            Comparison
          </p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Beluga vs Flo by Moen
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
            A clear, neutral comparison of two different approaches to water monitoring.
          </p>
        </div>
      </header>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                When evaluating water monitoring solutions, it is important to understand that not
                all systems are designed with the same purpose in mind.
              </p>
              <p>
                This page provides a side-by-side comparison of Beluga and Flo by Moen, based on
                publicly available information, to help you determine which approach best fits your
                needs.
              </p>
            </div>
          </section>

          {/* Comparison table */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Feature comparison
            </h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[14px] sm:text-[15px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 pr-4 font-semibold text-gray-500">Feature</th>
                    <th className="py-3 px-4 font-semibold text-indigo-600">Beluga</th>
                    <th className="py-3 pl-4 font-semibold text-gray-700">Flo by Moen</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? 'bg-gray-50/60' : ''}
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">{row.feature}</td>
                      <td className="py-3 px-4 text-gray-600">{row.beluga}</td>
                      <td className="py-3 pl-4 text-gray-600">{row.flo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Approach diagram */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Key difference in approach
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              {/* Reactive */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Reactive protection
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Flo by Moen is designed primarily as a protective system. It focuses on detecting
                  leaks in real time and automatically shutting off water to prevent damage. This
                  makes it particularly useful in residential settings where immediate response is
                  critical.
                </p>
              </div>
              {/* Continuous */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Continuous intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga is designed as a water intelligence system. Rather than focusing only on
                  leak events, it aims to understand how an entire water system behaves over time
                  — identifying inefficiencies, tracking usage patterns, and detecting anomalies
                  before they become critical issues.
                </p>
              </div>
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              These are fundamentally different approaches: one reacts to problems, the other aims
              to continuously understand and optimize the system.
            </p>
          </section>

          {/* When each makes sense */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              When each solution makes sense
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Flo by Moen may be a strong fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    You are a homeowner
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    You want automatic shutoff protection
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    Your priority is immediate leak response
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga may be a better fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    You are focused on reducing waste, identifying inefficiencies, or monitoring
                    infrastructure over time
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    You want visibility into how water is used across the system
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    You manage a commercial or multi-unit building
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* About Beluga */}
          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              About Beluga
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                Beluga is a water intelligence platform designed to help buildings better understand
                their plumbing systems.
              </p>
              <p>
                Using a non-invasive sensor approach, it provides continuous insight into water
                usage, system behavior, and potential inefficiencies — without requiring
                modifications to existing infrastructure.
              </p>
              <p>
                The goal is not only to detect problems, but to make the entire water system more
                visible, measurable, and manageable over time.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Frequently asked questions
            </h2>
            <dl className="mx-auto mt-10 max-w-2xl divide-y divide-gray-200">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="py-6 first:pt-0 last:pb-0">
                  <dt className="text-[15px] font-semibold text-gray-900 sm:text-[16px]">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Disclaimer */}
          <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
            <h3 className="text-[13px] font-semibold tracking-wide text-gray-500 uppercase">
              Disclaimer
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
              This page is intended for informational purposes only. Product details are based on
              publicly available information and may change over time. This content is not
              affiliated with, endorsed by, or sponsored by Moen or Flo by Moen. Readers should
              conduct their own evaluation before selecting a solution.
            </p>
          </section>
        </div>

        {/* CTA — Beluga primary, Flo secondary */}
        <div className="mt-16 border-t border-gray-100 pt-12 sm:mt-24 sm:pt-16">
          <div className="mx-auto max-w-lg text-center sm:text-left">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Get Beluga
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              Early access, building water assessments, and a clear read on whether Beluga is the right tool for you.
            </p>
            <Link
              to="/quote"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 hover:shadow-xl sm:w-auto"
            >
              Get Beluga
            </Link>
          </div>

          <div className="mx-auto mt-12 max-w-lg border-t border-gray-100 pt-12 text-center sm:text-left">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Get Flo by Moen
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              Product details, pricing, and support are on Moen&apos;s site—we don&apos;t sell or install Flo.
            </p>
            <a
              href="https://www.moen.com/flo"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition hover:bg-gray-800 hover:shadow-xl sm:w-auto"
            >
              Get Flo by Moen
            </a>
          </div>
        </div>
      </article>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
              },
            })),
          }),
        }}
      />

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 md:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark className={BRAND_LOGO_FOOTER_CLASS} />
          </Link>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            <Link to="/" className="text-[12px] text-gray-400 transition hover:text-gray-600">Home</Link>
            <Link to="/case-study" className="text-[12px] text-gray-400 transition hover:text-gray-600">Case Study</Link>
            <Link to="/compare/flo-by-moen" className="text-[12px] text-gray-400 transition hover:text-gray-600">Beluga vs Flo</Link>
            <Link to="/login" className="text-[12px] text-gray-400 transition hover:text-gray-600">Sign In</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            <Link to="/support" className="text-[12px] text-gray-400 transition hover:text-gray-600">Support</Link>
            <Link to="/privacy" className="text-[12px] text-gray-400 transition hover:text-gray-600">Privacy Policy</Link>
            <Link to="/terms" className="text-[12px] text-gray-400 transition hover:text-gray-600">Terms of Service</Link>
          </div>
          <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} Beluga — Made in Canada</p>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  )
}
