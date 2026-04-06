import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  'How Property Managers Actually Handle Water Issues — Beluga'
const META_DESCRIPTION =
  'Water issues in buildings are handled through people, processes, and constraints. Learn the real workflow — from tenant complaints to resolution — and where systems fit in.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticlePropertyManagers() {
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
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">Article</p>
          <h1 className="mt-5 text-[26px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[42px]">
            How Property Managers Actually Handle Water Issues
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">People, processes, and constraints</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            Water issues in buildings are often discussed in terms of detection.
          </p>
          <p className={`${pCls} mt-4`}>
            But in practice, they're handled through people, processes, and constraints.
          </p>
          <p className={`${pCls} mt-4`}>
            Understanding how property managers actually deal with these situations gives a much clearer picture of what matters — and where systems succeed or fall short.
          </p>
        </section>

        {/* Workflow steps */}
        <section className={sectionCls}>
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">1</span>
                <h2 className="text-[17px] font-semibold text-gray-900">It usually starts with a complaint</h2>
              </div>
              <p className={`${pCls} mt-3`}>
                In many buildings, the first sign of a water issue isn't a system alert. It's a tenant.
              </p>
              <div className="mt-3 space-y-1 border-l-2 border-gray-200 pl-4">
                <p className={`${pCls} italic`}>"There's water under the sink"</p>
                <p className={`${pCls} italic`}>"The toilet keeps running"</p>
                <p className={`${pCls} italic`}>"Something doesn't feel right"</p>
              </div>
              <p className={`${pCls} mt-3`}>This kicks off the process.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">2</span>
                <h2 className="text-[17px] font-semibold text-gray-900">The issue is logged</h2>
              </div>
              <p className={`${pCls} mt-3`}>The property manager or staff member:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Logs the issue</li>
                <li>Creates a work order</li>
                <li>Assigns it to maintenance</li>
              </ul>
              <p className={`${pCls} mt-3`}>Depending on the building, this might happen in:</p>
              <ul className={`${listCls} mt-2`}>
                <li>A property management system</li>
                <li>A spreadsheet</li>
                <li>Or even manually</li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">3</span>
                <h2 className="text-[17px] font-semibold text-gray-900">Initial investigation</h2>
              </div>
              <p className={`${pCls} mt-3`}>Maintenance staff check the problem on-site.</p>
              <p className={`${pCls} mt-3`}>They may:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Inspect fixtures</li>
                <li>Look for visible leaks</li>
                <li>Test water flow</li>
              </ul>
              <p className={`${pCls} mt-3`}>At this stage, a lot depends on:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Experience</li>
                <li>Available information</li>
                <li>Access to the right areas</li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">4</span>
                <h2 className="text-[17px] font-semibold text-gray-900">Escalation if needed</h2>
              </div>
              <p className={`${pCls} mt-3`}>If the issue isn't obvious or requires more work:</p>
              <ul className={`${listCls} mt-2`}>
                <li>A plumber may be called</li>
                <li>Additional inspection is scheduled</li>
                <li>The issue may be deferred</li>
              </ul>
              <p className={`${pCls} mt-3`}>This can introduce delays, especially in larger properties.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">5</span>
                <h2 className="text-[17px] font-semibold text-gray-900">Resolution</h2>
              </div>
              <p className={`${pCls} mt-3`}>Once the problem is identified, it is fixed.</p>
              <p className={`${pCls} mt-3`}>But by this point:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Time has passed</li>
                <li>Water may have been wasted</li>
                <li>The issue may have affected other parts of the system</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Where systems fit in */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Where systems fit in</h2>
          <p className={`${pCls} mt-4`}>
            Water monitoring systems are often introduced to improve this process.
          </p>
          <p className={`${pCls} mt-4`}>They can:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Detect issues earlier</li>
            <li>Provide alerts</li>
            <li>Reduce reliance on tenant reports</li>
          </ul>
          <p className={`${pCls} mt-4`}>But they don't replace the workflow. They become part of it. Understanding <Link to="/articles/what-happens-after-leak-alert" className={inlineLinkCls}>what happens after a leak alert</Link> shows how detection fits into operations.</p>
        </section>

        {/* The real challenge */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>The real challenge</h2>
          <p className={`${pCls} mt-4`}>The challenge isn't just detecting problems.</p>
          <p className={`${pCls} mt-4`}>It's:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Turning signals into clear actions</li>
            <li>Integrating with existing workflows</li>
            <li>Reducing time between detection and resolution</li>
          </ul>
          <p className={`${pCls} mt-4`}>
            Without that, even the best detection system has limited impact. This is also <Link to="/articles/why-leak-detection-not-enough-commercial" className={inlineLinkCls}>why leak detection alone isn't enough for commercial buildings</Link>.
          </p>
        </section>

        {/* What actually helps */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>What actually helps</h2>
          <p className={`${pCls} mt-4`}>From a practical standpoint, useful systems tend to:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Provide clear, actionable information</li>
            <li>Reduce ambiguity</li>
            <li>Help prioritize issues</li>
            <li>Fit into existing operational processes</li>
          </ul>
          <p className={`${pCls} mt-4`}>For guidance on matching systems to workflows, see <Link to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls}>how to choose a water monitoring system</Link>.</p>
          <p className={`${pCls} mt-4`}>
            Because ultimately, property management is operational — not just technical.
          </p>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Water issues in buildings are not just technical events. They're operational problems handled by people.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding that reality is key to choosing tools that actually make a difference. Explore options in our <Link to="/best-water-monitoring-systems" className={inlineLinkCls}>comparison of the best water monitoring systems</Link>.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/what-is-water-intelligence-system"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">What Is a Water Intelligence System?</p>
              <p className="mt-1 text-[14px] text-gray-500">From reacting to events to understanding systems.</p>
            </Link>
            <Link
              to="/articles/what-happens-after-leak-alert"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">What Happens After a Leak Alert</p>
              <p className="mt-1 text-[14px] text-gray-500">Detection is only the first step — here's the full workflow.</p>
            </Link>
            <Link
              to="/best-water-monitoring-systems"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Best Water Monitoring Systems for Buildings</p>
              <p className="mt-1 text-[14px] text-gray-500">Compare the top systems across categories and building types.</p>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
