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

const CANONICAL = '/water-alert-alternative'
const PAGE_TITLE = 'Beluga vs Water Alert: Leak Detection Systems Compared'
const META_DESCRIPTION =
  'Compare Beluga and Water Alert. Traditional event-based leak detection vs continuous water intelligence for buildings. Neutral comparison based on public information.'

const TABLE_ROWS: { feature: string; beluga: string; competitor: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water intelligence platform',
    competitor: 'Leak detection hardware',
  },
  {
    feature: 'Installation',
    beluga: 'Non-invasive (no pipe cutting)',
    competitor: 'Sensor-based install',
  },
  {
    feature: 'Leak detection',
    beluga: 'Yes (pattern and anomaly-based)',
    competitor: 'Yes (moisture sensors and alarms)',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    competitor: 'Limited / depends on setup',
  },
  {
    feature: 'Usage insights',
    beluga: 'Yes — detailed and continuous',
    competitor: 'No',
  },
  {
    feature: 'System intelligence',
    beluga: 'Yes — behavioral modeling',
    competitor: 'No',
  },
  {
    feature: 'Target environment',
    beluga: 'Commercial / multi-unit buildings',
    competitor: 'Commercial / industrial',
  },
  {
    feature: 'Monitoring type',
    beluga: 'Continuous analysis and benchmarking',
    competitor: 'Event-based detection and alerting',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is the difference between traditional leak detection and water intelligence?',
    a: 'Traditional leak detection systems like Water Alert use hardware sensors (often moisture-based) to detect active leaks and trigger alarms. Water intelligence platforms like Beluga continuously analyze water flow behavior to identify patterns, inefficiencies, and anomalies — providing a broader view of the system beyond just leak events.',
  },
  {
    q: 'Is Water Alert the same as a smart water monitor?',
    a: 'Water Alert focuses on hardware-based detection, typically using moisture sensors and alarms to flag active leaks. Smart water monitors and water intelligence platforms generally provide more comprehensive analysis, including usage tracking, pattern recognition, and system-level insights.',
  },
  {
    q: 'Can Water Alert and Beluga be used together?',
    a: 'Depending on the building, some teams may choose to combine point sensors with broader monitoring. Each system should be evaluated on its own merits and compatibility with existing infrastructure.',
  },
  {
    q: 'Which system is better for a building with no existing monitoring?',
    a: 'If the goal is basic leak alerting with minimal setup, Water Alert-style hardware may be a starting point. If the goal is comprehensive water visibility — usage intelligence, anomaly detection, and long-term monitoring — Beluga may be a stronger first investment.',
  },
  {
    q: 'Does Beluga replace the need for point leak sensors?',
    a: 'Beluga provides system-level intelligence including anomaly detection. Whether point sensors are also needed depends on the building, the risk profile, and how the water system is configured. The two approaches serve complementary purposes.',
  },
  {
    q: 'What water monitoring options exist for commercial buildings?',
    a: 'Commercial buildings have several options, ranging from simple moisture sensor networks (like Water Alert) to flow-based monitoring systems (like WINT or Flo) to water intelligence platforms (like Beluga). The right choice depends on the building\'s complexity, the team\'s goals, and the level of insight required.',
  },
]

const RELATED_QUESTIONS = [
  'What is the best water leak detection system for commercial buildings?',
  'How does traditional leak detection compare to water intelligence?',
  'What are the most common water monitoring systems for buildings?',
  'Is there a better alternative to moisture-based leak sensors?',
  'What water monitoring system provides the most insight for building managers?',
]

export default function CompareWaterAlert() {
  usePageSeo({ title: PAGE_TITLE, description: META_DESCRIPTION, canonicalPath: CANONICAL })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <CompareHero
        h1="Beluga vs Water Alert"
        subtitle="Understanding the difference between traditional event-based leak alerting and continuous water intelligence for buildings."
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro — educational, category-focused */}
          <section className="mx-auto max-w-2xl">
            <h2 className="text-[20px] font-bold tracking-tight text-gray-900 sm:text-[24px]">
              Traditional leak alerting vs water intelligence platforms
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                If you are looking for a Water Alert alternative or researching water leak detection
                systems for commercial buildings, it helps to understand the broader landscape.
                For decades, building water monitoring meant placing moisture sensors at high-risk
                points and waiting for an alarm. This approach is straightforward and catches active
                leaks.
              </p>
              <p>
                A newer category of water monitoring — water intelligence platforms — takes a
                different approach. These platforms continuously analyze how water moves through a
                building, identifying patterns, inefficiencies, and anomalies before they become
                costly problems.
              </p>
              <p>
                This page compares Water Alert, representing the traditional sensor-based approach,
                with Beluga, representing the intelligence-driven approach — based on publicly
                available information.
              </p>
            </div>
          </section>

          <CompareTable competitorLabel="Water Alert" rows={TABLE_ROWS} />

          {/* Approach */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Key difference: event-based alerting vs continuous intelligence
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Water Alert — hardware-based detection
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Water Alert provides hardware-based leak detection, primarily focused on detecting
                  moisture at specific points and triggering alarms. The system is reactive by
                  design — it tells you when water is where it should not be.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  This approach is valuable for its simplicity and directness. No data
                  interpretation is required — if a sensor detects moisture, an alert is triggered.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga — data-driven system intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga focuses on interpreting water behavior over time. Rather than only
                  reacting to leaks, it continuously monitors the water system, identifies patterns
                  and fixtures, and surfaces insights that can help prevent problems before they
                  escalate.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  This approach provides a more comprehensive view of the system, but involves
                  ongoing data analysis rather than binary event detection.
                </p>
              </div>
            </div>
          </section>

          {/* When each makes sense */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              When each solution makes sense
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Water Alert may be a fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet>You need simple, reliable leak detection at specific locations</Bullet>
                  <Bullet>You operate in environments where basic moisture alerting is sufficient</Bullet>
                  <Bullet>You prefer a low-complexity hardware setup with minimal configuration</Bullet>
                  <Bullet>Your budget or requirements are focused on point detection</Bullet>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga may be a better fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet variant="indigo">You manage complex buildings with varied water usage patterns</Bullet>
                  <Bullet variant="indigo">You want ongoing system intelligence, not just event-based alarms</Bullet>
                  <Bullet variant="indigo">You are looking to understand water system performance over time</Bullet>
                  <Bullet variant="indigo">You want a non-invasive, software-driven approach to water monitoring</Bullet>
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
          <CompareDisclaimer competitorName="Water Alert" />
        </div>

        <CompareCta competitorName="Water Alert" competitorUrl="https://www.wateralert.com/" />
        <RelatedQuestions questions={RELATED_QUESTIONS} />
        <CompareOtherSystems currentPath={CANONICAL} />
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
          { name: 'Beluga vs Water Alert', path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
