import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  "There Are 4 Types of Water Monitoring Systems — Here's the Difference — Beluga"
const META_DESCRIPTION =
  'Not all water monitoring systems are the same. Learn the 4 types — leak detection, shutoff, non-invasive monitoring, and water intelligence — and how to choose.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleFourTypes() {
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
            There Are 4 Types of Water Monitoring Systems
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">Here's the difference</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            Most people assume water monitoring systems are all built the same way.
          </p>
          <p className={`${pCls} mt-4`}>They're not.</p>
          <p className={`${pCls} mt-4`}>
            What looks like a single category is actually made up of different approaches — each designed for a specific purpose.
          </p>
          <p className={`${pCls} mt-4`}>
            Understanding these types is the fastest way to make sense of the space.
          </p>
        </section>

        {/* The 4 types */}
        <section className={sectionCls}>
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>Type 1: Leak detection systems</h2>
              <p className={`${pCls} mt-4`}>
                Leak detection systems are designed to identify abnormal water flow and alert users.
              </p>
              <p className={`${pCls} mt-4`}>They focus on:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Detecting leaks quickly</li>
                <li>Notifying users</li>
                <li>Minimizing damage</li>
              </ul>
              <p className={`${pCls} mt-4`}>They are:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Reactive</li>
                <li>Event-driven</li>
                <li>Widely used in residential settings</li>
              </ul>
              <p className={`${pCls} mt-4`}>
                To understand how leak detection differs from broader monitoring, see <Link to="/articles/water-monitoring-vs-leak-detection" className={inlineLinkCls}>water monitoring vs leak detection</Link>.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>Type 2: Shutoff systems</h2>
              <p className={`${pCls} mt-4`}>
                Shutoff systems build on leak detection by automatically stopping water flow when an issue is detected.
              </p>
              <p className={`${pCls} mt-4`}>They:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Detect abnormal behavior</li>
                <li>Trigger a shutoff valve</li>
                <li>Prevent further damage</li>
              </ul>
              <p className={`${pCls} mt-4`}>These systems are often used where:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Risk mitigation is the primary concern</li>
              </ul>
              <p className={`${pCls} mt-4`}>
                Products like <Link to="/flo-by-moen-alternative" className={inlineLinkCls}>Flo by Moen</Link> and <Link to="/phyn-alternative" className={inlineLinkCls}>Phyn</Link> fall into this category.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>Type 3: Non-invasive monitoring systems</h2>
              <p className={`${pCls} mt-4`}>
                Non-invasive systems aim to monitor water usage without modifying existing plumbing.
              </p>
              <p className={`${pCls} mt-4`}>They typically:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Install externally</li>
                <li>Track water flow</li>
                <li>Provide usage data</li>
              </ul>
              <p className={`${pCls} mt-4`}>They are useful when:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Installation constraints exist</li>
                <li>Modifying infrastructure is not practical</li>
              </ul>
              <p className={`${pCls} mt-4`}>
                For a deeper comparison, see <Link to="/articles/non-invasive-vs-inline-water-monitoring" className={inlineLinkCls}>non-invasive vs inline water monitoring</Link>.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <h2 className={h2Cls}>Type 4: Water intelligence systems</h2>
              <p className={`${pCls} mt-4`}>
                Water intelligence systems take a system-level approach.
              </p>
              <p className={`${pCls} mt-4`}>
                Instead of focusing on individual events, they aim to understand how the entire water system behaves over time.
              </p>
              <p className={`${pCls} mt-4`}>They:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Track usage continuously</li>
                <li>Identify patterns</li>
                <li>Detect anomalies early</li>
                <li>Provide insight into system performance</li>
              </ul>
              <p className={`${pCls} mt-4`}>This approach is designed for:</p>
              <ul className={`${listCls} mt-3`}>
                <li>More complex buildings</li>
                <li>Environments where visibility matters</li>
              </ul>
              <p className={`${pCls} mt-4`}>
                Learn more about <Link to="/articles/what-is-water-intelligence-system" className={inlineLinkCls}>what a water intelligence system is and why it's different</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Why these types matter */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why these types matter</h2>
          <p className={`${pCls} mt-4`}>
            Without this breakdown, it's easy to compare systems incorrectly.
          </p>
          <p className={`${pCls} mt-4`}>For example:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Comparing a shutoff system to a monitoring system</li>
            <li>Expecting detailed insights from a system designed only for alerts</li>
          </ul>
          <p className={`${pCls} mt-4`}>Each type is built with a different goal in mind.</p>
        </section>

        {/* How to use this framework */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>How to use this framework</h2>
          <p className={`${pCls} mt-4`}>Instead of asking:</p>
          <p className={`${pCls} mt-2 italic`}>"What's the best system?"</p>
          <p className={`${pCls} mt-4`}>Ask:</p>
          <p className={`${pCls} mt-2 italic`}>"What type of system do I actually need?"</p>
          <p className={`${pCls} mt-4`}>
            Once that's clear, the options become much easier to evaluate.
          </p>
          <p className={`${pCls} mt-4`}>
            Our <Link to="/articles/how-to-choose-water-monitoring-system" className={inlineLinkCls}>guide to choosing a water monitoring system</Link> walks through this process step by step.
          </p>
        </section>

        {/* Quick summary */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Quick summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">Leak detection</p>
              <p className={`${pCls} mt-1`}>Alerts when something goes wrong</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">Shutoff systems</p>
              <p className={`${pCls} mt-1`}>Stop water automatically</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-[14px] font-semibold text-gray-900">Non-invasive monitoring</p>
              <p className={`${pCls} mt-1`}>Tracks usage without installation complexity</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-[14px] font-semibold text-gray-900">Water intelligence</p>
              <p className={`${pCls} mt-1`}>Understands the system over time</p>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Water monitoring isn't one category — it's a set of different approaches.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding the differences is what allows you to choose a system that actually fits your building.
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
              <p className="mt-1 text-[14px] text-gray-500">Understanding the basics before choosing a system.</p>
            </Link>
            <Link
              to="/articles/how-to-choose-water-monitoring-system"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">How to Choose a Water Monitoring System</p>
              <p className="mt-1 text-[14px] text-gray-500">Matching the system to how your building actually operates.</p>
            </Link>
            <Link
              to="/best-water-monitoring-systems"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Best Water Monitoring Systems for Buildings</p>
              <p className="mt-1 text-[14px] text-gray-500">Compare the top systems side by side.</p>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
