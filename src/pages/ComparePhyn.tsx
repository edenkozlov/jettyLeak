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

const CANONICAL = '/phyn-alternative'
const PAGE_TITLE = 'Beluga vs Phyn: Water Monitor Comparison for Buildings'
const META_DESCRIPTION =
  'Compare Beluga and Phyn. Pressure-based residential leak detection versus building-level water intelligence. Neutral comparison based on publicly available information.'

const TABLE_ROWS: { feature: string; beluga: string; competitor: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water system intelligence and monitoring',
    competitor: 'Leak detection and automatic shutoff',
  },
  {
    feature: 'Installation',
    beluga: 'Non-invasive (no pipe cutting)',
    competitor: 'Installed on main water line',
  },
  {
    feature: 'Leak detection method',
    beluga: 'Pattern and anomaly-based',
    competitor: 'Pressure sensing and machine learning',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    competitor: 'Yes',
  },
  {
    feature: 'Usage insights',
    beluga: 'System-level visibility and benchmarking',
    competitor: 'Basic usage insights',
  },
  {
    feature: 'Fixture-level understanding',
    beluga: 'Yes (pattern recognition)',
    competitor: 'Limited',
  },
  {
    feature: 'Target environment',
    beluga: 'Commercial / multi-unit buildings',
    competitor: 'Residential homes',
  },
  {
    feature: 'Monitoring over time',
    beluga: 'Continuous benchmarking and trend analysis',
    competitor: 'Event-based alerts',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Does Phyn detect small leaks?',
    a: 'Phyn is designed to detect abnormal pressure patterns, which may include smaller leaks depending on system conditions. Its primary detection method is pressure-based analysis.',
  },
  {
    q: 'Is Beluga only for leak detection?',
    a: 'No. Leak detection is one component, but Beluga\'s primary focus is system intelligence — understanding how water moves through a building, identifying fixtures, and tracking efficiency over time.',
  },
  {
    q: 'Can Phyn be used in commercial buildings?',
    a: 'Phyn is primarily designed and marketed for residential use. Specific commercial applications may vary and should be confirmed directly with the manufacturer.',
  },
  {
    q: 'How does Phyn compare to Beluga for property managers?',
    a: 'Phyn is oriented toward individual home protection. Beluga is designed for building-level and portfolio-level visibility, making it potentially more relevant for property managers overseeing multiple units or buildings.',
  },
  {
    q: 'What is the key difference between Phyn and Beluga?',
    a: 'Phyn focuses on pressure-based leak detection with automatic shutoff for homes. Beluga focuses on continuous water system intelligence for commercial and multi-unit buildings, using non-invasive installation.',
  },
]

const RELATED_QUESTIONS = [
  'What is a good alternative to Phyn for commercial buildings?',
  'How does Phyn compare to other smart water monitors?',
  'Is there a non-invasive water monitor for multi-unit buildings?',
  'What is the best water monitoring system for property managers?',
]

export default function ComparePhyn() {
  usePageSeo({ title: PAGE_TITLE, description: META_DESCRIPTION, canonicalPath: CANONICAL })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <CompareHero
        h1="Beluga vs Phyn"
        subtitle="A neutral comparison of pressure-based leak shutoff and building-level water intelligence."
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                If you are looking for a Phyn alternative or comparing Beluga vs Phyn, you are
                likely evaluating smart water monitors and may be deciding between residential leak
                protection and broader building intelligence. These two products target different
                environments and different outcomes.
              </p>
              <p>
                This page compares Beluga and Phyn using publicly available information to help
                clarify those differences and assist you in evaluating the right fit.
              </p>
            </div>
          </section>

          <CompareTable competitorLabel="Phyn" rows={TABLE_ROWS} />

          {/* Approach */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Key difference: pressure sensing vs system intelligence
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Phyn — pressure-based detection
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Phyn focuses on detecting leaks through high-resolution pressure sensing and
                  machine learning. It is designed primarily for residential protection, with an
                  emphasis on identifying abnormal water flow and stopping it quickly through
                  automatic shutoff.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga — behavioral water intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga focuses on understanding how a water system behaves over time. It tracks
                  usage patterns, identifies individual fixtures, detects inefficiencies, and
                  builds a system-wide model that surfaces insights continuously — not just when
                  something goes wrong.
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
                  Phyn may be a good fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet>You want automatic shutoff protection for a home</Bullet>
                  <Bullet>You are focused on residential leak prevention</Bullet>
                  <Bullet>You prefer pressure-based sensing technology</Bullet>
                  <Bullet>Your primary concern is stopping active leaks quickly</Bullet>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga may be a better fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet variant="indigo">You manage larger or multi-unit properties</Bullet>
                  <Bullet variant="indigo">You want insight into system behavior, not just leak events</Bullet>
                  <Bullet variant="indigo">You are optimizing usage, infrastructure, and efficiency</Bullet>
                  <Bullet variant="indigo">You need a non-invasive installation with no plumbing modifications</Bullet>
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
          <CompareDisclaimer competitorName="Phyn" />
        </div>

        <CompareCta competitorName="Phyn" competitorUrl="https://phyn.com/" />
        <RelatedQuestions questions={RELATED_QUESTIONS} />
        <CompareOtherSystems currentPath={CANONICAL} />
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
          { name: 'Beluga vs Phyn', path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
