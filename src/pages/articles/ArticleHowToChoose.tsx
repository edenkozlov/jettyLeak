import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  'How to Choose a Water Monitoring System for Your Building — Beluga'
const META_DESCRIPTION =
  'A practical guide to choosing the right water monitoring system based on building type, goals, installation constraints, and operational workflow.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleHowToChoose() {
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
            How to Choose a Water Monitoring System for Your Building
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">It's about matching the system to how your building actually operates.</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            Choosing a water monitoring system isn't just about features.
          </p>
          <p className={`${pCls} mt-4`}>
            It's about matching the system to how your building actually operates.
          </p>
          <p className={`${pCls} mt-4`}>Most comparison pages focus on specs.</p>
          <p className={`${pCls} mt-4`}>
            In practice, the decision is driven by something else entirely.
          </p>
        </section>

        {/* 1. Building type */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>1. Start with the type of building</h2>
            <p className={`${pCls} mt-4`}>The first question is simple: what type of building are you dealing with?</p>
            <ul className={`${listCls} mt-3`}>
              <li>Single-family homes</li>
              <li>Multi-unit residential</li>
              <li>Commercial buildings</li>
            </ul>
            <p className={`${pCls} mt-4`}>Different environments have:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Different risks</li>
              <li>Different levels of complexity</li>
              <li>Different operational workflows</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              A system that works well in a home may not translate to a multi-unit building.
            </p>
          </div>
        </section>

        {/* 2. Define the goal */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>2. Define the goal</h2>
            <p className={`${pCls} mt-4`}>Most systems are designed around one of two goals:</p>
            <ul className={`${listCls} mt-3`}>
              <li><strong className="text-gray-900">Immediate protection</strong></li>
              <li><strong className="text-gray-900">Long-term visibility</strong></li>
            </ul>
            <p className={`${pCls} mt-4`}>
              If the priority is stopping leaks instantly, look at shutoff systems.
            </p>
            <p className={`${pCls} mt-4`}>
              If the priority is understanding usage and inefficiencies, look at monitoring or <Link to="/articles/what-is-water-intelligence-system" className={inlineLinkCls}>water intelligence systems</Link>.
            </p>
            <p className={`${pCls} mt-4`}>
              Trying to optimize for both without understanding the tradeoff often leads to confusion.
            </p>
          </div>
        </section>

        {/* 3. Installation constraints */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>3. Consider installation constraints</h2>
            <p className={`${pCls} mt-4`}>Installation is often overlooked.</p>
            <p className={`${pCls} mt-4`}>Some systems require:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Cutting into pipes</li>
              <li>Installing inline hardware</li>
              <li>Professional plumbing work</li>
            </ul>
            <p className={`${pCls} mt-4`}>Others:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Install externally</li>
              <li>Require minimal setup</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              This is the core tradeoff between <Link to="/articles/non-invasive-vs-inline-water-monitoring" className={inlineLinkCls}>non-invasive and inline water monitoring</Link>. In older buildings or large properties, it can be a deciding factor.
            </p>
          </div>
        </section>

        {/* 4. After detection */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>4. Think about what happens after detection</h2>
            <p className={`${pCls} mt-4`}>
              This is one of the most important — and most ignored — considerations.
            </p>
            <p className={`${pCls} mt-4`}>When a system detects an issue:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Who gets notified?</li>
              <li>How is it handled?</li>
              <li>How quickly does someone act?</li>
            </ul>
            <p className={`${pCls} mt-4`}>In real-world settings, alerts often turn into:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Emails</li>
              <li>Messages</li>
              <li>Manual follow-ups</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              If the system doesn't integrate into operations, its effectiveness drops significantly. Understanding <Link to="/articles/what-happens-after-leak-alert" className={inlineLinkCls}>what actually happens after a leak alert</Link> can help set expectations.
            </p>
          </div>
        </section>

        {/* 5. System visibility */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>5. Evaluate system visibility</h2>
            <p className={`${pCls} mt-4`}>Some systems tell you:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Something is wrong</li>
            </ul>
            <p className={`${pCls} mt-4`}>Others help you understand:</p>
            <ul className={`${listCls} mt-3`}>
              <li>What is happening</li>
              <li>Where it's happening</li>
              <li>How it's changing over time</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              That difference becomes more important as building complexity increases.
            </p>
          </div>
        </section>

        {/* 6. Match to workflow */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>6. Match the system to your workflow</h2>
            <p className={`${pCls} mt-4`}>
              Ultimately, the best system is the one that fits how your team works.
            </p>
            <p className={`${pCls} mt-4`}>Not the most advanced, or the most popular.</p>
            <p className={`${pCls} mt-4`}>But the one that aligns with:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Your building</li>
              <li>Your constraints</li>
              <li>Your operational reality</li>
            </ul>
          </div>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Choosing a water monitoring system is less about comparing features and more about understanding how different approaches fit different environments. Our <Link to="/best-water-monitoring-systems" className={inlineLinkCls}>comparison of the best water monitoring systems</Link> can help you start evaluating options.
          </p>
          <p className={`${pCls} mt-3`}>
            Once that becomes clear, the decision becomes much simpler.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/what-is-water-monitoring-system"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">What Is a Water Monitoring System?</p>
              <p className="mt-1 text-[14px] text-gray-500">Understanding the four types of water monitoring systems.</p>
            </Link>
            <Link
              to="/articles/non-invasive-vs-inline-water-monitoring"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Non-Invasive vs Inline Water Monitoring</p>
              <p className="mt-1 text-[14px] text-gray-500">Understanding the tradeoffs between installation approaches.</p>
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
