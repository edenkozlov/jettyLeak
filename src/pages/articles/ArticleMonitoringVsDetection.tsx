import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE =
  "Water Monitoring vs Leak Detection: What's the Difference? — Beluga"
const META_DESCRIPTION =
  'Water monitoring and leak detection solve different problems. Learn the key differences, where confusion happens, and how to choose the right approach for your building.'

const sectionCls = 'mb-10 sm:mb-12'
const h2Cls =
  'text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]'
const pCls = 'text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const listCls =
  'list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]'
const inlineLinkCls = 'text-indigo-600 underline decoration-indigo-600/30 underline-offset-2 hover:decoration-indigo-600'

export default function ArticleMonitoringVsDetection() {
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
            Water Monitoring vs Leak Detection
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">What's the difference?</p>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Intro */}
        <section className={sectionCls}>
          <p className={pCls}>
            Water monitoring and leak detection are often used interchangeably.
          </p>
          <p className={`${pCls} mt-4`}>They shouldn't be.</p>
          <p className={`${pCls} mt-4`}>
            While both deal with water systems, they are designed to solve different problems — and confusing them can lead to choosing the wrong solution entirely. If you're starting from scratch, it helps to first understand <Link to="/articles/what-is-water-monitoring-system" className={inlineLinkCls}>what a water monitoring system actually is</Link>.
          </p>
        </section>

        {/* What is leak detection */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>What is leak detection?</h2>
            <p className={`${pCls} mt-4`}>
              Leak detection systems are designed to identify abnormal water flow and alert users when something is wrong.
            </p>
            <p className={`${pCls} mt-4`}>They typically:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Detect sudden changes in flow</li>
              <li>Trigger alerts</li>
              <li>Sometimes shut off water automatically</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              Their primary goal is <strong className="text-gray-900">to react quickly when a leak occurs</strong>.
            </p>
            <p className={`${pCls} mt-4`}>These systems are commonly used in:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Residential homes</li>
              <li>Environments where immediate damage prevention is critical</li>
            </ul>
            <p className={`${pCls} mt-4`}>Products like <Link to="/flo-by-moen-alternative" className={inlineLinkCls}>Flo by Moen</Link> and <Link to="/phyn-alternative" className={inlineLinkCls}>Phyn</Link> are common examples.</p>
          </div>
        </section>

        {/* What is water monitoring */}
        <section className={sectionCls}>
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <h2 className={h2Cls}>What is water monitoring?</h2>
            <p className={`${pCls} mt-4`}>
              Water monitoring systems take a broader approach.
            </p>
            <p className={`${pCls} mt-4`}>
              Instead of focusing only on leak events, they aim to understand how water is being used over time.
            </p>
            <p className={`${pCls} mt-4`}>They typically:</p>
            <ul className={`${listCls} mt-3`}>
              <li>Track usage continuously</li>
              <li>Identify patterns</li>
              <li>Detect anomalies</li>
              <li>Provide insight into system behavior</li>
            </ul>
            <p className={`${pCls} mt-4`}>
              Their goal is <strong className="text-gray-900">to understand the system, not just react to problems</strong>.
            </p>
          </div>
        </section>

        {/* The key difference */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>The key difference</h2>
          <p className={`${pCls} mt-4`}>The simplest way to think about it:</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">Leak Detection</p>
              <p className="mt-2 text-[17px] font-semibold text-gray-900">Event-based</p>
              <p className={`${pCls} mt-2`}>"Is something wrong right now?"</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 text-center">
              <p className="text-[13px] font-semibold tracking-wide text-indigo-500 uppercase">Water Monitoring</p>
              <p className="mt-2 text-[17px] font-semibold text-gray-900">Continuous</p>
              <p className={`${pCls} mt-2`}>"What is happening in this system over time?"</p>
            </div>
          </div>
        </section>

        {/* Where confusion happens */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Where confusion happens</h2>
          <p className={`${pCls} mt-4`}>Many modern systems include elements of both.</p>
          <p className={`${pCls} mt-4`}>For example:</p>
          <ul className={`${listCls} mt-3`}>
            <li>A monitoring system may also detect anomalies</li>
            <li>A leak detection system may provide basic usage data</li>
          </ul>
          <p className={`${pCls} mt-4`}>But the core design philosophy still differs.</p>
          <div className="mt-4 space-y-3">
            <p className={pCls}>
              Some systems are built primarily to <strong className="text-gray-900">react and protect</strong>.
            </p>
            <p className={pCls}>
              Others are built to <strong className="text-gray-900">observe and understand</strong>.
            </p>
          </div>
        </section>

        {/* Why it matters in real buildings */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Why it matters in real buildings</h2>
          <p className={`${pCls} mt-4`}>In smaller environments, leak detection may be enough.</p>
          <p className={`${pCls} mt-4`}>In larger or more complex buildings, the picture changes.</p>
          <p className={`${pCls} mt-4`}>Issues often develop gradually:</p>
          <ul className={`${listCls} mt-3`}>
            <li>Inefficient fixtures</li>
            <li>Continuous low-level leaks</li>
            <li>Abnormal usage patterns</li>
          </ul>
          <p className={`${pCls} mt-4`}>
            These don't always trigger immediate alerts — but they still impact cost and performance.
          </p>
          <p className={`${pCls} mt-4`}>That's where monitoring becomes more valuable. For a deeper look, see <Link to="/articles/why-leak-detection-not-enough-commercial" className={inlineLinkCls}>why leak detection alone isn't enough for commercial buildings</Link>.</p>
        </section>

        {/* Which one should you choose */}
        <section className={sectionCls}>
          <h2 className={h2Cls}>Which one should you choose?</h2>
          <p className={`${pCls} mt-4`}>It depends on the goal.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <p className="text-[14px] font-semibold text-gray-900">Choose leak detection if:</p>
              <ul className={`${listCls} mt-3`}>
                <li>Immediate protection is the priority</li>
                <li>You want automatic shutoff</li>
                <li>The environment is simple</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
              <p className="text-[14px] font-semibold text-gray-900">Choose water monitoring if:</p>
              <ul className={`${listCls} mt-3`}>
                <li>You need visibility over time</li>
                <li>The system is complex</li>
                <li>You want to understand usage and inefficiencies</li>
              </ul>
            </div>
          </div>
          <p className={`${pCls} mt-4`}>
            In some cases, the two approaches can complement each other. Our <Link to="/best-water-monitoring-systems" className={inlineLinkCls}>guide to the best water monitoring systems</Link> covers how different approaches compare.
          </p>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6">
          <p className={`${pCls} font-medium text-gray-700`}>
            Water monitoring and leak detection are not competing ideas — they are different tools.
          </p>
          <p className={`${pCls} mt-3`}>
            Understanding the difference is what allows you to choose the right approach for your building.
          </p>
        </section>

        {/* Related reading */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gray-400 uppercase">Related reading</p>
          <div className="mt-3 space-y-3">
            <Link
              to="/articles/4-types-of-water-monitoring-systems"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">4 Types of Water Monitoring Systems</p>
              <p className="mt-1 text-[14px] text-gray-500">Understanding the different approaches in the water monitoring space.</p>
            </Link>
            <Link
              to="/articles/why-leak-detection-not-enough-commercial"
              className="block rounded-xl border border-gray-200 p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <p className="text-[17px] font-semibold text-gray-900">Why Leak Detection Alone Isn't Enough</p>
              <p className="mt-1 text-[14px] text-gray-500">Why commercial buildings need more than just leak alerts.</p>
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
