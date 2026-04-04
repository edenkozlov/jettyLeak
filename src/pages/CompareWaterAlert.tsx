import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE = 'Beluga vs Water Alert: Traditional vs Intelligent Water Monitoring'
const META_DESCRIPTION =
  'Compare Beluga and Water Alert. Traditional leak detection hardware versus intelligent water monitoring for buildings.'

const COMPARISON_ROWS: { feature: string; beluga: string; waterAlert: string }[] = [
  { feature: 'Core purpose', beluga: 'Water intelligence platform', waterAlert: 'Leak detection hardware' },
  { feature: 'Installation', beluga: 'Non-invasive', waterAlert: 'Sensor-based install' },
  { feature: 'Leak detection', beluga: 'Yes (pattern-based)', waterAlert: 'Yes (moisture sensors)' },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    waterAlert: 'Limited / depends on setup',
  },
  { feature: 'Usage insights', beluga: 'Yes', waterAlert: 'No' },
  { feature: 'System intelligence', beluga: 'Yes', waterAlert: 'No' },
  { feature: 'Target use case', beluga: 'Commercial / multi-unit', waterAlert: 'Commercial / industrial' },
  { feature: 'Monitoring type', beluga: 'Continuous analysis', waterAlert: 'Event-based detection' },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is Water Alert the same as a smart water monitor?',
    a: 'Water Alert focuses on hardware-based detection (for example moisture sensors and alarms). Beluga emphasizes ongoing analysis of water behavior across the system.',
  },
  {
    q: 'Can the two approaches be used together?',
    a: 'Depending on the building, some teams combine point sensors with broader monitoring. Each system should be evaluated on its own merits and compatibility.',
  },
]

export default function CompareWaterAlert() {
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

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">Comparison</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Beluga vs Water Alert
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
            A neutral overview of traditional detection versus system-level intelligence.
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                Leak detection products range from simple sensor-and-alarm setups to platforms that
                interpret water use over time. The right fit depends on your building, risk profile,
                and how much visibility you need.
              </p>
              <p>
                This page compares Beluga and Water Alert using publicly available information to
                clarify how their approaches differ.
              </p>
            </div>
          </section>

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
                    <th className="py-3 pl-4 font-semibold text-gray-700">Water Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-gray-50/60' : ''}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{row.feature}</td>
                      <td className="py-3 px-4 text-gray-600">{row.beluga}</td>
                      <td className="py-3 pl-4 text-gray-600">{row.waterAlert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Key difference in approach
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">Water Alert</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Water Alert provides hardware-based leak detection systems, primarily focused on
                  detecting moisture and triggering alarms.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">Beluga</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga focuses on interpreting water behavior over time, offering a more data-driven
                  view of the system rather than only reacting to leaks.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              When each solution makes sense
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Water Alert may be a strong fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    You operate in simpler environments with straightforward detection needs
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    You need basic leak detection and alarms
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    You prefer a low-complexity hardware setup
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
                    You manage complex buildings with varied usage patterns
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    You want ongoing insights and monitoring, not only alarms
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    You want to understand system performance over time
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">About Beluga</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                Beluga is a water intelligence platform designed to help buildings better understand
                their plumbing systems.
              </p>
              <p>
                Using a non-invasive sensor approach, it provides continuous insight into water usage,
                system behavior, and potential inefficiencies — without requiring modifications to
                existing infrastructure.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Frequently asked questions
            </h2>
            <dl className="mx-auto mt-10 max-w-2xl divide-y divide-gray-200">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="py-6 first:pt-0 last:pb-0">
                  <dt className="text-[15px] font-semibold text-gray-900 sm:text-[16px]">{item.q}</dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
            <h3 className="text-[13px] font-semibold tracking-wide text-gray-500 uppercase">Disclaimer</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
              This page is for informational purposes only. Information is based on publicly available
              sources and may change. This content is not affiliated with or endorsed by Water Alert.
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-gray-100 pt-12 sm:mt-24 sm:pt-16">
          <div className="mx-auto max-w-lg text-center sm:text-left">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Get Beluga</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              Early access, building water assessments, and a clear read on whether Beluga is the right
              tool for you.
            </p>
            <Link
              to="/quote"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 hover:shadow-xl sm:w-auto"
            >
              Get Beluga
            </Link>
          </div>

          <div className="mx-auto mt-12 max-w-lg border-t border-gray-100 pt-12 text-center sm:text-left">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Get Water Alert</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              Product details are on Water Alert&apos;s site—we don&apos;t sell or install their hardware.
            </p>
            <a
              href="https://www.wateralert.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition hover:bg-gray-800 hover:shadow-xl sm:w-auto"
            >
              Get Water Alert
            </a>
          </div>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
