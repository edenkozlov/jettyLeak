import { Link } from 'react-router'

const AUDIENCE_CARDS = [
  {
    label: 'Property managers',
    detail: 'Understand what\u2019s happening across every building and reduce operating costs.',
    icon: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </>
    ),
  },
  {
    label: 'Commercial buildings',
    detail: 'Offices, retail, and mixed-use spaces gain visibility into water usage and inefficiencies.',
    icon: (
      <>
        <path d="M2 20h20" />
        <path d="M5 20V8l7-5 7 5v12" />
        <rect x="9" y="12" width="6" height="8" />
      </>
    ),
  },
  {
    label: 'Multi-family & condos',
    detail: 'Track shared systems, compare units, and identify issues early.',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </>
    ),
  },
  {
    label: 'Industrial & facilities',
    detail: 'Monitor water usage across large systems without adding complexity.',
    icon: (
      <>
        <path d="M2 20h20" />
        <path d="M5 20V8l7-5 7 5v12" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
  },
] as const

function WhoItsForHeading() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">Who it's for</p>
      <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight sm:mt-5 sm:text-[34px] md:text-[46px]">
        From single properties
        <br className="hidden sm:block" /> to full portfolios
      </h2>
    </div>
  )
}

function AudienceGrid() {
  return (
    <div className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {AUDIENCE_CARDS.map((c) => (
        <div
          key={c.label}
          className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/10 hover:bg-white/[0.05]"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <svg
              className="h-5 w-5 text-white/50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {c.icon}
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold">{c.label}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-white/35">{c.detail}</p>
        </div>
      ))}
    </div>
  )
}

function CaseStudyCta() {
  return (
    <div className="mt-12 text-center sm:mt-16">
      <Link
        to="/case-study"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-white/60 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
      >
        View Case Study
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}

export function LandingHowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-gray-950 pt-12 pb-20 text-white sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.1),transparent_60%)]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] animate-glow-pulse" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <WhoItsForHeading />
        <AudienceGrid />
        <CaseStudyCta />
      </div>
    </section>
  )
}
