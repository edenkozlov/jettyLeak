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

const CANONICAL = '/alert-labs-alternative'
const PAGE_TITLE = 'Beluga vs Alert Labs: Building Water Monitoring Compared'
const META_DESCRIPTION =
  'Compare Beluga and Alert Labs for building water monitoring. Single-point intelligence vs distributed sensor coverage. Neutral comparison based on public information.'

const TABLE_ROWS: { feature: string; beluga: string; competitor: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water intelligence and system visibility',
    competitor: 'Leak detection and water management',
  },
  {
    feature: 'Installation',
    beluga: 'Non-invasive (single sensor)',
    competitor: 'Multiple sensors across building',
  },
  {
    feature: 'Leak detection',
    beluga: 'Yes (pattern and anomaly-based)',
    competitor: 'Yes (sensor + flow-based alerts)',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    competitor: 'Available',
  },
  {
    feature: 'Usage insights',
    beluga: 'System-wide intelligence',
    competitor: 'Minute-by-minute flow tracking',
  },
  {
    feature: 'Deployment complexity',
    beluga: 'Low (minimal hardware)',
    competitor: 'Moderate (multi-sensor setup)',
  },
  {
    feature: 'Target environment',
    beluga: 'Commercial / multi-unit buildings',
    competitor: 'Commercial / multi-building portfolios',
  },
  {
    feature: 'Monitoring approach',
    beluga: 'Behavioral pattern learning',
    competitor: 'Sensor-driven detection + alerts',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Does Alert Labs require multiple devices per building?',
    a: 'Yes. Alert Labs typically uses multiple sensors deployed across a building to detect leaks and monitor conditions in different areas. This distributed approach provides location-specific alerts.',
  },
  {
    q: 'Is Beluga less detailed because it uses fewer sensors?',
    a: 'Beluga approaches the problem differently. Rather than relying on multiple physical sensors, it uses pattern recognition and behavioral analysis to infer system behavior from a single measurement point. The result is a different type of insight — system-wide intelligence rather than point-specific detection.',
  },
  {
    q: 'Which system is easier to install in an existing building?',
    a: 'Beluga\'s non-invasive, single-sensor approach generally requires less coordination and no plumbing modifications. Alert Labs deployments involve placing multiple sensors across the building, which may require more installation planning.',
  },
  {
    q: 'Can Alert Labs monitor a portfolio of buildings?',
    a: 'Yes. Alert Labs supports multi-building portfolio monitoring through its centralized platform (AlertAQ). Beluga also supports multi-building visibility, but through a different deployment and analytics model.',
  },
  {
    q: 'What is the main difference between Alert Labs and Beluga?',
    a: 'Alert Labs uses distributed sensors to detect and alert on specific events at specific locations. Beluga uses a single-point, non-invasive approach to build a behavioral model of the entire water system, focusing on intelligence and pattern recognition rather than point-by-point coverage.',
  },
]

const RELATED_QUESTIONS = [
  'What is the best alternative to Alert Labs for water monitoring?',
  'How does distributed sensor monitoring compare to single-point intelligence?',
  'What water monitoring system is easiest to install in commercial buildings?',
  'Is Alert Labs good for portfolio-level water monitoring?',
  'What is the difference between sensor-based and pattern-based monitoring?',
]

export default function CompareAlertLabs() {
  usePageSeo({ title: PAGE_TITLE, description: META_DESCRIPTION, canonicalPath: CANONICAL })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <CompareHero
        h1="Beluga vs Alert Labs"
        subtitle="Comparing single-point water intelligence with distributed sensor monitoring for buildings."
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                If you are searching for an Alert Labs alternative or comparing Beluga vs Alert
                Labs, you are likely evaluating water monitoring deployment strategies for
                commercial buildings. These two systems represent different approaches — distributed
                sensor coverage versus single-point water intelligence.
              </p>
              <p>
                This page compares Beluga and Alert Labs based on publicly available information to
                help you understand these deployment philosophy differences and determine which
                approach is better suited to your needs.
              </p>
            </div>
          </section>

          <CompareTable competitorLabel="Alert Labs" rows={TABLE_ROWS} />

          {/* Single-point vs distributed */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Single-point intelligence vs distributed sensor coverage
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              This is one of the most meaningful differences between these two systems. Neither
              approach is inherently superior — they represent different trade-offs around
              installation, coverage, and analytical depth.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Alert Labs — distributed sensor coverage
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Alert Labs provides a sensor-based system that combines flow sensors, leak
                  detectors, and a centralized platform (AlertAQ). Sensors are deployed across the
                  building to deliver location-specific alerts, track water usage, and support
                  shutoff systems.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  This approach provides broad coverage across multiple points, which can be
                  valuable when you need to know exactly where in a building an event is occurring.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga — single-point intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga focuses on understanding the system from a single point of measurement,
                  using pattern recognition to identify fixtures, inefficiencies, and anomalies
                  over time. Rather than deploying multiple sensors, it aims to extract system-level
                  intelligence from minimal hardware.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  This approach minimizes installation complexity while delivering a different type
                  of insight — system behavior modeling rather than point-specific detection.
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
                  Alert Labs may be a strong fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet>You want sensor coverage across multiple areas in a building</Bullet>
                  <Bullet>You need location-specific alerts tied to individual sensors</Bullet>
                  <Bullet>You manage large portfolios and want distributed monitoring</Bullet>
                  <Bullet>You prefer a multi-sensor approach for broader physical coverage</Bullet>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga may be a better fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet variant="indigo">You want minimal installation complexity and no plumbing modifications</Bullet>
                  <Bullet variant="indigo">You prefer extracting intelligence from a single non-invasive sensor</Bullet>
                  <Bullet variant="indigo">You are focused on system-level understanding, trends, and long-term insights</Bullet>
                  <Bullet variant="indigo">You want to understand how water is being used, not just where leaks occur</Bullet>
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
          <CompareDisclaimer competitorName="Alert Labs" />
        </div>

        <CompareCta competitorName="Alert Labs" competitorUrl="https://alertlabs.com/" />
        <RelatedQuestions questions={RELATED_QUESTIONS} />
        <CompareOtherSystems currentPath={CANONICAL} />

        {/* Recommended reading */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">
            Recommended reading
          </h2>
          <div className="mt-5 space-y-3">
            <Link to="/articles/best-water-monitoring-commercial-buildings" className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5">
              <p className="text-[15px] font-semibold text-gray-900">Best Water Monitoring for Commercial Buildings</p>
              <p className="mt-1 text-[13px] text-gray-500">A guide to systems designed for commercial environments.</p>
            </Link>
            <Link to="/articles/4-types-of-water-monitoring-systems" className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5">
              <p className="text-[15px] font-semibold text-gray-900">4 Types of Water Monitoring Systems</p>
              <p className="mt-1 text-[13px] text-gray-500">Understanding the different approaches in water monitoring.</p>
            </Link>
            <Link to="/articles/non-invasive-vs-inline-water-monitoring" className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-5">
              <p className="text-[15px] font-semibold text-gray-900">Non-Invasive vs Inline Water Monitoring</p>
              <p className="mt-1 text-[13px] text-gray-500">How installation method shapes system selection.</p>
            </Link>
          </div>
        </section>
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
          { name: 'Beluga vs Alert Labs', path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
