import { Link } from 'react-router'

import {
  CompareNav,
  CompareHero,
  CompareTable,
  CompareFaq,
  CompareDisclaimer,
  CompareCta,
  CompareOtherSystems,
  RelatedQuestions,
  FaqSchema,
  BreadcrumbSchema,
  usePageSeo,
  Bullet,
  HUB_PATH,
} from '@/components/ComparePageShell'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const CANONICAL = '/flo-by-moen-alternative'
const PAGE_TITLE = 'Beluga vs Flo by Moen: Water Monitoring Compared'
const META_DESCRIPTION =
  'Compare Beluga and Flo by Moen side by side. Understand how residential leak shutoff differs from building-level water intelligence for commercial properties.'

const TABLE_ROWS: { feature: string; beluga: string; competitor: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water system intelligence and monitoring',
    competitor: 'Leak detection and automatic shutoff',
  },
  {
    feature: 'Installation',
    beluga: 'Non-invasive (no pipe cutting)',
    competitor: 'Installed directly on main water line',
  },
  {
    feature: 'Leak detection',
    beluga: 'Yes (via anomaly detection)',
    competitor: 'Yes (real-time detection + shutoff)',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    competitor: 'Yes',
  },
  {
    feature: 'Water usage insights',
    beluga: 'Detailed, system-level visibility',
    competitor: 'Basic usage tracking',
  },
  {
    feature: 'Fixture-level understanding',
    beluga: 'Yes (pattern-based identification)',
    competitor: 'Limited',
  },
  {
    feature: 'Target environment',
    beluga: 'Commercial / multi-unit / infrastructure',
    competitor: 'Residential homes',
  },
  {
    feature: 'Data depth',
    beluga: 'Continuous monitoring and benchmarking',
    competitor: 'Historical usage tracking',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is Beluga a leak detector like Flo by Moen?',
    a: 'Beluga includes leak detection through anomaly recognition, but its primary purpose is broader water system intelligence — tracking usage, identifying fixtures, and monitoring efficiency over time.',
  },
  {
    q: 'Does Flo by Moen work for commercial buildings?',
    a: 'Flo by Moen is primarily designed and marketed for residential use. Some commercial applications may be possible depending on plumbing configuration, but it is not its core market.',
  },
  {
    q: 'Does Beluga shut off water automatically?',
    a: 'Automatic shutoff is not a core feature of Beluga. Its focus is on continuous monitoring, anomaly detection, and delivering actionable insight rather than direct physical intervention.',
  },
  {
    q: 'Can Flo by Moen track water usage across multiple fixtures?',
    a: 'Flo by Moen provides aggregate flow and usage data. Fixture-level disaggregation is not a primary capability based on publicly available product information.',
  },
  {
    q: 'Which system is better for a property manager?',
    a: 'It depends on the goal. If the priority is automatic shutoff in a residential unit, Flo by Moen may be well suited. If the priority is system-wide visibility, usage intelligence, and anomaly detection across a building or portfolio, Beluga may be a stronger fit.',
  },
  {
    q: 'What is the main difference between Flo by Moen and Beluga?',
    a: 'Flo by Moen is a reactive protection system — it detects leaks and shuts off water. Beluga is a water intelligence platform — it continuously monitors system behavior, identifies patterns, and surfaces insights before problems escalate.',
  },
]

const RELATED_QUESTIONS = [
  'What is the best alternative to Flo by Moen for commercial buildings?',
  'Is there a non-invasive water monitor that works for apartments?',
  'How does Flo by Moen compare to other water monitoring systems?',
  'What water monitoring system is best for multi-unit buildings?',
  'Does Flo by Moen offer building-level water intelligence?',
]

