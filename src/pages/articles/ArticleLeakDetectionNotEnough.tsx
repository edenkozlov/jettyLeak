import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  "Why Leak Detection Alone Isn't Enough for Commercial Buildings — Beluga"
const META_DESCRIPTION =
  "Leak detection is important but incomplete for commercial buildings. Learn why continuous monitoring, baselines, and operational workflows matter more than alerts alone."

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleLeakDetectionNotEnough() {
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
            Why Leak Detection Alone Isn't Enough for Commercial Buildings
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">It's an important tool — but not a complete solution</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            Leak detection is often seen as the core function of water monitoring systems.
          </p>
          <p className={`${pCls} mt-4`}>And for good reason — leaks can cause serious damage.</p>
          <p className={`${pCls} mt-4`}>
            But in commercial and multi-unit buildings, leak detection alone is rarely enough. The distinction between <Link to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls}>water monitoring and leak detection</Link> matters here.
          </p>
        </section>

        {/* The assumption */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>The assumption: leaks are the main problem</h2>
          <p className={`${pCls} mt-4`}>Most systems are built around the idea that water issues equal leaks.</p>
          <p className={`${pCls} mt-4`}>So they focus on:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Detecting abnormal flow</li>
            <li>Sending alerts</li>
            <li>Triggering shutoff mechanisms</li>
          </ul>
          <p className={`${pCls} mt-4`}>This works well for sudden events.</p>
        </section>

        {/* The reality */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>The reality: most issues are not sudden</h2>
          <p className={`${pCls} mt-4`}>In larger buildings, many problems develop gradually.</p>
          <p className={`${pCls} mt-4`}>Examples include:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Small, continuous leaks</li>
            <li>Inefficient fixtures</li>
            <li>Abnormal usage patterns</li>
            <li>System degradation over time</li>
          </ul>
          <p className={`${pCls} mt-4`}>These don't always trigger immediate alerts.</p>
          <p className={`${pCls} mt-4`}>But they still impact:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Water consumption</li>
            <li>Operating costs</li>
            <li>Long-term system performance</li>
          </ul>
        </section>

        {/* The visibility gap */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>The visibility gap</h2>
          <p className={`${pCls} mt-4`}>Leak detection systems typically answer one question:</p>
          <p className={`${pCls} mt-2 italic`}>"Is something wrong right now?"</p>
          <p className={`${pCls} mt-4`}>But they don't always answer:</p>
          <ul className={`${listCls} mt-3`}>
            <li>What is normal usage?</li>
            <li>How is the system changing over time?</li>
            <li>Where are inefficiencies occurring?</li>
          </ul>
          <p className={`${pCls} mt-4`}>Without that context, it's difficult to:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Identify trends</li>
            <li>Optimize usage</li>
            <li>Prevent issues before they escalate</li>
          </ul>
          <p className={`${pCls} mt-4`}>This gap is what drives the need for <Link to="/articles/what-is-water-intelligence-system" className={inlineLinkCls}>water intelligence systems</Link> that go beyond event-based alerts.</p>
        </section>

        {/* Complexity */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Complexity changes the problem</h2>
          <p className={`${pCls} mt-4`}>Commercial buildings are not simple systems.</p>
          <p className={`${pCls} mt-4`}>They involve:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Multiple units</li>
            <li>Shared infrastructure</li>
            <li>Many fixtures and usage patterns</li>
          </ul>
          <p className={`${pCls} mt-4`}>
            In this environment, water behavior is more complex — and harder to interpret with event-based detection alone. Commercial-grade platforms like <Link to="/wint-alternative" className={inlineLinkCls}>WINT</Link> and <Link to="/alert-labs-alternative" className={inlineLinkCls}>Alert Labs</Link> are designed for these environments.
          </p>
        </section>

        {/* Why monitoring matters */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>Why monitoring matters</h2>
            <p className={`${pCls} mt-4`}>Monitoring systems take a broader approach.</p>
            <p className={`${pCls} mt-4`}>They:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Track usage continuously</li>
              <li>Establish baselines</li>
              <li>Identify deviations early</li>
            </ul>
            <p className={`${pCls} mt-4`}>This allows teams to:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Detect issues before they become critical</li>
              <li>Understand how the system behaves</li>
              <li>Make more informed decisions</li>
            </ul>
          </div>
        </section>

        {/* Leak detection still has a role */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Leak detection still has a role</h2>
          <p className={`${pCls} mt-4`}>This doesn't mean leak detection is not useful.</p>
          <p className={`${pCls} mt-4`}>It plays an important role in:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Immediate protection</li>
            <li>Damage prevention</li>
          </ul>
          <p className={`${pCls} mt-4`}>But it represents only one layer of the problem.</p>
        </section>

        {/* A more complete approach */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>A more complete approach</h2>
          <p className={`${pCls} mt-4`}>
            In practice, effective water management often requires:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Detection</p>
              <p className={`${pCls} mt-1`}>To identify events</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Monitoring</p>
              <p className={`${pCls} mt-1`}>To understand patterns</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-center">
              <p className="text-[14px] font-semibold text-gray-900">Workflows</p>
              <p className={`${pCls} mt-1`}>To respond effectively</p>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>Focusing on only one of these leaves gaps. Our <Link to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls}>guide to choosing a water monitoring system</Link> walks through how to balance these factors.</p>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Leak detection is an important tool — but not a complete solution for commercial buildings.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding how water systems behave over time is what enables better visibility, better decisions, and better outcomes.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/what-happens-after-leak-alert"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">What Happens After a Leak Alert</p>
              <p className="mt-1 text-[14px] text-gray-500">Detection is only the first step — here's the full workflow.</p>
            </Link>
            <Link
              to="/articles/best-water-monitoring-commercial-buildings"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Best Water Monitoring Systems for Commercial Buildings</p>
              <p className="mt-1 text-[14px] text-gray-500">A guide to the categories of systems available for commercial environments.</p>
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
