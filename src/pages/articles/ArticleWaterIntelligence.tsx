import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  "What Is a Water Intelligence System? (And Why It's Different) — Beluga"
const META_DESCRIPTION =
  "Water intelligence goes beyond leak detection and usage monitoring. Learn what it means, how it differs from traditional approaches, and where it becomes valuable."

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleWaterIntelligence() {
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
            What Is a Water Intelligence System?
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">And why it's different</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            As water monitoring evolves, a new term is starting to appear: <strong className="text-gray-900">water intelligence</strong>.
          </p>
          <p className={`${pCls} mt-4`}>At first glance, it sounds similar to existing systems.</p>
          <p className={`${pCls} mt-4`}>
            But it represents a different way of thinking about how water systems are observed and managed.
          </p>
        </section>

        {/* Traditional approaches */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Traditional approaches</h2>
          <p className={`${pCls} mt-4`}>Most traditional systems fall into one of two categories:</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Leak detection</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Usage monitoring</p>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>They are designed to:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Detect events</li>
            <li>Track consumption</li>
            <li>Trigger alerts</li>
          </ul>
          <p className={`${pCls} mt-4`}>
            These approaches are useful, but they focus on specific aspects of the system. For a full breakdown, see our guide to the <Link to="/articles/4-types-of-water-monitoring-systems" className={inlineLinkCls}>4 types of water monitoring systems</Link>.
          </p>
        </section>

        {/* What water intelligence means */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 sm:p-6">
            <h2 className={h2Cls}>What water intelligence means</h2>
            <p className={`${pCls} mt-4`}>A water intelligence system takes a broader view.</p>
            <p className={`${pCls} mt-4`}>
              Instead of focusing only on events or measurements, it aims to understand how the system behaves as a whole.
            </p>
            <p className={`${pCls} mt-4`}>This includes:</p>
            <ul className={`${listCls} mt-3`}>
              <li>How water flows through the building</li>
              <li>How different fixtures behave</li>
              <li>How usage patterns evolve over time</li>
              <li>Where anomalies or inefficiencies occur</li>
            </ul>
          </div>
        </section>

        {/* From data to understanding */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>From data to understanding</h2>
          <p className={`${pCls} mt-4`}>The key difference is not just collecting data — it's interpreting it.</p>
          <p className={`${pCls} mt-4`}>A water intelligence system:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Builds a model of the system</li>
            <li>Identifies patterns</li>
            <li>Detects deviations from normal behavior</li>
          </ul>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-2 text-center">
              <p className="text-[13px] text-gray-500">Raw data</p>
            </div>
            <svg className="h-4 w-4 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 px-4 py-2 text-center">
              <p className="text-[13px] font-medium text-indigo-700">Meaningful insight</p>
            </div>
          </div>
        </section>

        {/* Why this matters in buildings */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why this matters in buildings</h2>
          <p className={`${pCls} mt-4`}>In complex environments, issues are not always obvious.</p>
          <p className={`${pCls} mt-4`}>They can develop gradually:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Small leaks</li>
            <li>Inefficient fixtures</li>
            <li>Unusual usage patterns</li>
          </ul>
          <p className={`${pCls} mt-4`}>Without context, these are hard to detect early. This visibility gap is explored in depth in <Link to="/articles/why-leak-detection-not-enough-commercial" className={inlineLinkCls}>why leak detection alone isn't enough for commercial buildings</Link>.</p>
          <p className={`${pCls} mt-4`}>
            A system that understands normal behavior can identify when something changes — even if it's subtle.
          </p>
        </section>

        {/* How it differs from monitoring */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>How it differs from monitoring</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">Monitoring</p>
              <p className={`${pCls} mt-2`}>"What is happening?"</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-indigo-500 uppercase">Water Intelligence</p>
              <p className={`${pCls} mt-2`}>"What does this mean?"</p>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>That shift changes how information is used. We explore this further in <Link to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls}>water monitoring vs leak detection</Link>.</p>
        </section>

        {/* Where it becomes valuable */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Where it becomes valuable</h2>
          <p className={`${pCls} mt-4`}>Water intelligence becomes more useful as:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Building complexity increases</li>
            <li>The number of fixtures grows</li>
            <li>The cost of inefficiency rises</li>
            <li>Long-term visibility becomes important</li>
          </ul>
          <p className={`${pCls} mt-4`}>It is particularly relevant in:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Commercial buildings</li>
            <li>Multi-unit properties</li>
          </ul>
          <p className={`${pCls} mt-4`}>See our guide to the <Link to="/articles/best-water-monitoring-commercial-buildings" className={inlineLinkCls}>best water monitoring systems for commercial buildings</Link> for system recommendations.</p>
        </section>

        {/* Not a replacement */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Not a replacement, but an evolution</h2>
          <p className={`${pCls} mt-4`}>Water intelligence does not replace existing approaches. It builds on them.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Detection</p>
              <p className={`${pCls} mt-1`}>Still matters</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Monitoring</p>
              <p className={`${pCls} mt-1`}>Still matters</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Intelligence</p>
              <p className={`${pCls} mt-1`}>Adds another layer</p>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Water intelligence represents a shift from reacting to events to understanding systems.
          </p>
          <p className={`${pCls} mt-3`}>
            As buildings become more complex, that shift becomes increasingly important.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/how-property-managers-handle-water-issues"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">How Property Managers Handle Water Issues</p>
              <p className="mt-1 text-[14px] text-gray-500">People, processes, and constraints — the real workflow.</p>
            </Link>
            <Link
              to="/articles/4-types-of-water-monitoring-systems"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">4 Types of Water Monitoring Systems</p>
              <p className="mt-1 text-[14px] text-gray-500">Understanding the different approaches in the water monitoring space.</p>
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
