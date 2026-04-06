import { useEffect } from 'react'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'

const PAGE_TITLE = 'Articles — Beluga'
const META_DESCRIPTION =
  'Educational articles about water monitoring systems, leak detection, water intelligence, and choosing the right system for your building.'

const ARTICLES: { title: string; description: string; path: string }[] = [
  {
    title: 'What Is a Water Monitoring System? (And Why Most Are Different)',
    description:
      'The standard definition is misleading. Learn the four types of systems and why the underlying approach matters.',
    path: '/articles/what-is-water-monitoring-system',
  },
  {
    title: 'How to Choose a Water Monitoring System for Your Building',
    description:
      'A practical guide based on building type, goals, installation constraints, and operational workflow.',
    path: '/articles/how-to-choose-water-monitoring-system',
  },
  {
    title: "Water Monitoring vs Leak Detection: What's the Difference?",
    description:
      'They solve different problems. Understanding the distinction is key to choosing the right solution.',
    path: '/articles/water-monitoring-vs-leak-detection',
  },
  {
    title: "There Are 4 Types of Water Monitoring Systems — Here's the Difference",
    description:
      'Leak detection, shutoff, non-invasive monitoring, and water intelligence — each designed for a specific purpose.',
    path: '/articles/4-types-of-water-monitoring-systems',
  },
  {
    title: 'Best Water Monitoring Systems for Commercial Buildings (2026)',
    description:
      'A guide to the categories of systems available for commercial and multi-unit environments.',
    path: '/articles/best-water-monitoring-commercial-buildings',
  },
  {
    title: 'Non-Invasive vs Inline Water Monitoring: Which One Makes Sense?',
    description:
      'How installation method shapes cost, deployment speed, scalability, and system fit.',
    path: '/articles/non-invasive-vs-inline-water-monitoring',
  },
  {
    title: 'What Actually Happens After a Leak Alert in Buildings',
    description:
      'Detection is only the first step. The real outcome depends on what happens next.',
    path: '/articles/what-happens-after-leak-alert',
  },
  {
    title: "Why Leak Detection Alone Isn't Enough for Commercial Buildings",
    description:
      'Most issues develop gradually. Event-based detection misses what continuous monitoring catches.',
    path: '/articles/why-leak-detection-not-enough-commercial',
  },
  {
    title: 'How Property Managers Actually Handle Water Issues',
    description:
      'Water issues are operational problems handled by people — not just technical events.',
    path: '/articles/how-property-managers-handle-water-issues',
  },
  {
    title: "What Is a Water Intelligence System? (And Why It's Different)",
    description:
      'A shift from reacting to events to understanding how the entire system behaves over time.',
    path: '/articles/what-is-water-intelligence-system',
  },
]

export default function Articles() {
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
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">Resources</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Articles
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
            Educational guides on water monitoring systems, leak detection, water intelligence, and choosing the right approach for your building.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-4">
          {ARTICLES.map((article, i) => (
            <Link
              key={article.path}
              to={article.path}
              className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-400 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">
                  {i + 1}
                </span>
                <h2 className="text-[16px] font-semibold leading-snug text-gray-900 sm:text-[17px]">
                  {article.title}
                </h2>
              </div>
              <p className="mt-2 pl-9 text-[14px] leading-relaxed text-gray-500">
                {article.description}
              </p>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
