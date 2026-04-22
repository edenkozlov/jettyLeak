import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { LandingFooter, LandingNav } from '@/components/landing'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

import installImg from '@/assets/howItWorks/install.png'
import meterImg from '@/assets/howItWorks/meter.png'
import disaggregationImg from '@/assets/howItWorks/disaggregation.png'
import leakImg from '@/assets/howItWorks/leak.png'
import wasteImg from '@/assets/howItWorks/waste.png'
import benchmarkImg from '@/assets/howItWorks/benchmark.png'
import healthImg from '@/assets/howItWorks/health.png'

interface Step {
  n: string
  tag: string
  title: string
  body: string
  image: string
  alt: string
}

const STEPS: Step[] = [
  {
    n: '01',
    tag: 'Install in minutes',
    title: 'One sensor. No pipe cutting.',
    body: "Our clamp-on sensor wraps directly around your building's existing water meter — right where the gauge sits — and locks into place. No plumber, no drilling, no downtime. If you can tighten a strap, you can install Beluga.",
    image: installImg,
    alt: 'Clamp-on sensor wrapping around a building water meter',
  },
  {
    n: '02',
    tag: 'Magnetometer intelligence',
    title: "The sensor reads the meter's spin.",
    body: 'Inside your water meter, a small disc rotates as water flows through. Our magnetometer detects those rotations with high precision — no contact, no disruption. Every fixture in your building creates a unique flow signature the system learns to recognize.',
    image: meterImg,
    alt: 'Magnetometer picking up rotations inside a water meter',
  },
  {
    n: '03',
    tag: 'Fixture-level disaggregation',
    title: 'AI maps every fixture from one signal.',
    body: 'Our active inference model decodes the flow stream and identifies which appliance was used, for how long, and how much water it consumed. A toilet flush looks nothing like a dishwasher cycle. No additional sensors per floor, per unit, or per fixture.',
    image: disaggregationImg,
    alt: 'Flow signal being decoded into individual fixture events',
  },
  {
    n: '04',
    tag: 'Leak detection',
    title: "Catch what's silently draining your budget.",
    body: 'A running toilet. A stuck valve. A slow drip no one notices for months. Beluga detects continuous flow when your building should be quiet — flagging suspected leaks before they show up as a shock on your water bill or damage to your property.',
    image: leakImg,
    alt: 'Leak alert on a phone above a dripping pipe',
  },
  {
    n: '05',
    tag: 'Water waste & cost savings',
    title: 'See exactly where water — and money — is going.',
    body: 'Most buildings waste water not from big bursts but from small inefficiencies that compound daily. Beluga tracks consumption patterns across fixtures and flags what\u2019s above benchmark, so you can prioritize the changes that actually move the needle on your bill.',
    image: wasteImg,
    alt: 'A water drop equated to a coin — water as money',
  },
  {
    n: '06',
    tag: 'Benchmark & efficiency scoring',
    title: 'Every fixture gets graded against the standard.',
    body: 'Each identified fixture is compared against WaterSense standards and regional benchmarks. Is your toilet flushing 6 litres or 12? Beluga surfaces which fixtures are efficient, typical, or wasteful — so you know exactly what to replace and when.',
    image: benchmarkImg,
    alt: 'Fixture efficiency scores measured against WaterSense benchmarks',
  },
  {
    n: '07',
    tag: 'Continuous live scoring',
    title: 'Your building gets a Water Health Index.',
    body: 'Everything rolls up into a single live score — Healthy, Watch, Investigate, or Critical. See it at a glance across every property. Drill in and you get the full breakdown: leak risk, fixture degradation, consumption anomalies, and pipe stress.',
    image: healthImg,
    alt: 'Water Health Index gauge reading Healthy',
  },
]

/* -------------------------------------------------------------------------- */
/*  useInView — scroll-triggered active/inactive state                         */
/* -------------------------------------------------------------------------- */

function useInView<T extends HTMLElement>(threshold = 0.55) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) setInView(entry.isIntersecting)
      },
      { threshold, rootMargin: '-10% 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HowItWorks() {
  useDocumentMeta(
    'How it works — Beluga',
    'One clamp-on sensor, fixture-level disaggregation, and a live Water Health Index for every property. No pipe cutting, no plumber, no per-fixture hardware.',
  )

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <LandingNav />

      {/* Scroll story — each card fills the viewport; content animates in/out
          as it crosses the middle of the screen. */}
      <main
        className="relative snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {STEPS.map((step, i) => (
          <StepPanel key={step.n} step={step} index={i} total={STEPS.length} />
        ))}
        <CtaPanel />
      </main>

      <LandingFooter />
      <ScrollToTopButton />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Step panel — animated on-enter / on-leave                                  */
/* -------------------------------------------------------------------------- */

