import { Link } from 'react-router'

import {
  CompareNav,
  CompareFaq,
  FaqSchema,
  BreadcrumbSchema,
  usePageSeo,
  ALL_COMPARISONS,
  HUB_PATH,
} from '@/components/ComparePageShell'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE = 'Best Water Monitoring Systems for Buildings (2026)'
const META_DESCRIPTION =
  'Compare the top water monitoring systems for commercial buildings. Beluga, Flo by Moen, Phyn, WINT, Alert Labs, Flume, and Water Alert reviewed side by side.'

const SYSTEMS: {
  name: string
  summary: string
  path: string
  tags: string[]
}[] = [
  {
    name: 'Beluga',
    summary:
      'A water intelligence platform focused on system visibility, usage insights, and anomaly detection for commercial and multi-unit buildings. Uses non-invasive installation and pattern recognition to identify fixtures and track system behavior over time.',
    path: '/quote',
    tags: ['Water intelligence', 'Non-invasive', 'Commercial'],
  },
  {
    name: 'Flo by Moen',
    summary:
      'A smart water monitor with automatic shutoff designed primarily for residential homes. Detects leaks in real time and can shut off the water supply to prevent damage.',
    path: '/flo-by-moen-alternative',
    tags: ['Leak shutoff', 'Residential'],
  },
  {
    name: 'Phyn',
    summary:
      'A pressure-based smart water monitor with automatic shutoff for homes. Uses machine learning to analyze water pressure patterns and identify potential leaks.',
    path: '/phyn-alternative',
    tags: ['Pressure sensing', 'Leak shutoff', 'Residential'],
  },
  {
    name: 'WINT',
    summary:
      'A commercial water management system focused on leak detection and automatic shutoff. Commonly associated with commercial buildings and construction site environments.',
    path: '/wint-alternative',
    tags: ['Leak shutoff', 'Commercial', 'Construction'],
  },
  {
    name: 'Alert Labs',
    summary:
      'A distributed sensor-based water monitoring system for commercial and portfolio properties. Uses multiple sensors across a building for location-specific leak detection and flow tracking.',
    path: '/alert-labs-alternative',
    tags: ['Distributed sensors', 'Commercial', 'Portfolio'],
  },
  {
    name: 'Flume',
    summary:
      'A non-invasive water monitor designed for homeowners. Clamps onto the residential water meter to track usage, set budgets, and detect unusual activity.',
    path: '/flume-alternative',
    tags: ['Non-invasive', 'Residential', 'Usage tracking'],
  },
  {
    name: 'Water Alert',
    summary:
      'A hardware-based leak detection system using moisture sensors and alarms. Focused on event-based alerting at specific locations within commercial and industrial buildings.',
    path: '/water-alert-alternative',
    tags: ['Moisture sensors', 'Event-based', 'Commercial'],
  },
]

