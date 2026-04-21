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

export default function HowItWorks() {
  useDocumentMeta(
    'How it works — Beluga',
    'One clamp-on sensor, fixture-level disaggregation, and a live Water Health Index for every property. No pipe cutting, no plumber, no per-fixture hardware.',
  )

  return (
    <div className="min-h-screen bg-[#0b1221] text-white antialiased">
      <LandingNav />

      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-200px] h-[520px] w-[960px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[140px]" />
        <div className="absolute left-[-120px] top-[520px] h-[420px] w-[640px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute right-[-120px] top-[1200px] h-[420px] w-[640px] rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>

      <Hero />
      <StepsSection />
      <Cta />

      <LandingFooter />
      <ScrollToTopButton />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
          </span>
          How it works
        </p>
        <h1 className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-tight sm:text-[54px] lg:text-[64px]">
          One sensor.{' '}
          <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            Total water intelligence.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-gray-300 sm:text-[17px]">
          No pipe cutting. No plumber. No per-fixture hardware. Beluga clamps
          onto your existing water meter and learns your entire building in days.
        </p>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Steps                                                                      */
/* -------------------------------------------------------------------------- */

function StepsSection() {
  return (
    <section className="relative py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ol className="flex flex-col gap-20 sm:gap-28 lg:gap-36">
          {STEPS.map((step, i) => (
            <StepBlock key={step.n} step={step} index={i} />
          ))}
        </ol>
      </div>
    </section>
  )
}

function StepBlock({ step, index }: { step: Step; index: number }) {
  const imageFirst = index % 2 === 1

  return (
    <li className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <div className={imageFirst ? 'lg:order-2' : 'lg:order-1'}>
        <div className="inline-flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-[0.3em] text-sky-300/70">
            STEP {step.n}
          </span>
          <span className="inline-flex items-center rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-sky-200">
            {step.tag}
          </span>
        </div>
        <h2 className="mt-4 text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[34px] lg:text-[38px]">
          {step.title}
        </h2>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-300 sm:text-[16px]">
          {step.body}
        </p>
      </div>

      <div className={imageFirst ? 'lg:order-1' : 'lg:order-2'}>
        <StepVisual image={step.image} alt={step.alt} n={step.n} />
      </div>
    </li>
  )
}

function StepVisual({ image, alt, n }: { image: string; alt: string; n: string }) {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      {/* Glow halo behind the image */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -m-8 rounded-[2rem] bg-gradient-to-br from-sky-500/15 via-transparent to-cyan-500/15 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0f172a] shadow-[0_30px_90px_-30px_rgba(14,165,233,0.35)]">
        <img
          src={image}
          alt={alt}
          loading="lazy"
          className="block aspect-square w-full object-cover"
        />
        {/* Step index chip */}
        <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-sky-400" />
          {n}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function Cta() {
  return (
    <section className="relative pt-10 pb-24 sm:pt-16 sm:pb-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.04] p-8 text-center shadow-[0_30px_90px_-30px_rgba(14,165,233,0.25)] sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.18),transparent_65%)]"
          />
          <div className="relative">
            <h2 className="text-[26px] font-semibold tracking-tight sm:text-[32px]">
              Ready to see your building&rsquo;s score?
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-300 sm:text-[15px]">
              Takes under 3 seconds. No account needed.
            </p>
            <Link
              to="/property-intelligence"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-gray-900 shadow-lg shadow-black/20 transition hover:bg-gray-100"
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
      </div>
    </section>
  )
}
