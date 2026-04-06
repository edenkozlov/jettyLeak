import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  'What Is a Water Monitoring System? (And Why Most Are Different) — Beluga'
const META_DESCRIPTION =
  'Learn what a water monitoring system really is, the four types of systems, and why understanding the underlying approach matters when choosing one.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const h3Cls = 'text-[17px] font-semibold text-gray-900'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleWhatIsWaterMonitoring() {
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
            What Is a Water Monitoring System?
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">And why most are different</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            A water monitoring system is typically described as something that tracks water usage and detects leaks.
          </p>
          <p className={`${pCls} mt-4`}>That definition is technically correct.</p>
          <p className={`${pCls} mt-4`}>But in practice, it's incomplete.</p>
          <p className={`${pCls} mt-4`}>
            Because most water monitoring systems are not built the same way — and more importantly, they are not solving the same problem.
          </p>
          <p className={`${pCls} mt-4`}>Understanding that difference is what actually matters.</p>
        </section>

        {/* Basic definition */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>What a water monitoring system does (basic definition)</h2>
          <p className={`${pCls} mt-4`}>At a high level, a water monitoring system is designed to:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Measure water flow</li>
            <li>Detect abnormal usage</li>
            <li>Identify potential leaks</li>
            <li>Alert users or trigger actions</li>
          </ul>
          <p className={`${pCls} mt-4`}>Some systems go further by:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Tracking usage over time</li>
            <li>Identifying patterns</li>
            <li>Providing insight into how water is being used</li>
          </ul>
          <p className={`${pCls} mt-4`}>This is the standard definition you'll find almost everywhere.</p>
        </section>

        {/* Why misleading */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why that definition is misleading</h2>
          <p className={`${pCls} mt-4`}>
            The problem is that this definition groups very different systems into one category.
          </p>
          <p className={`${pCls} mt-4`}>In reality, there are multiple approaches:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Some systems focus on detecting leaks as they happen</li>
            <li>Some focus on shutting off water immediately</li>
            <li>Some track usage patterns</li>
            <li>Some try to understand the behavior of the entire system</li>
          </ul>
          <p className={`${pCls} mt-4`}>We explore this distinction in more detail in our guide to <Link to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls}>water monitoring vs leak detection</Link>.</p>
          <p className={`${pCls} mt-4`}>From the outside, they all look similar.</p>
          <p className={`${pCls} mt-4`}>In practice, they operate very differently.</p>
        </section>

        {/* The 4 types */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>The 4 types of water monitoring systems</h2>
          <p className={`${pCls} mt-4`}>
            A more useful way to think about the category is to break it into four types.
          </p>

          <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>1. Leak detection systems</h3>
              <p className={`${pCls} mt-3`}>These systems are designed to identify abnormal flow and alert users.</p>
              <p className={`${pCls} mt-3`}>They are typically:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Reactive</li>
                <li>Event-driven</li>
                <li>Focused on identifying problems quickly</li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>2. Shutoff systems</h3>
              <p className={`${pCls} mt-3`}>
                These systems take it a step further by automatically stopping water flow when an issue is detected.
              </p>
              <p className={`${pCls} mt-3`}>They are often used in:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Residential environments</li>
                <li>Situations where immediate protection is the priority</li>
              </ul>
              <p className={`${pCls} mt-3`}>Systems like <Link to="/flo-by-moen-alternative" className={inlineLinkCls}>Flo by Moen</Link> and <Link to="/phyn-alternative" className={inlineLinkCls}>Phyn</Link> are common examples of this approach.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>3. Non-invasive monitoring systems</h3>
              <p className={`${pCls} mt-3`}>
                These systems aim to monitor water usage without modifying existing plumbing.
              </p>
              <p className={`${pCls} mt-3`}>They typically:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Install externally</li>
                <li>Track flow data</li>
                <li>Provide usage insights</li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h3 className={h3Cls}>4. Water intelligence systems</h3>
              <p className={`${pCls} mt-3`}>
                These systems focus on understanding the entire water system over time.
              </p>
              <p className={`${pCls} mt-3`}>They aim to:</p>
              <ul className={`${listCls} mt-2`}>
                <li>Model usage patterns</li>
                <li>Identify inefficiencies</li>
                <li>Detect anomalies early</li>
                <li>Provide system-level visibility</li>
              </ul>
              <p className={`${pCls} mt-3`}>
                This approach is less about reacting to events, and more about continuously understanding how the system behaves. To learn more, see our article on <Link to="/articles/what-is-water-intelligence-system" className={inlineLinkCls}>water intelligence systems</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Why distinction matters */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why this distinction matters</h2>
          <p className={`${pCls} mt-4`}>
            Choosing a water monitoring system without understanding these differences can lead to problems. Before deciding, it helps to <Link to="/best-water-monitoring-systems" className={inlineLinkCls}>compare the best water monitoring systems</Link> side by side.
          </p>
          <div className="mt-4 space-y-4">
            <p className={pCls}>
              A system designed for <strong className="text-gray-900">immediate leak response</strong> may not provide <strong className="text-gray-900">long-term visibility</strong>.
            </p>
            <p className={pCls}>
              A system designed for <strong className="text-gray-900">simple usage tracking</strong> may not scale to <strong className="text-gray-900">complex buildings</strong>.
            </p>
          </div>
          <p className={`${pCls} mt-4`}>The right choice depends on:</p>
          <ul className={`${listCls} mt-3`}>
            <li>The type of building</li>
            <li>The level of visibility required</li>
            <li>How the system will actually be used</li>
          </ul>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Water monitoring systems are often presented as interchangeable. They are not.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding the underlying approach is what allows you to choose a system that actually fits the problem you're trying to solve.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/how-to-choose-water-monitoring-system"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">How to Choose a Water Monitoring System</p>
              <p className="mt-1 text-[14px] text-gray-500">Matching the system to how your building actually operates.</p>
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
              <p className="mt-1 text-[14px] text-gray-500">Compare the top water monitoring solutions for commercial and multi-unit buildings.</p>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
