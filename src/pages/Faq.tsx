import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE = 'Beluga FAQ: Water Monitoring & Building Intelligence'
const META_DESCRIPTION =
  'Answers to common questions about Beluga, water monitoring systems, leak detection, installation, and building water intelligence.'

type FaqEntry = {
  q: string
  /** Combined for FAQPage schema */
  schemaText: string
  paragraphs?: string[]
  list?: string[]
  /** Paragraph after optional list */
  afterList?: string
}

const FAQ_SECTIONS: { heading: string; items: FaqEntry[] }[] = [
  {
    heading: 'General',
    items: [
      {
        q: 'What is Beluga?',
        schemaText:
          'Beluga is a water intelligence platform designed to help buildings better understand how their plumbing systems behave over time. It provides continuous monitoring, identifies anomalies, and offers insight into water usage patterns.',
        paragraphs: [
          'Beluga is a water intelligence platform designed to help buildings better understand how their plumbing systems behave over time. It provides continuous monitoring, identifies anomalies, and offers insight into water usage patterns.',
        ],
      },
      {
        q: 'How is Beluga different from traditional leak detectors?',
        schemaText:
          'Traditional leak detection systems typically focus on identifying active leaks and, in some cases, shutting off water. Beluga focuses on broader system visibility. In addition to detecting anomalies that may indicate leaks, it aims to provide insight into usage, inefficiencies, and long-term system behavior.',
        paragraphs: [
          'Traditional leak detection systems typically focus on identifying active leaks and, in some cases, shutting off water.',
          'Beluga focuses on broader system visibility. In addition to detecting anomalies that may indicate leaks, it aims to provide insight into usage, inefficiencies, and long-term system behavior.',
        ],
      },
      {
        q: 'Who is Beluga designed for?',
        schemaText:
          'Beluga is primarily designed for commercial building owners, property managers, and multi-unit residential buildings. Some use cases may extend to other environments depending on system configuration.',
        paragraphs: ['Beluga is primarily designed for:'],
        list: [
          'Commercial building owners',
          'Property managers',
          'Multi-unit residential buildings',
        ],
        afterList:
          'Some use cases may extend to other environments depending on system configuration.',
      },
    ],
  },
  {
    heading: 'Installation',
    items: [
      {
        q: 'Does Beluga require plumbing modifications?',
        schemaText:
          'No. Beluga is designed to be installed without modifying existing plumbing infrastructure.',
        paragraphs: [
          'No. Beluga is designed to be installed without modifying existing plumbing infrastructure.',
        ],
      },
      {
        q: 'Where is the device installed?',
        schemaText:
          'The system is typically installed on or near the main water line to monitor overall system behavior.',
        paragraphs: [
          'The system is typically installed on or near the main water line to monitor overall system behavior.',
        ],
      },
      {
        q: 'How long does installation take?',
        schemaText:
          'Installation time can vary depending on the building, but it is generally designed to be quick and non-disruptive.',
        paragraphs: [
          'Installation time can vary depending on the building, but it is generally designed to be quick and non-disruptive.',
        ],
      },
    ],
  },
  {
    heading: 'Features & Capabilities',
    items: [
      {
        q: 'Does Beluga detect leaks?',
        schemaText:
          'Beluga can detect anomalies in water usage patterns that may indicate leaks. Its approach is based on monitoring system behavior over time rather than only detecting sudden events.',
        paragraphs: [
          'Beluga can detect anomalies in water usage patterns that may indicate leaks. Its approach is based on monitoring system behavior over time rather than only detecting sudden events.',
        ],
      },
      {
        q: 'Does Beluga automatically shut off water?',
        schemaText:
          'Automatic shutoff is not a core feature. Beluga focuses on monitoring, detection, and insight rather than direct intervention.',
        paragraphs: [
          'Automatic shutoff is not a core feature. Beluga focuses on monitoring, detection, and insight rather than direct intervention.',
        ],
      },
      {
        q: 'Can Beluga track water usage?',
        schemaText:
          'Yes. Beluga provides visibility into water usage over time, helping identify patterns, inefficiencies, and unusual activity.',
        paragraphs: [
          'Yes. Beluga provides visibility into water usage over time, helping identify patterns, inefficiencies, and unusual activity.',
        ],
      },
      {
        q: 'Can it identify specific fixtures (like toilets or sinks)?',
        schemaText:
          'Beluga uses pattern-based analysis to interpret system behavior, which may allow it to differentiate between types of usage in certain contexts.',
        paragraphs: [
          'Beluga uses pattern-based analysis to interpret system behavior, which may allow it to differentiate between types of usage in certain contexts.',
        ],
      },
    ],
  },
  {
    heading: 'Use Cases',
    items: [
      {
        q: 'Can Beluga help reduce water costs?',
        schemaText:
          'By identifying inefficiencies and abnormal usage patterns, Beluga may help highlight opportunities to reduce water consumption.',
        paragraphs: [
          'By identifying inefficiencies and abnormal usage patterns, Beluga may help highlight opportunities to reduce water consumption.',
        ],
      },
      {
        q: 'Is it useful for large buildings?',
        schemaText:
          'Yes. Beluga is designed with multi-unit and commercial buildings in mind, where system-level visibility is often limited.',
        paragraphs: [
          'Yes. Beluga is designed with multi-unit and commercial buildings in mind, where system-level visibility is often limited.',
        ],
      },
      {
        q: 'Can it help prevent damage from leaks?',
        schemaText:
          'Early detection of abnormal behavior may help reduce the impact of leaks by identifying issues before they escalate.',
        paragraphs: [
          'Early detection of abnormal behavior may help reduce the impact of leaks by identifying issues before they escalate.',
        ],
      },
    ],
  },
  {
    heading: 'Comparison',
    items: [
      {
        q: 'How does Beluga compare to systems with automatic shutoff?',
        schemaText:
          'Some systems prioritize immediate intervention by shutting off water when a leak is detected. Beluga focuses on understanding system behavior continuously, which may support earlier detection of inefficiencies and anomalies.',
        paragraphs: [
          'Some systems prioritize immediate intervention by shutting off water when a leak is detected. Beluga focuses on understanding system behavior continuously, which may support earlier detection of inefficiencies and anomalies.',
        ],
      },
      {
        q: 'Is Beluga a replacement for shutoff systems?',
        schemaText:
          'Beluga is not necessarily a replacement. Depending on the use case, it may complement other systems by providing additional insight and monitoring.',
        paragraphs: [
          'Beluga is not necessarily a replacement. Depending on the use case, it may complement other systems by providing additional insight and monitoring.',
        ],
      },
    ],
  },
  {
    heading: 'Data & Monitoring',
    items: [
      {
        q: 'Does Beluga monitor continuously?',
        schemaText:
          'Yes. The system is designed to monitor water behavior continuously over time.',
        paragraphs: [
          'Yes. The system is designed to monitor water behavior continuously over time.',
        ],
      },
      {
        q: 'Does it store historical data?',
        schemaText:
          'Yes. Historical data is used to establish baselines and identify changes or anomalies.',
        paragraphs: [
          'Yes. Historical data is used to establish baselines and identify changes or anomalies.',
        ],
      },
      {
        q: 'Is the data real-time?',
        schemaText:
          'Monitoring is ongoing, with insights generated based on system behavior and detected patterns.',
        paragraphs: [
          'Monitoring is ongoing, with insights generated based on system behavior and detected patterns.',
        ],
      },
    ],
  },
  {
    heading: 'Getting Started',
    items: [
      {
        q: 'How can I get access to Beluga?',
        schemaText:
          'You can request early access or a building assessment through the website.',
        paragraphs: [
          'You can request early access or a building assessment through the website.',
        ],
      },
      {
        q: 'Is Beluga available everywhere?',
        schemaText:
          'Availability may vary depending on deployment and rollout.',
        paragraphs: ['Availability may vary depending on deployment and rollout.'],
      },
      {
        q: 'Can I speak with someone before installing?',
        schemaText:
          'Yes. You can request a call or consultation to better understand whether the system fits your needs.',
        paragraphs: [
          'Yes. You can request a call or consultation to better understand whether the system fits your needs.',
        ],
      },
    ],
  },
]

function FaqAnswer({ entry }: { entry: FaqEntry }) {
  return (
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
      {entry.paragraphs?.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {entry.list && entry.list.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {entry.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {entry.afterList ? <p>{entry.afterList}</p> : null}
    </div>
  )
}

export default function Faq() {
  const faqLd = useMemo(
    () =>
      FAQ_SECTIONS.flatMap((s) =>
        s.items.map((item) => ({
          '@type': 'Question' as const,
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer' as const,
            text: item.schemaText,
          },
        })),
      ),
    [],
  )

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
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">FAQ</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h1>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.heading} className="mb-14 last:mb-0 sm:mb-16">
            <h2 className="border-b border-gray-200 pb-3 text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">
              {section.heading}
            </h2>
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <div key={item.q} className="py-8 first:pt-6">
                  <h3 className="text-[17px] font-semibold text-gray-900">{item.q}</h3>
                  <FaqAnswer entry={item} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold tracking-wide text-gray-500 uppercase">Disclaimer</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
            This FAQ is provided for informational purposes only. Features and capabilities may evolve
            over time. This content does not constitute technical or professional advice.
          </p>
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqLd,
          }),
        }}
      />

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
