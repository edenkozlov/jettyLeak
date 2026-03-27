import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import logo from '@/assets/belugaLogo.png'
import heroVideo from '@/assets/water.mp4'
import deviceImg from '@/assets/iphone1.png'
import leakImg from '@/assets/iphone2.png'
import { supabase } from '@/lib/supabase'
import ScrollToTopButton from '@/components/ScrollToTopButton'

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pillarsModalOpen, setPillarsModalOpen] = useState(false)

  useEffect(() => {
    if (!pillarsModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPillarsModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [pillarsModalOpen])

  return (
    <div className="min-h-screen overflow-x-hidden antialiased">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Beluga" className="h-8 sm:h-9" /><span className="text-lg font-bold text-gray-900 sm:text-xl">Beluga</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="hidden gap-7 md:flex">
              {['Product', 'Features', 'Health', 'How It Works'].map((l, i) => (
                <a key={l} href={['#product', '#features', '#building-health', '#how-it-works'][i]} className="text-[13px] text-gray-400 transition hover:text-gray-700">{l}</a>
              ))}
              <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">Case Study</Link>
              <a href="https://pitch.com/v/belugapitchdeck-j52a9r" target="_blank" rel="noopener noreferrer" className="text-[13px] text-gray-400 transition hover:text-gray-700">Investor</a>
            </div>
            <Link to="/login" className="hidden text-[13px] text-gray-400 transition hover:text-gray-700 sm:block">Sign In</Link>
            <a href="#interested" className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]">
              Get Started
            </a>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 md:hidden"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#product" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Product</a>
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Features</a>
              <a href="#building-health" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Health</a>
              <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">How It Works</a>
              <Link to="/case-study" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Case Study</Link>
              <a href="https://pitch.com/v/belugapitchdeck-j52a9r" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Investor</a>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Sign In</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="relative flex min-h-screen items-center justify-center bg-white">
        <video
          ref={(el) => {
            if (el && !el.dataset.started) {
              el.dataset.started = 'true'
              el.addEventListener('loadedmetadata', () => {
                el.currentTime = el.duration * 0.10
              }, { once: true })
            }
          }}
          autoPlay loop muted playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white/60 px-4 py-2 backdrop-blur-sm animate-slide-up">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[13px] font-medium text-gray-700">Water intelligence for buildings</span>
            </div>

            <h1 className="max-w-4xl text-[36px] leading-[1.08] font-bold tracking-tight text-gray-900 animate-slide-up sm:text-5xl md:text-6xl lg:text-[72px]" style={{ animationDelay: '0.1s' }}>
              Understand your building's
              <br />
              <span className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 bg-clip-text text-transparent">
                water system
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-gray-700 animate-slide-up sm:mt-7 sm:text-[22px]" style={{ animationDelay: '0.2s' }}>
              One sensor. Every fixture. No guesswork.
            </p>

            <div className="mt-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <a
                href="#interested"
                className="inline-block rounded-full bg-indigo-500 px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/30"
              >
                Start Monitoring
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ PRODUCT ━━━ */}
      <section id="product" className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.04),transparent_50%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:text-[34px] md:text-[46px]">
              A system that understands<br className="hidden sm:block" /> your plumbing
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:mt-4 sm:text-[16px]">
              See what's happening immediately, and how it changes over time.
            </p>
          </div>

          <div className="mt-12 grid items-center gap-10 sm:mt-20 sm:gap-16 lg:grid-cols-[1fr_auto]">
            <div className="space-y-6 order-2 lg:order-1">
              {[
                {
                  title: 'Understands every fixture',
                  desc: 'Identifies how toilets, sinks, showers, and appliances behave — even in older buildings with no documentation.',
                  icon: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>,
                  gradient: 'from-indigo-500 to-indigo-600',
                },
                {
                  title: 'Works from a single install',
                  desc: 'One sensor on the main line gives full visibility across the entire building. No pipe cutting. No specialized labor.',
                  icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
                  gradient: 'from-blue-500 to-cyan-500',
                },
                {
                  title: 'Tracks performance over time',
                  desc: 'See how fixtures change as they age. Catch inefficiencies early, before they become costly problems.',
                  icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
                  gradient: 'from-cyan-500 to-teal-500',
                },
                {
                  title: 'Builds a live model of your system',
                  desc: "Beluga continuously maps how water flows through your building, creating a dynamic understanding of your plumbing.",
                  icon: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>,
                  gradient: 'from-amber-500 to-orange-500',
                },
                {
                  title: 'Immediate visibility',
                  desc: 'Right after installation, Beluga surfaces key insights on usage, inefficiencies, and opportunities to improve performance.',
                  icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
                  gradient: 'from-violet-500 to-indigo-500',
                },
              ].map((f) => (
                <div key={f.title} className="group flex gap-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg shadow-indigo-500/10 transition-transform group-hover:scale-105`}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900">{f.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative order-1 mx-auto lg:order-2 lg:mx-0">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-100 to-cyan-50 opacity-50 blur-2xl" />
              <img src={deviceImg} alt="Beluga mobile app" className="relative mx-auto w-52 rounded-[2rem] shadow-xl sm:w-60 lg:w-64" />
            </div>
          </div>
        </div>
      </section>

      {/* wave: white → dark */}
      <div className="relative -mt-px bg-white">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path d="M0 40C240 0 480 80 720 40C960 0 1200 80 1440 40V80H0V40Z" fill="#030712" />
        </svg>
      </div>

      {/* ━━━ WHAT BELUGA ENABLES (dark band) ━━━ */}
      <section id="features" className="relative bg-gray-950 pt-12 pb-20 text-white sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.08),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">What Beluga enables</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-center text-[26px] leading-tight font-bold tracking-tight sm:mt-5 sm:text-[34px] md:text-[46px]">
            Know what's actually happening<br className="hidden sm:block" /> inside your building
          </h2>

          <div className="mt-12 flex flex-wrap justify-center gap-3 sm:mt-20 sm:gap-4">
            {[
              {
                title: 'Fixture Performance & Analysis',
                desc: "See how toilets, sinks, and showers actually perform — not how they're supposed to.",
                icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
                glow: 'bg-indigo-500/20',
              },
              {
                title: 'Water Cost Reduction',
                desc: 'Identify where water is being used inefficiently and reduce unnecessary consumption.',
                icon: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
                glow: 'bg-blue-500/20',
              },
              {
                title: 'Fixture Comparison & Benchmarking',
                desc: 'Compare fixtures against ideal performance standards to spot underperforming units instantly.',
                icon: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
                glow: 'bg-cyan-500/20',
              },
              {
                title: 'Warranty & Replacement Opportunities',
                desc: 'Surface fixtures that may qualify for replacement based on performance patterns.',
                icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
                glow: 'bg-emerald-500/20',
              },
              {
                title: 'Leak & Anomaly Detection',
                desc: 'Detect abnormal usage patterns across the building, including leaks.',
                icon: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
                glow: 'bg-amber-500/20',
              },
            ].map((f) => (
              <div key={f.title} className="group relative w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/10 hover:bg-white/[0.04] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]">
                <div className={`absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full ${f.glow} blur-2xl opacity-0 transition-opacity group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <svg className="h-5 w-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                  </div>
                  <h3 className="text-[15px] font-semibold">{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/35">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* wave: dark → white */}
      <div className="relative -mt-px bg-gray-950">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="white" />
        </svg>
      </div>

      {/* ━━━ DASHBOARD ━━━ */}
      <section className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(14,165,233,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.04),transparent_50%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
            <div className="relative mx-auto lg:mx-0">
              <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-indigo-100/60 via-cyan-100/40 to-emerald-50/60 blur-2xl sm:-inset-8" />
              <img src={leakImg} alt="Beluga mobile app telemetry data" className="relative mx-auto w-52 rounded-[2rem] shadow-2xl sm:w-60 lg:w-64" />
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-indigo-500 uppercase">Dashboard</p>
              <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[42px]">
                Everything in one place
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
                Full visibility into your building's water system — from high-level usage to individual fixture performance.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                {[
                  { icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>, title: 'Usage over time', desc: 'Track total water usage with clear, real-time trends.' },
                  { icon: <><path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" /></>, title: 'Breakdown by fixture', desc: 'Understand where your water is going.' },
                  { icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>, title: 'Flagged fixtures', desc: 'See which fixtures need attention instantly.' },
                  { icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />, title: 'Performance tracking', desc: 'Monitor how fixtures change over time.' },
                  { icon: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>, title: 'Savings insights', desc: 'See how much water and cost can be reduced.' },
                  { icon: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>, title: 'Portfolio view', desc: 'Compare buildings from one dashboard.' },
                ].map((item) => (
                  <div key={item.title}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                    </div>
                    <h3 className="mt-2 text-[13px] font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ BUILDING HEALTH INDEX ━━━ */}
      <section
        id="building-health"
        className="relative border-t border-gray-100 bg-gradient-to-b from-slate-50/80 to-white pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-36"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.06),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(6,182,212,0.05),transparent_45%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-500 uppercase">
              Building Health Index
            </p>
            <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[42px]">
              Your building’s water fingerprint
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-snug text-gray-600 sm:mt-4 sm:text-[16px]">
              One score for drift from <em>your</em> normal—not a generic benchmark.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-lg sm:mt-12 lg:mx-0 lg:mt-14 lg:max-w-none lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-8">
            <div
              className="flex min-h-[28rem] w-full flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-lg shadow-indigo-500/[0.07] ring-1 ring-black/[0.02] sm:min-h-[30rem] sm:p-6 lg:min-h-0 lg:h-full"
              aria-label="Example: Building Health Index card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                    My property
                  </p>
                  <p className="mt-1 text-[13px] text-gray-500">
                    Self-baseline · illustrative dashboard
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tabular-nums text-gray-900">78</span>
                  <span className="text-sm font-medium text-gray-400">/ 100</span>
                </div>
              </div>

              <p className="mt-3 text-[12px] leading-snug text-gray-600">
                Sustained flow pattern vs your norm—could be drift or a new continuous use; worth checking
                before it becomes damage.
              </p>

              <div className="mt-6 grid flex-1 grid-cols-2 content-start gap-2 sm:gap-3">
                {[
                  { k: 'Stability', v: 82, hint: '30% · drift & new patterns' },
                  { k: 'Hydraulic stress', v: 76, hint: '25% · load over time' },
                  { k: 'Appliance health', v: 74, hint: '30% · signatures aging' },
                  { k: 'Mechanical', v: 88, hint: '15% · vibration layer' },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 sm:px-3.5 sm:py-3"
                  >
                    <p className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                      {row.k}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">{row.v}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-gray-400">{row.hint}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPillarsModalOpen(true)}
                className="mt-5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 to-white px-4 py-3.5 text-left shadow-sm ring-1 ring-indigo-100/80 transition hover:border-indigo-300 hover:from-indigo-50 hover:shadow-md"
                aria-haspopup="dialog"
                aria-expanded={pillarsModalOpen}
                aria-label="Learn what signals go into your Building Health Index"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                    Learn more
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-gray-900">
                    What we look at to build this score
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="mt-10 flex min-h-[28rem] w-full flex-col lg:mt-0 lg:min-h-0 lg:h-full">
              <LandingBhiTrendChart />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ THE SENSOR ━━━ */}
      <section className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-emerald-600 uppercase">The sensor</p>
            <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[46px]">
              One install. Full visibility.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:mt-4 sm:text-[16px]">
              Beluga installs on your building's main water line and observes how water moves through the system — no pipe cutting or specialized labor required.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4">
            {[
              { icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />, title: 'Real usage tracking', desc: 'See how water is used across your building over time, from total consumption to detailed patterns.' },
              { icon: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="2" x2="9" y2="4" /><line x1="15" y1="2" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="22" /><line x1="15" y1="20" x2="15" y2="22" /><line x1="20" y1="9" x2="22" y2="9" /><line x1="20" y1="14" x2="22" y2="14" /><line x1="2" y1="9" x2="4" y2="9" /><line x1="2" y1="14" x2="4" y2="14" /></>, title: 'Fixture intelligence', desc: 'Automatically identifies toilets, sinks, showers, and appliances based on how water flows through the system.' },
              { icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, title: 'Performance insights', desc: "Understand what's inefficient, what's changing, and where to focus — without guesswork." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 text-center sm:p-6">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* wave: white → dark */}
      <div className="relative -mt-px bg-white">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path d="M0 40C240 0 480 80 720 40C960 0 1200 80 1440 40V80H0V40Z" fill="#030712" />
        </svg>
      </div>

      {/* ━━━ HOW IT WORKS + WHO IT'S FOR (dark band) ━━━ */}
      <section id="how-it-works" className="relative overflow-hidden bg-gray-950 pt-12 pb-20 text-white sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.1),transparent_60%)]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] animate-glow-pulse" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          {/* Who It's For */}
          <div>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">Who it's for</p>
              <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight sm:mt-5 sm:text-[34px] md:text-[46px]">
                From single properties<br className="hidden sm:block" /> to full portfolios
              </h2>
            </div>

            <div className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {[
                {
                  label: 'Property managers',
                  detail: 'Understand what\u2019s happening across every building and reduce operating costs.',
                  icon: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></>,
                },
                {
                  label: 'Commercial buildings',
                  detail: 'Offices, retail, and mixed-use spaces gain visibility into water usage and inefficiencies.',
                  icon: <><path d="M2 20h20" /><path d="M5 20V8l7-5 7 5v12" /><rect x="9" y="12" width="6" height="8" /></>,
                },
                {
                  label: 'Multi-family & condos',
                  detail: 'Track shared systems, compare units, and identify issues early.',
                  icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
                },
                {
                  label: 'Industrial & facilities',
                  detail: 'Monitor water usage across large systems without adding complexity.',
                  icon: <><path d="M2 20h20" /><path d="M5 20V8l7-5 7 5v12" /><path d="M9 20v-6h6v6" /></>,
                },
              ].map((c) => (
                <div key={c.label} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/10 hover:bg-white/[0.05]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <svg className="h-5 w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                  </div>
                  <h3 className="text-[15px] font-semibold">{c.label}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/35">{c.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center sm:mt-16">
              <Link
                to="/case-study"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-white/60 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
              >
                View Case Study
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* wave: dark → white */}
      <div className="relative -mt-px bg-gray-950">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="white" />
        </svg>
      </div>

      {/* ━━━ CTA ━━━ */}
      <InterestSection />

      {/* ━━━ Footer ━━━ */}
      <footer className="border-t border-gray-100 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 md:flex-row">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Beluga" className="h-7" /><span className="text-sm font-bold text-gray-900">Beluga</span></Link>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            {['Product', 'Features', 'Health', 'How It Works'].map((l, i) => (
              <a key={l} href={['#product', '#features', '#building-health', '#how-it-works'][i]} className="text-[12px] text-gray-400 transition hover:text-gray-600">{l}</a>
            ))}
            <Link to="/case-study" className="text-[12px] text-gray-400 transition hover:text-gray-600">Case Study</Link>
            <a href="https://pitch.com/v/belugapitchdeck-j52a9r" target="_blank" rel="noopener noreferrer" className="text-[12px] text-gray-400 transition hover:text-gray-600">Investor</a>
            <Link to="/login" className="text-[12px] text-gray-400 transition hover:text-gray-600">Sign In</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            <Link to="/support" className="text-[12px] text-gray-400 transition hover:text-gray-600">Support</Link>
            <Link to="/privacy" className="text-[12px] text-gray-400 transition hover:text-gray-600">Privacy Policy</Link>
            <Link to="/terms" className="text-[12px] text-gray-400 transition hover:text-gray-600">Terms of Service</Link>
          </div>
          <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} Beluga — Water intelligence for buildings</p>
        </div>
      </footer>

      {pillarsModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-hidden
            onClick={() => setPillarsModalOpen(false)}
          />
          <div
            className="relative z-10 flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-pillars-modal-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <h3 id="landing-pillars-modal-title" className="text-[17px] font-semibold text-gray-900">
                What goes into your score
              </h3>
              <button
                type="button"
                onClick={() => setPillarsModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-gray-600 sm:px-6 sm:py-5">
              <p className="text-[14px] text-gray-700">
                We learn how water usually behaves in <em>your</em> building, then compare new behavior to
                that history. The index blends four kinds of signal—each one uses sensor data you already have
                on the main line.
              </p>
              <ul className="mt-5 space-y-4 text-[13px]">
                <li>
                  <strong className="text-gray-900">System stability</strong> <span className="text-gray-400">(largest share)</span>
                  — whether usage patterns, timing, and flow duration still match what we’ve learned is normal
                  for you—new or drifting behavior gets flagged.
                </li>
                <li>
                  <strong className="text-gray-900">Hydraulic stress</strong> — how hard and how long the system
                  is working versus its usual load (quick spikes vs sustained strain add up differently).
                </li>
                <li>
                  <strong className="text-gray-900">Appliance &amp; fixture health</strong> — whether toilets,
                  dishwashers, and other draws still match their typical “signatures”; drift can mean wear or
                  inefficiency before a obvious failure.
                </li>
                <li>
                  <strong className="text-gray-900">Mechanical health</strong> — vibration from the same sensor:
                  turbulence and instability that don’t line up with normal flow can point to strain in the
                  plumbing system.
                </li>
              </ul>
              <p className="mt-5 text-[12px] text-gray-500">
                Exact weighting stays tuned as we ship; the app will always show what drove a given score.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <ScrollToTopButton />
    </div>
  )
}

/** Mock weekly series for landing — illustrative only */
const LANDING_BHI_WEEKLY = [
  { day: 'Mon', bhi: 72 },
  { day: 'Tue', bhi: 73 },
  { day: 'Wed', bhi: 74 },
  { day: 'Thu', bhi: 74 },
  { day: 'Fri', bhi: 76 },
  { day: 'Sat', bhi: 77 },
  { day: 'Sun', bhi: 78 },
] as const

function LandingBhiTrendChart() {
  const fillId = `landing-bhi-area-${useId().replace(/:/g, '')}`

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-lg shadow-indigo-500/[0.07] ring-1 ring-black/[0.02] sm:p-6"
      aria-label="Example: BHI trend in the Beluga dashboard"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Analytics
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-gray-900">Building Health Index</p>
          <p className="mt-0.5 text-[12px] text-gray-500">
            Drift vs your normal · last 7 days · My property
          </p>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[13px] font-bold tabular-nums text-emerald-800">
            <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m18 15-6-6-6 6" />
            </svg>
            +3
          </p>
          <p className="mt-1 text-[11px] text-gray-500">vs prior week avg.</p>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 gap-8 border-b border-dashed border-gray-100 pb-3">
        <div>
          <p className="text-[11px] font-medium text-gray-400">Now</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">78</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-gray-400">Prior week</p>
          <p className="text-lg font-bold tabular-nums text-gray-400">75</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-gray-400">Range</p>
          <p className="text-lg font-bold tabular-nums text-gray-700">72–78</p>
        </div>
      </div>

      <div className="mt-2 min-h-[180px] flex-1 w-full min-w-0 lg:min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={[...LANDING_BHI_WEEKLY]}
            margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              domain={[68, 82]}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={28}
              tickCount={5}
            />
            <Tooltip
              cursor={{ stroke: '#d1d5db', strokeDasharray: '4 4' }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 12,
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              }}
              formatter={(value: number | undefined) => [value != null ? `${value}` : '—', 'BHI']}
              labelFormatter={(label) => `${label}`}
            />
            <Area
              type="monotone"
              dataKey="bhi"
              stroke="#059669"
              strokeWidth={2}
              fill={`url(#${fillId})`}
              dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function InterestSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const { error } = await supabase
        .from('interested')
        .insert({ email: email.trim().toLowerCase() })

      if (error) {
        if (error.code === '23505') {
          setStatus('success')
        } else {
          throw error
        }
      } else {
        setStatus('success')
      }
      setEmail('')
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err?.message || 'Something went wrong. Try again.')
    }
  }

  return (
    <section id="interested" className="bg-white px-4 pt-12 pb-20 sm:px-0 sm:pt-16 sm:pb-28">
      <div className="mx-auto max-w-5xl sm:px-6">
        <div className="relative overflow-hidden rounded-[20px] bg-gray-950 px-6 py-14 text-center sm:rounded-[28px] sm:px-16 sm:py-20">
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px] animate-glow-pulse" />
          <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px] animate-glow-pulse" style={{ animationDelay: '2s' }} />

          <div className="relative">
            <h2 className="text-[26px] leading-tight font-bold tracking-tight text-white sm:text-[34px] md:text-[46px]">
              Understand your building's<br className="hidden sm:block" /> water system
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] text-white/40 sm:mt-4 sm:text-[15px]">
              Get visibility into every fixture, every pattern, and every inefficiency.
            </p>

            {status === 'success' ? (
              <div className="mx-auto mt-8 max-w-md rounded-full border border-emerald-500/20 bg-emerald-500/10 px-6 py-3.5 text-sm font-medium text-emerald-400">
                We've got your info. Someone from our team will be in touch shortly.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:mt-10 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 hover:shadow-xl disabled:opacity-50"
                >
                  {status === 'loading' ? 'Sending...' : 'Request a Quote'}
                </button>
              </form>
            )}

            {status === 'error' && (
              <p className="mt-3 text-[13px] text-red-400">{errorMsg}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