const CATEGORIES: {
  title: string
  description: string
}[] = [
  {
    title: 'Leak detection systems',
    description:
      'These systems are designed to identify active leaks, typically using moisture sensors, flow analysis, or pressure monitoring. Their primary value is alerting you when water is where it should not be. Examples include Water Alert and aspects of most other systems on this list.',
  },
  {
    title: 'Automatic shutoff systems',
    description:
      'Shutoff systems go a step further than detection by automatically stopping the flow of water when a leak is identified. This is valuable in residential and commercial settings where preventing water damage is the top priority. Flo by Moen, Phyn, and WINT offer this capability.',
  },
  {
    title: 'Non-invasive monitoring',
    description:
      'Non-invasive systems are installed without cutting into pipes or modifying plumbing. This reduces installation cost, time, and disruption. Beluga and Flume both use non-invasive approaches, though they target different environments and offer different levels of insight.',
  },
  {
    title: 'Water intelligence platforms',
    description:
      'Water intelligence goes beyond leak detection. These platforms continuously analyze how water moves through a building, identifying patterns, inefficiencies, and individual fixtures. The goal is system-level visibility and long-term optimization, not just event-based alerting. Beluga is positioned in this category.',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is the best water monitoring system for commercial buildings?',
    a: 'It depends on priorities. For automatic shutoff in commercial settings, WINT is commonly considered. For non-invasive system intelligence, Beluga is positioned as a water intelligence platform. For distributed sensor coverage, Alert Labs offers multi-point monitoring.',
  },
  {
    q: 'What is the difference between leak detection and water intelligence?',
    a: 'Leak detection identifies when water is present where it should not be — typically through moisture sensors, flow analysis, or pressure changes. Water intelligence is a broader concept that includes continuous monitoring, behavioral analysis, fixture identification, and system-level insights over time.',
  },
  {
    q: 'Which water monitors are non-invasive?',
    a: 'Beluga and Flume both emphasize non-invasive installation. Flume is designed for residential water meters, while Beluga is designed for commercial plumbing systems. Specific installation requirements vary by product.',
  },
  {
    q: 'Do I need automatic shutoff for my building?',
    a: 'Automatic shutoff is valuable when immediate damage prevention is critical — especially in unoccupied spaces or high-risk areas. However, not all buildings require it. Some teams prioritize continuous monitoring and visibility over automated intervention.',
  },
  {
    q: 'Can I combine multiple water monitoring approaches?',
    a: 'Yes. Some buildings use point sensors for specific high-risk areas alongside a broader intelligence platform for system-level visibility. The right combination depends on building complexity, risk profile, and team goals.',
  },
  {
    q: 'How do I choose the right water monitoring system?',
    a: 'Consider your building type (residential vs commercial), your primary goal (leak shutoff vs system visibility), installation constraints (invasive vs non-invasive), and whether you need event-based alerting or continuous intelligence. This page and the linked comparison pages can help you evaluate each option.',
  },
]

export default function WaterMonitoringSystems() {
  usePageSeo({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    canonicalPath: HUB_PATH,
  })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">
            Guide
          </p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Best Water Monitoring Systems for Buildings
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
            A neutral overview of the most commonly considered water monitoring solutions for
            residential and commercial properties.
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                Choosing the best water monitoring system depends on your building type, your
                operational priorities, and the level of insight you need. Some systems focus on
                immediate leak response with automatic shutoff. Others are built for continuous
                system intelligence and long-term visibility.
              </p>
              <p>
                This page provides a neutral overview of seven commonly considered water monitoring
                products, explains the different categories of monitoring, and links to detailed
                comparison pages to help you evaluate your options.
              </p>
            </div>
          </section>

          {/* Categories */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Types of water monitoring systems
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              Water monitoring products fall into several overlapping categories. Understanding
              these categories makes it easier to evaluate which approach fits your needs.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                    {cat.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* System profiles */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Water monitoring systems at a glance
            </h2>
            <div className="mx-auto mt-10 max-w-3xl space-y-6">
              {SYSTEMS.map((sys) => (
                <div
                  key={sys.name}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[17px] font-bold text-gray-900 sm:text-[19px]">
                      {sys.name}
                    </h3>
                    {sys.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                    {sys.summary}
                  </p>
                  <Link
                    to={sys.path}
                    className="mt-4 inline-block text-[14px] font-medium text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 transition hover:decoration-indigo-600"
                  >
                    {sys.name === 'Beluga'
                      ? 'Learn more about Beluga'
                      : `Compare Beluga vs ${sys.name}`}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Comparison quick-links */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Detailed comparisons
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              Each comparison page provides a feature table, key differences in approach,
              guidance on when each system makes sense, and an FAQ section.
            </p>
            <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-4">
              {ALL_COMPARISONS.map((c) => (
                <Link
                  key={c.path}
                  to={c.path}
                  className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <CompareFaq items={FAQ_ITEMS} />
        </div>

        {/* CTA */}
        <section className="mt-16 border-t border-gray-100 pt-14 sm:mt-24 sm:pt-18">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Not sure which system is right for you?
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
              Talk to our team for a free building water assessment — no commitment required.
            </p>
            <Link
              to="/quote"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 hover:shadow-xl"
            >
              Request early access
            </Link>
          </div>
        </section>
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