function StepPanel({ step, index, total }: { step: Step; index: number; total: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.45)

  return (
    <section
      ref={ref}
      className="relative flex snap-start items-center justify-center overflow-hidden px-4 sm:px-6"
      style={{ minHeight: '100svh' }}
    >
      {/* Ambient background gradient unique to each step — creates a subtle
          color shift as you scroll through them. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-700"
        style={{
          opacity: inView ? 1 : 0,
          background: `radial-gradient(ellipse at 50% 40%, ${accentFor(index)} 0%, transparent 55%)`,
        }}
      />

      <div className="w-full max-w-4xl pt-16 pb-8 sm:pt-20">
        {/* Progress pill */}
        <div
          className={[
            'flex items-center justify-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-gray-400 transition-all duration-700',
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3',
          ].join(' ')}
        >
          <span className="font-mono text-sky-600">STEP {step.n}</span>
          <span className="h-px w-8 bg-gray-200" />
          <span>
            {index + 1} <span className="text-gray-300">/</span> {total}
          </span>
        </div>

        {/* Card — image + text, animates in as a single unit from below */}
        <div
          className={[
            'mt-6 flex flex-col items-center gap-7 transition-all ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:mt-8 lg:flex-row lg:gap-12',
            inView
              ? 'opacity-100 translate-y-0 duration-[900ms]'
              : 'opacity-0 translate-y-16 duration-[500ms]',
          ].join(' ')}
        >
          {/* Image — alternate sides per step for visual rhythm */}
          <div
            className={[
              'relative w-full max-w-[300px] shrink-0 sm:max-w-[340px] lg:max-w-[380px]',
              index % 2 === 1 ? 'lg:order-2' : 'lg:order-1',
            ].join(' ')}
          >
            <div
              aria-hidden
              className={[
                'pointer-events-none absolute inset-0 -m-6 rounded-[32px] bg-gradient-to-br from-sky-500/20 via-transparent to-cyan-500/20 blur-3xl transition-all duration-1000',
                inView ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
              ].join(' ')}
            />
            <div
              className={[
                'relative overflow-hidden rounded-3xl border border-gray-200 bg-[#0f172a] shadow-[0_30px_80px_-30px_rgba(14,165,233,0.35)] transition-transform duration-[1200ms] ease-out',
                inView ? 'scale-100' : 'scale-95',
              ].join(' ')}
            >
              <img
                src={step.image}
                alt={step.alt}
                loading="lazy"
                className="block aspect-square w-full object-cover"
              />
            </div>
          </div>

          {/* Copy block */}
          <div
            className={[
              'text-center lg:text-left',
              index % 2 === 1 ? 'lg:order-1' : 'lg:order-2',
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-sky-700 transition-all duration-700',
                inView ? 'opacity-100 translate-y-0 delay-[120ms]' : 'opacity-0 translate-y-3',
              ].join(' ')}
            >
              {step.tag}
            </span>
            <h2
              className={[
                'mt-3 text-[26px] font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-[32px] lg:text-[36px] transition-all ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                inView
                  ? 'opacity-100 translate-y-0 duration-[900ms] delay-[200ms]'
                  : 'opacity-0 translate-y-4 duration-[400ms]',
              ].join(' ')}
            >
              {step.title}
            </h2>
            <p
              className={[
                'mx-auto mt-3 max-w-lg text-[14.5px] leading-relaxed text-gray-600 lg:mx-0 sm:text-[15.5px] transition-all duration-[900ms] ease-out',
                inView ? 'opacity-100 translate-y-0 delay-[320ms]' : 'opacity-0 translate-y-4',
              ].join(' ')}
            >
              {step.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function accentFor(index: number): string {
  // A very soft tint behind each step, cycling through the palette.
  const tints = [
    'rgba(14,165,233,0.10)',  // sky
    'rgba(6,182,212,0.10)',   // cyan
    'rgba(99,102,241,0.10)',  // indigo
    'rgba(244,63,94,0.07)',   // rose (for the leak card)
    'rgba(234,179,8,0.08)',   // amber (for waste)
    'rgba(16,185,129,0.09)',  // emerald (for benchmark)
    'rgba(14,165,233,0.12)',  // sky again for the final WHI
  ]
  return tints[index % tints.length]!
}

/* -------------------------------------------------------------------------- */
/*  Final CTA — animates the same way                                          */
/* -------------------------------------------------------------------------- */

function CtaPanel() {
  const { ref, inView } = useInView<HTMLDivElement>(0.45)
  return (
    <section
      ref={ref}
      className="relative flex snap-start items-center justify-center px-4 sm:px-6"
      style={{ minHeight: '100svh' }}
    >
      <div
        className={[
          'relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gray-950 p-8 text-center text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)] transition-all ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:p-14',
          inView
            ? 'opacity-100 translate-y-0 duration-[900ms]'
            : 'opacity-0 translate-y-16 duration-[500ms]',
        ].join(' ')}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.25),transparent_65%)]"
        />
        <div className="relative">
          <h2 className="text-[26px] font-semibold tracking-tight sm:text-[34px]">
            Ready to see your building&rsquo;s score?
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-gray-300 sm:text-[15px]">
            Takes under 3 seconds. No account needed.
          </p>
          <Link
            to="/property-intelligence"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-gray-900 shadow-lg shadow-black/20 transition hover:bg-gray-100"
          >
            Check Your Building
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
