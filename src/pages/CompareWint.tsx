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

const CANONICAL = '/wint-alternative'
const PAGE_TITLE = 'Beluga vs WINT: Commercial Water Monitoring Compared'
const META_DESCRIPTION =
  'Compare Beluga and WINT for commercial buildings. Two approaches to water monitoring — leak shutoff vs continuous system intelligence. Neutral, fact-based comparison.'

const TABLE_ROWS: { feature: string; beluga: string; competitor: string }[] = [
  {
    feature: 'Core purpose',
    beluga: 'Water intelligence and system visibility',
    competitor: 'Leak detection and water management',
  },
  {
    feature: 'Installation approach',
    beluga: 'Non-invasive (no pipe modification)',
    competitor: 'Typically requires inline installation',
  },
  {
    feature: 'Leak detection',
    beluga: 'Yes (pattern and anomaly-based)',
    competitor: 'Yes (flow-based with shutoff)',
  },
  {
    feature: 'Automatic shutoff',
    beluga: 'Not core feature',
    competitor: 'Yes',
  },
  {
    feature: 'System intelligence',
    beluga: 'Deep, system-level behavioral insights',
    competitor: 'Usage tracking with alerting',
  },
  {
    feature: 'Fixture-level understanding',
    beluga: 'Yes (pattern recognition)',
    competitor: 'Limited',
  },
  {
    feature: 'Target environment',
    beluga: 'Commercial / multi-unit buildings',
    competitor: 'Commercial / construction sites',
  },
  {
    feature: 'Deployment complexity',
    beluga: 'Low (minimal hardware)',
    competitor: 'Moderate (inline hardware required)',
  },
  {
    feature: 'Monitoring philosophy',
    beluga: 'Continuous behavioral modeling',
    competitor: 'Real-time flow monitoring + alerts',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is WINT used in commercial buildings or construction sites?',
    a: 'WINT is commonly associated with both commercial buildings and construction environments, particularly where active leak prevention and water damage mitigation are priorities.',
  },
  {
    q: 'Does Beluga require plumbing modifications?',
    a: 'No. Beluga is designed to be installed non-invasively, without altering existing piping or infrastructure. This can significantly reduce deployment time and cost.',
  },
  {
    q: 'Can WINT provide system-wide water intelligence?',
    a: 'WINT provides flow-based monitoring and alerting. Broader system intelligence — such as fixture identification and behavioral analysis — is a different focus area, which is central to Beluga\'s approach.',
  },
  {
    q: 'Which system is better for a building operations team?',
    a: 'It depends on the team\'s priorities. If real-time shutoff capability is essential, WINT may be a strong fit. If the goal is deeper understanding of how water is used across the building over time, Beluga\'s intelligence-first approach may be more aligned.',
  },
  {
    q: 'How do deployment timelines compare between Beluga and WINT?',
    a: 'Beluga\'s non-invasive approach generally allows for faster deployment with minimal disruption. WINT installations may require more coordination due to inline hardware requirements. Specific timelines depend on building configuration.',
  },
  {
    q: 'Are Beluga and WINT designed for the same use cases?',
    a: 'Both operate in the commercial water monitoring space, but they prioritize different things. WINT emphasizes leak detection and shutoff. Beluga emphasizes system visibility, pattern recognition, and long-term monitoring intelligence.',
  },
]

const RELATED_QUESTIONS = [
  'What is the best WINT alternative for commercial water monitoring?',
  'How does WINT compare to other building water management systems?',
  'What is the difference between leak shutoff and water intelligence?',
  'Which water monitoring system is best for building operations teams?',
  'Is non-invasive water monitoring effective in commercial buildings?',
]

export default function CompareWint() {
  usePageSeo({ title: PAGE_TITLE, description: META_DESCRIPTION, canonicalPath: CANONICAL })

  return (
    <div className="min-h-screen bg-white antialiased">
      <CompareNav />

      <CompareHero
        h1="Beluga vs WINT"
        subtitle="A detailed, neutral comparison of two commercial water monitoring platforms — leak mitigation versus system intelligence."
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Intro */}
          <section className="mx-auto max-w-2xl">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                If you are evaluating a WINT alternative or comparing Beluga vs WINT, you are
                likely managing a commercial property where water monitoring is an operational
                priority. Both platforms serve this space, but they reflect different philosophies
                in how buildings should interact with their water infrastructure.
              </p>
              <p>
                This page compares Beluga and WINT based on publicly available information to help
                building owners, operators, and facilities teams evaluate the right approach.
              </p>
            </div>
          </section>

          <CompareTable competitorLabel="WINT" rows={TABLE_ROWS} />

          {/* Key differences */}
          <section>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
              Key difference: shutoff vs intelligence
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  WINT — real-time leak management
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  WINT focuses on monitoring water flow in real time, detecting leaks, and providing
                  automatic shutoff capabilities. It is commonly used in commercial and construction
                  environments where preventing water damage is an immediate operational concern.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  This approach is well suited for teams that need rapid, automated response to
                  active leak events.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga — continuous system intelligence
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  Beluga emphasizes understanding the full behavior of a building&apos;s water system.
                  Rather than focusing only on flow events, it builds a continuous model of usage,
                  enabling early detection of inefficiencies, fixture-level identification, and
                  long-term performance tracking.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
                  This approach is designed for teams that want to understand how water moves
                  through a building — not just react when something goes wrong.
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
                  WINT may be a strong fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet>You need real-time automatic shutoff in commercial environments</Bullet>
                  <Bullet>Your primary concern is mitigating water damage risk during operations or construction</Bullet>
                  <Bullet>You have the infrastructure to support inline hardware installation</Bullet>
                  <Bullet>Your team needs event-based alerting tied to flow anomalies</Bullet>
                </ul>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
                <h3 className="text-[16px] font-bold text-gray-900 sm:text-[18px]">
                  Beluga may be a stronger fit if:
                </h3>
                <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
                  <Bullet variant="indigo">You want non-invasive deployment with minimal disruption</Bullet>
                  <Bullet variant="indigo">You need long-term water system intelligence, not just event alerts</Bullet>
                  <Bullet variant="indigo">You want to understand usage patterns, track fixtures, and benchmark performance</Bullet>
                  <Bullet variant="indigo">You manage multi-unit or portfolio properties and need scalable visibility</Bullet>
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
                The platform is built for building owners, operators, and property managers who want
                to move beyond reactive leak detection toward proactive water system visibility.
              </p>
            </div>
          </section>

          <CompareFaq items={FAQ_ITEMS} />
          <CompareDisclaimer competitorName="WINT" />
        </div>

        <CompareCta competitorName="WINT" competitorUrl="https://wint.ai/" />
        <RelatedQuestions questions={RELATED_QUESTIONS} />
        <CompareOtherSystems currentPath={CANONICAL} />
      </article>

      <FaqSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', path: '/' },
          { name: 'Best Water Monitoring Systems', path: HUB_PATH },
          { name: 'Beluga vs WINT', path: CANONICAL },
        ]}
      />
      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