export default function CompareFlo() {
  usePageSeo({ title: PAGE_TITLE, description: META_DESCRIPTION, canonicalPath: CANONICAL })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <CompareHero
        h1="Beluga vs Flo by Moen"
        subtitle="A clear, neutral comparison of two different approaches to water monitoring — residential leak shutoff versus building-level water intelligence."
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                If you are searching for a Flo by Moen alternative or comparing Beluga vs Flo by
                Moen, it is important to understand that these two systems are designed with
                fundamentally different goals. Flo by Moen is built around immediate leak response
                and automatic shutoff for homes. Beluga is built around long-term system
                understanding and water intelligence for buildings.
              </p>
              <p>
                This page provides a side-by-side comparison based on publicly available information
                to help you determine which approach best fits your building, team, and priorities.
              </p>
            </div>
          </section>

          <CompareTable competitorLabel="Flo by Moen" rows={TABLE_ROWS} />

          {/* Reactive vs continuous */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Reactive protection vs continuous water intelligence
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Flo by Moen — reactive protection
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Flo by Moen monitors water flow in real time and can automatically shut off water
                  when it detects a potential leak. This is particularly useful in residential
                  settings where fast response to active leaks is the top priority.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga — continuous intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga is designed as a water intelligence system. Rather than focusing only on
                  leak events, it aims to understand how an entire water system behaves over time —
                  identifying fixtures, tracking usage patterns, detecting inefficiencies, and
                  flagging anomalies before they become critical issues.
                </p>
              </div>
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              These are fundamentally different approaches: one reacts to problems, the other aims
              to continuously understand and optimize the system. Neither is inherently better — they
              serve different goals.
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
                  Who Flo by Moen is often best suited for
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet>Homeowners who want automatic shutoff protection</Bullet>
                  <Bullet>Households prioritizing immediate leak response</Bullet>
                  <Bullet>Residential properties with a single main water line</Bullet>
                  <Bullet>Users who prefer a consumer-grade, app-first experience</Bullet>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Who Beluga is best suited for
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet variant="indigo">Building owners or operators who need system-wide visibility</Bullet>
                  <Bullet variant="indigo">Property managers focused on reducing waste and identifying inefficiencies</Bullet>
                  <Bullet variant="indigo">Teams managing commercial or multi-unit buildings</Bullet>
                  <Bullet variant="indigo">Anyone who wants to understand how water is used across the system over time</Bullet>
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
                their plumbing systems. Using a non-invasive sensor approach, it provides continuous
                insight into water usage, system behavior, and potential inefficiencies — without
                requiring modifications to existing infrastructure.
              </p>
              <p>
                The goal is not only to detect problems, but to make the entire water system more
                visible, measurable, and manageable over time.
              </p>
            </div>
          </section>

          <CompareFaq items={FAQ_ITEMS} />
          <CompareDisclaimer competitorName="Moen or Flo by Moen" />
        </div>

        <CompareCta competitorName="Flo by Moen" competitorUrl="https://www.moen.com/flo" />
        <RelatedQuestions questions={RELATED_QUESTIONS} />
        <CompareOtherSystems currentPath={CANONICAL} />

        {/* Recommended reading */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">
            Recommended reading
          </h2>
          <div className="mt-5 space-y-3">
            <Link to="/articles/what-is-water-monitoring-system" className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5">
              <p className="text-[15px] font-semibold text-gray-900">What Is a Water Monitoring System?</p>
              <p className="mt-1 text-[13px] text-gray-500">Understanding the different types of water monitoring systems.</p>
            </Link>
            <Link to="/articles/water-monitoring-vs-leak-detection" className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5">
              <p className="text-[15px] font-semibold text-gray-900">Water Monitoring vs Leak Detection</p>
              <p className="mt-1 text-[13px] text-gray-500">How continuous monitoring differs from event-based detection.</p>
            </Link>
            <Link to="/articles/how-to-choose-water-monitoring-system" className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5">
              <p className="text-[15px] font-semibold text-gray-900">How to Choose a Water Monitoring System</p>
              <p className="mt-1 text-[13px] text-gray-500">A step-by-step guide to selecting the right system.</p>
            </Link>
          </div>
        </section>
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
          { name: 'Beluga vs Flo by Moen', path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
