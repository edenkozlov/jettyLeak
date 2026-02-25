import { useState } from 'react'
import { Link } from 'react-router'

import logo from '@/assets/logoTransparent.png'
import heroVideo from '@/assets/water.mp4'
import deviceImg from '@/assets/graph.png'
import diagramImg from '@/assets/pipeillustration.png'
import leakImg from '@/assets/app.png'
import { supabase } from '@/lib/supabase'
import ScrollToTopButton from '@/components/ScrollToTopButton'

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden antialiased">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/">
            <img src={logo} alt="Flomo" className="h-8 sm:h-9" />
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="hidden gap-7 md:flex">
              {['Product', 'Features'].map((l, i) => (
                <a key={l} href={['#product', '#features'][i]} className="text-[13px] text-gray-400 transition hover:text-gray-700">{l}</a>
              ))}
              <Link to="/demo" className="text-[13px] text-gray-400 transition hover:text-gray-700">Live Demo</Link>
              <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">Case Study</Link>
            </div>
            <Link to="/login" className="hidden text-[13px] text-gray-400 transition hover:text-gray-700 sm:block">Sign In</Link>
            <Link to="/login" className="rounded-full bg-indigo-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-500 sm:px-5 sm:text-[13px]">
              Get Started
            </Link>
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
              <Link to="/demo" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Live Demo</Link>
              <Link to="/case-study" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Case Study</Link>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-[14px] text-gray-500 transition hover:text-gray-900">Sign In</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="relative flex min-h-screen items-center justify-center bg-gray-900 text-white">
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
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm animate-slide-up">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[13px] font-medium text-white">Built for Canadian homes &amp; buildings</span>
            </div>

            <h1 className="max-w-4xl text-[36px] leading-[1.08] font-bold tracking-tight animate-slide-up sm:text-5xl md:text-6xl lg:text-[76px]" style={{ animationDelay: '0.1s' }}>
              Your pipes don't warn you.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                We do.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white animate-slide-up sm:mt-6 sm:text-[20px]" style={{ animationDelay: '0.2s' }}>
              Continuous flow tracking and instant leak alerts for homes and buildings using non-invasive sensors.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 animate-slide-up sm:flex-row sm:gap-4" style={{ animationDelay: '0.3s' }}>
              <a
                href="#interested"
                className="w-full rounded-full bg-indigo-600 px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/30 sm:w-auto"
              >
                Start Monitoring
              </a>
              <Link
                to="/demo"
                className="w-full rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-center text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/20 sm:w-auto"
              >
                View Live Demo
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ PRODUCT ━━━ */}
      <section id="product" className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(68,87,194,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.04),transparent_50%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">The product</p>
            <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[46px]">
              A sensor that learns<br className="hidden sm:block" /> your plumbing
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:mt-4 sm:text-[16px]">
              The longer it runs, the smarter it gets. Flomo learns your building's water patterns over time — every fixture, every baseline. When something changes, it doesn't just detect it. It triangulates where the issue is coming from.
            </p>
          </div>

          <div className="mt-12 grid items-center gap-10 sm:mt-20 sm:gap-16 lg:grid-cols-[1fr_auto]">
            <div className="space-y-6 order-2 lg:order-1">
              {[
                {
                  title: 'Learns every fixture',
                  desc: 'The model trains itself to recognize each appliance — toilet, shower, dishwasher, garden hose. Even in older buildings with no documentation.',
                  icon: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>,
                  gradient: 'from-indigo-500 to-indigo-600',
                },
                {
                  title: 'Maps your piping system',
                  desc: 'Works with copper, PEX, CPVC, and galvanized — the mix found in most Canadian homes. Even decades-old buildings with no blueprints.',
                  icon: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>,
                  gradient: 'from-blue-500 to-cyan-500',
                },
                {
                  title: 'Detects leaks early',
                  desc: 'Sensitive enough to pick up flows as small as 1.7 mL/s. Frozen pipe bursts, slow drips, running toilets — all flagged before they become emergencies.',
                  icon: <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />,
                  gradient: 'from-cyan-500 to-teal-500',
                },
                {
                  title: 'No WiFi at the pipe',
                  desc: "Sends data via radio to a hub elsewhere in the building. Install the sensor in basements, crawlspaces, or mechanical rooms — no WiFi needed at the pipe.",
                  icon: <><path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a10.94 10.94 0 015.17-2.39" /><path d="M10.71 5.05A16 16 0 0122.56 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" /><path d="M8.53 16.11a6 6 0 016.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></>,
                  gradient: 'from-amber-500 to-orange-500',
                },
                {
                  title: 'Instant mobile alerts',
                  desc: "Something odd at 3am? You'll know before your tenants do. Push notifications with severity, location, and what to do next.",
                  icon: <><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
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
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-50 opacity-50 blur-2xl" />
              <img src={deviceImg} alt="Flomo dashboard" className="relative w-full max-w-md rounded-2xl shadow-xl lg:max-w-[480px]" />
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

      {/* ━━━ FEATURES (dark band) ━━━ */}
      <section id="features" className="relative bg-gray-950 pt-12 pb-20 text-white sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(68,87,194,0.08),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">Features</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-center text-[26px] leading-tight font-bold tracking-tight sm:mt-5 sm:text-[34px] md:text-[46px]">
            Everything happens<br className="hidden sm:block" /> on your phone
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-white/40 sm:mt-4 sm:text-[16px]">
            Real-time monitoring, intelligent alerts, and full visibility into your building's water behavior — all from one app.
          </p>

          <div className="mt-12 grid gap-3 sm:mt-20 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {[
              {
                title: 'Live flow & usage tracking',
                desc: 'Real-time L/h readings with interactive charts. Track volume per hour, day, or month across your entire building.',
                icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
                glow: 'bg-indigo-500/20',
              },
              {
                title: 'Appliance classification',
                desc: 'Distinguishes toilet flushes from showers, dishwashers, and garden hoses automatically over time.',
                icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
                glow: 'bg-blue-500/20',
              },
              {
                title: 'Smart alerts',
                desc: "Push notifications ranked by severity. Know what's happening, where, and what action to take.",
                icon: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>,
                glow: 'bg-cyan-500/20',
              },
              {
                title: 'Pipe system mapping',
                desc: 'Builds a digital map of your plumbing over time. See how water flows even without blueprints.',
                icon: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>,
                glow: 'bg-emerald-500/20',
              },
              {
                title: 'No WiFi at the pipe',
                desc: 'The sensor transmits via radio to a hub with connectivity. Install it anywhere — no WiFi needed where the pipe is.',
                icon: <><path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a10.94 10.94 0 015.17-2.39" /><path d="M10.71 5.05A16 16 0 0122.56 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" /><path d="M8.53 16.11a6 6 0 016.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></>,
                glow: 'bg-amber-500/20',
              },
              {
                title: 'Multi-building dashboard',
                desc: 'Manage an entire portfolio from one screen. Compare buildings, spot outliers, deploy at scale.',
                icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
                glow: 'bg-rose-500/20',
              },
            ].map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/10 hover:bg-white/[0.04]">
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

      {/* ━━━ APP EXPERIENCE ━━━ */}
      <section className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(239,68,68,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(68,87,194,0.04),transparent_50%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div className="relative mx-auto max-w-sm lg:mx-0 lg:max-w-none">
              <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-red-100/60 via-indigo-100/40 to-cyan-50/60 blur-2xl sm:-inset-8 sm:rounded-[32px]" />
              <div className="relative overflow-hidden rounded-[20px] border border-gray-200/60 shadow-2xl shadow-gray-900/10 sm:rounded-[24px]">
                <img src={leakImg} alt="Flomo app detecting a leak in real time" className="w-full" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-red-500 uppercase">Real-time detection</p>
              <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[42px]">
                From leak detected<br className="hidden sm:block" /> to alert in seconds
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-gray-500">
                The moment abnormal flow is detected, Flomo identifies the location, severity, and sends a push notification — so you can act immediately, not after the damage is done.
              </p>

              <div className="mt-10 space-y-5">
                {[
                  { label: 'Abnormal flow detected', detail: '3rd floor mechanical room', color: 'bg-red-500', ring: 'ring-red-500/20' },
                  { label: 'Alert sent to phone', detail: 'Within 30 seconds of detection', color: 'bg-amber-500', ring: 'ring-amber-500/20' },
                  { label: 'Action taken', detail: 'Valve shut off, damage prevented', color: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-start gap-4">
                    <div className="relative mt-0.5">
                      <div className={`h-3 w-3 rounded-full ${step.color} ring-4 ${step.ring}`} />
                      {i < 2 && <div className="absolute top-3 left-1/2 h-8 w-px -translate-x-1/2 bg-gray-200" />}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900">{step.label}</p>
                      <p className="text-[13px] text-gray-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ━━━ LIVE DEMO ━━━ */}
      <section id="how-it-works" className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid items-center gap-10 sm:gap-16 lg:grid-cols-[1fr_380px]">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-emerald-600 uppercase">Live demo</p>
              <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:mt-5 sm:text-[34px] md:text-[46px]">
                See real water data.<br className="hidden sm:block" /> Right now.
              </h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-gray-500 sm:mt-4 sm:text-[16px]">
                This is live data streaming from Flomo sensors installed at our Montreal office and warehouse. Explore the same dashboard our customers across Canada use to monitor their buildings 24/7.
              </p>

              <div className="mt-10 space-y-6">
                {[
                  { icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />, title: 'Real-time flow readings', desc: 'Watch L/h data update in real time with interactive charts you can zoom and pan.' },
                  { icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>, title: 'Appliance signatures', desc: 'See how the system classifies different fixtures by their unique flow patterns.' },
                  { icon: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>, title: 'Alert-ready monitoring', desc: 'Anomalies would trigger instant push notifications to the building manager.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">{item.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 text-center sm:text-left">
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-600/30"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  View Live Demo
                </Link>
              </div>
            </div>

            <div className="relative mx-auto flex flex-col items-center lg:mx-0 lg:items-start">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-100/80 to-indigo-100/60 opacity-60 blur-2xl sm:-inset-6" />
              <div className="relative flex flex-col items-center space-y-3 lg:items-start lg:space-y-5">
                <img src={diagramImg} alt="Ultrasonic flow sensing diagram" className="w-64 max-w-full sm:w-72 lg:max-w-[360px] lg:w-full" />
                <div className="rounded-xl border border-gray-200/80 bg-gray-50 p-4 sm:p-5">
                  <h4 className="text-[13px] font-semibold text-gray-900 sm:text-[14px]">How the sensor works</h4>
                  <p className="mt-2 text-[12px] leading-relaxed text-gray-500 sm:text-[13px]">
                    Two ultrasonic transducers are clamped onto the outside of the pipe. They send sound pulses to each other — one upstream, one downstream. The difference in travel time reveals how fast water is moving, without ever touching it.
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-gray-500 sm:text-[13px]">
                    Completely non-invasive. No cutting, no plumber, no downtime.
                  </p>
                </div>
              </div>
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

      {/* ━━━ PRESSURE PROTECTION ━━━ */}
      <section className="relative overflow-hidden bg-gray-950 pt-12 pb-20 text-white sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(68,87,194,0.1),transparent_60%)]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-500/10 blur-[120px] animate-glow-pulse" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">Who it's for</p>
            <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight sm:mt-5 sm:text-[34px] md:text-[46px]">
              From single homes<br className="hidden sm:block" /> to entire portfolios
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/40 sm:mt-4 sm:text-[16px]">
              Whether you manage one property or hundreds, Flomo gives you visibility into every pipe — without tearing open a single wall.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:mt-20 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Homeowners',
                detail: 'Protect your basement and catch frozen pipe bursts before the insurance claim.',
                icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
              },
              {
                label: 'Property managers',
                detail: 'Monitor every building remotely. Know about a leak before your tenants do.',
                icon: <><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></>,
              },
              {
                label: 'Condos & stratas',
                detail: 'Shared risers, shared risk. Track common lines and unit-level anomalies.',
                icon: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" /></>,
              },
              {
                label: 'Commercial & industrial',
                detail: 'Warehouses, offices, restaurants — the sensor talks to a hub via radio, so no IT overhead at the pipe.',
                icon: <><path d="M2 20h20" /><path d="M5 20V8l7-5 7 5v12" /><rect x="9" y="12" width="6" height="8" /></>,
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
      </section>

      {/* wave: dark → white */}
      <div className="relative -mt-px bg-gray-950">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
          <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="white" />
        </svg>
      </div>

      {/* ━━━ INTERESTED ━━━ */}
      <InterestSection />

      {/* ━━━ Footer ━━━ */}
      <footer className="border-t border-gray-100 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 md:flex-row">
          <Link to="/"><img src={logo} alt="Flomo" className="h-7" /></Link>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            {['Product', 'Features'].map((l, i) => (
              <a key={l} href={['#product', '#features'][i]} className="text-[12px] text-gray-400 transition hover:text-gray-600">{l}</a>
            ))}
            <Link to="/demo" className="text-[12px] text-gray-400 transition hover:text-gray-600">Live Demo</Link>
            <Link to="/case-study" className="text-[12px] text-gray-400 transition hover:text-gray-600">Case Study</Link>
            <Link to="/login" className="text-[12px] text-gray-400 transition hover:text-gray-600">Sign In</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            <Link to="/support" className="text-[12px] text-gray-400 transition hover:text-gray-600">Support</Link>
            <Link to="/privacy" className="text-[12px] text-gray-400 transition hover:text-gray-600">Privacy Policy</Link>
            <Link to="/terms" className="text-[12px] text-gray-400 transition hover:text-gray-600">Terms of Service</Link>
          </div>
          <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} Flomo — Made in Canada</p>
        </div>
      </footer>

      <ScrollToTopButton />
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
              Get Flomo for your building
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] text-white/40 sm:mt-4 sm:text-[15px]">
              Leave your email and our team will reach out to get you set up.
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
