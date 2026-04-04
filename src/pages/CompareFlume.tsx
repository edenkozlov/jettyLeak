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

const CANONICAL = '/flume-alternative'
const PAGE_TITLE = 'Beluga vs Flume: Non-Invasive Water Monitor Comparison'
const META_DESCRIPTION =
  'Compare Beluga and Flume — two non-invasive water monitors for different environments. Residential usage tracking vs commercial water intelligence. Neutral comparison.'

const TABLE_ROWS: { feature: string; beluga: string; competitor: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water intelligence for buildings',
    competitor: 'Water usage tracking for homes',
  },
  {
    feature: 'Installation',
    beluga: 'Non-invasive',
    competitor: 'Non-invasive',
  },
  {
    feature: 'Leak detection',
    beluga: 'Yes (anomaly and pattern-based)',
    competitor: 'Yes (usage anomaly-based)',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    competitor: 'No',
  },
  {
    feature: 'Usage insights',
    beluga: 'Advanced, system-level intelligence',
    competitor: 'Basic usage tracking and alerts',
  },
  {
    feature: 'Fixture-level understanding',
    beluga: 'Yes (pattern recognition)',
    competitor: 'No',
  },
  {
    feature: 'Target environment',
    beluga: 'Commercial / multi-unit buildings',
    competitor: 'Residential / single-family homes',
  },
  {
    feature: 'Monitoring depth',
    beluga: 'High — behavioral modeling and benchmarking',
    competitor: 'Moderate — aggregate flow and usage',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Are Beluga and Flume installed the same way?',
    a: 'Both emphasize non-invasive installation. Specific hardware placement and sensor type may differ. Beluga is designed for commercial plumbing systems, while Flume is designed for residential water meters.',
  },
  {
    q: 'Is Flume good for commercial buildings?',
    a: 'Flume is primarily designed and marketed for residential, single-family homes. Commercial and multi-unit applications are not its core focus based on publicly available information.',
  },
  {
    q: 'Is Beluga intended for homeowners?',
    a: 'Beluga is primarily oriented toward commercial buildings, multi-unit properties, and building operators. Homeowners looking for simple usage tracking may find Flume or similar residential products more relevant.',
  },
  {
    q: 'What makes Beluga different from Flume if both are non-invasive?',
    a: 'While both are non-invasive, they serve different markets and offer different depth. Flume tracks household water usage and alerts to anomalies. Beluga builds a behavioral model of an entire building\'s water system, identifies individual fixtures, and provides intelligence beyond aggregate usage.',
  },
  {
    q: 'Can I use Flume to monitor a multi-unit building?',
    a: 'Flume is designed for individual residential water meters. Multi-unit or commercial water systems are outside its typical deployment scope. Beluga is built for these types of environments.',
  },
]

const RELATED_QUESTIONS = [
  'What is the best alternative to Flume for commercial buildings?',
  'How do non-invasive water monitors compare for homes vs buildings?',
  'Is Flume or Beluga better for a property manager?',
  'What water monitoring system works for apartments and condos?',
  'How does Flume compare to other non-invasive water monitors?',
]

export default function CompareFlume() {
  usePageSeo({ title: PAGE_TITLE, description: META_DESCRIPTION, canonicalPath: CANONICAL })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <CompareHero
        h1="Beluga vs Flume"
        subtitle="Both are non-invasive water monitors — but they are built for very different environments and levels of depth."
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                If you are searching for a Flume alternative or comparing non-invasive water
                monitoring options, it is worth understanding that non-invasive installation does
                not mean identical capability. Beluga and Flume are both non-invasive, but they are
                designed for different audiences, different scales, and different levels of system
                insight.
              </p>
              <p>
                This page compares the two based on publicly available information to help you
                determine which fits your situation.
              </p>
            </div>
          </section>

          <CompareTable competitorLabel="Flume" rows={TABLE_ROWS} />

          {/* Non-invasive, different environments */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Non-invasive, but built for different environments
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              The shared non-invasive approach may suggest these products are interchangeable, but
              the target environment and analytical depth are quite different.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Flume — homeowner-friendly tracking
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Flume provides non-invasive water monitoring for homeowners, focusing on tracking
                  daily usage, setting budgets, and detecting unusual activity. It is designed to
                  clamp onto a residential water meter and deliver clear, simple insights through a
                  consumer-friendly app.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga — building-grade intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga extends the non-invasive concept into commercial-grade system intelligence.
                  It monitors entire building water systems, identifies individual fixtures through
                  pattern recognition, detects inefficiencies, and provides long-term behavioral
                  analysis beyond aggregate usage tracking.
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
                  Flume may be a strong fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet>You are a homeowner who wants simple usage tracking</Bullet>
                  <Bullet>You want a non-invasive install on a residential water meter</Bullet>
                  <Bullet>Your primary concern is monitoring household water use and catching leaks</Bullet>
                  <Bullet>You prefer a consumer-friendly, app-based experience</Bullet>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga may be a better fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet variant="indigo">You operate at commercial scale or manage multi-unit properties</Bullet>
                  <Bullet variant="indigo">You need deeper insights into system behavior, fixtures, and efficiency</Bullet>
                  <Bullet variant="indigo">You want infrastructure-level visibility and long-term benchmarking</Bullet>
                  <Bullet variant="indigo">You need non-invasive monitoring designed for complex plumbing systems</Bullet>
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

          {/* Also compare */}
          <section className="mx-auto max-w-2xl">
            <h3 className="text-[16px] font-semibold text-gray-900 sm:text-[18px]">
              Evaluating similar products?
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              If you are comparing non-invasive water monitors, you may also want to review our
              comparisons with{' '}
              <Link to="/flo-by-moen-alternative" className="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 transition hover:decoration-indigo-600">
                Flo by Moen
              </Link>{' '}
              and{' '}
              <Link to="/phyn-alternative" className="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 transition hover:decoration-indigo-600">
                Phyn
              </Link>
              , which are also commonly considered in the residential water monitoring space.
            </p>
          </section>

          <CompareFaq items={FAQ_ITEMS} />
          <CompareDisclaimer competitorName="Flume or Flume Water" />
        </div>

        <CompareCta competitorName="Flume" competitorUrl="https://flumewater.com/" />
        <RelatedQuestions questions={RELATED_QUESTIONS} />
        <CompareOtherSystems currentPath={CANONICAL} />
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
          { name: 'Beluga vs Flume', path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
