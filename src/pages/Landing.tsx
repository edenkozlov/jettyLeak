import { Link } from 'react-router'

import heroVideo from '@/assets/water.mp4'
import deviceImg from '@/assets/IRLexample.png'
import diagramImg from '@/assets/pipeillustration.png'

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden antialiased">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6 lg:px-10">
          <Link to="/" className="text-[17px] font-bold tracking-tight text-gray-900">
            <span className="text-indigo-600">flo</span>mo
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden gap-7 md:flex">
              {['Product', 'Features', 'How It Works'].map((l, i) => (
                <a key={l} href={['#product', '#features', '#how-it-works'][i]} className="text-[13px] text-gray-400 transition hover:text-gray-700">{l}</a>
              ))}
            </div>
            <Link to="/login" className="hidden text-[13px] text-gray-400 transition hover:text-gray-700 sm:block">Sign In</Link>
            <Link to="/login" className="rounded-full bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-500">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section className="relative flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-30">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#030308_70%)]" />

        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-cyan-500/15 blur-[100px] animate-glow-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-28 pb-20">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm animate-slide-up">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[13px] font-medium text-white/60">Smart leak prevention for every building</span>
            </div>

            <h1 className="max-w-4xl text-5xl leading-[1.06] font-bold tracking-tight animate-slide-up sm:text-6xl lg:text-[76px]" style={{ animationDelay: '0.1s' }}>
              Your pipes are talking.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Start listening.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/40 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Ultrasonic sensors that learn your plumbing, detect leaks before they cause damage, and alert you instantly on your phone.
            </p>

            <div className="mt-10 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link
                to="/login"
                className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/30"
              >
                Start Monitoring
              </Link>
              <a
                href="#product"
                className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white/60 backdrop-blur-sm transition hover:border-white/20 hover:text-white/90"
              >
                See How It Works
              </a>
            </div>
          </div>

          <div className="mx-auto mt-20 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md animate-slide-up" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, val: 'Preventative', label: 'Leak detection' },
              { icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>, val: 'Instant', label: 'Mobile alerts' },
              { icon: <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />, val: 'Non-invasive', label: 'Clamp-on install' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-6 py-5">
                <svg className="mb-2 h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
                <p className="text-lg font-bold tracking-tight">{s.val}</p>
                <p className="mt-0.5 text-[11px] tracking-wide text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ PRODUCT ━━━ */}
      <section id="product" className="relative bg-white py-32 lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.04),transparent_50%)]" />

        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">The product</p>
            <h2 className="mt-5 text-[34px] leading-tight font-bold tracking-tight text-gray-900 sm:text-[46px]">
              A sensor that learns<br className="hidden sm:block" /> your plumbing
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-gray-500">
              Clamp it onto any pipe. Over time it maps your entire water system, identifies every fixture, and knows when something isn't right.
            </p>
          </div>

          <div className="mt-20 grid items-center gap-16 lg:grid-cols-[340px_1fr]">
            <div className="relative mx-auto lg:mx-0">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-cyan-50 opacity-60 blur-2xl" />
              <img src={deviceImg} alt="Flomo sensor on pipe" className="relative w-72 rounded-2xl shadow-xl animate-float lg:w-[340px]" />
            </div>

            <div className="space-y-6">
              {[
                {
                  title: 'Learns every fixture',
                  desc: 'The model trains itself to recognize each appliance — toilet, shower, dishwasher, garden hose. Even in older buildings with no documentation.',
                  icon: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>,
                  gradient: 'from-indigo-500 to-indigo-600',
                },
                {
                  title: 'Maps your piping system',
                  desc: 'Even in buildings decades old with no blueprints, the sensor builds a picture of how water flows through your property.',
                  icon: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>,
                  gradient: 'from-blue-500 to-cyan-500',
                },
                {
                  title: 'Detects leaks early',
                  desc: 'Catches unusual flow patterns before they become emergencies. Slow drips, running toilets, burst potential — all flagged immediately.',
                  icon: <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />,
                  gradient: 'from-cyan-500 to-teal-500',
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
          </div>
        </div>
      </section>

      {/* ━━━ FEATURES (dark band) ━━━ */}
      <section id="features" className="relative bg-gray-950 py-32 text-white lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">Features</p>
          <h2 className="mx-auto mt-5 max-w-3xl text-center text-[34px] leading-tight font-bold tracking-tight sm:text-[46px]">
            Everything happens<br className="hidden sm:block" /> on your phone
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[16px] text-white/40">
            Real-time monitoring, intelligent alerts, and full visibility into your building's water behavior — all from one app.
          </p>

          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Live flow monitoring',
                desc: 'Watch real-time L/h readings with interactive charts. Zoom, pan, and tag events as they happen.',
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
                title: 'Usage tracking',
                desc: 'Total volume per hour, day, or month. Know exactly how much water each part of your building uses.',
                icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>,
                glow: 'bg-violet-500/20',
              },
              {
                title: 'Multi-building dashboard',
                desc: 'Manage an entire portfolio from one screen. Compare buildings, spot outliers, deploy at scale.',
                icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
                glow: 'bg-rose-500/20',
              },
            ].map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/10 hover:bg-white/[0.04]">
                <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${f.glow} blur-2xl opacity-0 transition-opacity group-hover:opacity-100`} />
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

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section id="how-it-works" className="relative bg-white py-32 lg:py-40">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">How it works</p>
              <h2 className="mt-5 text-[34px] leading-tight font-bold tracking-tight text-gray-900 sm:text-[46px]">
                Three minutes to install.<br className="hidden sm:block" /> Zero pipes cut.
              </h2>
              <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-gray-500">
                Ultrasonic sensors clamp directly onto existing pipes. The device starts learning your system immediately.
              </p>

              <div className="mt-14 space-y-8">
                {[
                  { n: '01', title: 'Clamp the sensor', desc: 'Attaches to any pipe in seconds. No plumber, no permits, no water shutoff required.' },
                  { n: '02', title: 'System learns your building', desc: 'Within days, it maps your piping and identifies each fixture by its unique flow signature.' },
                  { n: '03', title: 'Get alerts, prevent damage', desc: 'Anomalies trigger instant push notifications. You act before tenants even notice something is off.' },
                ].map((s) => (
                  <div key={s.n} className="flex gap-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-mono text-xs font-bold text-white shadow-lg shadow-indigo-600/20">
                      {s.n}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">{s.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto lg:mx-0">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 opacity-80 blur-xl" />
              <img src={diagramImg} alt="Ultrasonic sensing" className="relative w-56 animate-float-delayed lg:w-[280px]" />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ PRESSURE PROTECTION ━━━ */}
      <section className="relative overflow-hidden bg-gray-950 py-32 text-white lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-500/10 blur-[120px] animate-glow-pulse" />

        <div className="relative mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-indigo-400 uppercase">Pressure protection</p>
              <h2 className="mt-5 text-[34px] leading-tight font-bold tracking-tight sm:text-[46px]">
                Know before your tenants do
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-white/40">
                During city shutoffs, water returns at full force and destroys weak joints. Flomo detects the pressure change and alerts you before damage starts.
              </p>

              <div className="mt-10 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">30s</p>
                  <p className="mt-1 text-[11px] text-white/30">Avg. alert time</p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">$8k+</p>
                  <p className="mt-1 text-[11px] text-white/30">Avg. damage prevented</p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">24/7</p>
                  <p className="mt-1 text-[11px] text-white/30">Always watching</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  title: 'Pressure drop',
                  desc: 'Instant alert when city-side pressure drops — you know before anyone calls.',
                  icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
                  dot: 'bg-red-400',
                },
                {
                  title: 'Surge on restore',
                  desc: 'Heads-up to slowly restore flow instead of letting pressure slam through.',
                  icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
                  dot: 'bg-amber-400',
                },
                {
                  title: 'Air in system',
                  desc: 'Detects air pockets that cause hammering and joint failures.',
                  icon: <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />,
                  dot: 'bg-orange-400',
                },
                {
                  title: 'Unexpected flow',
                  desc: "Water running when nothing should be on? You'll know immediately.",
                  icon: <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />,
                  dot: 'bg-indigo-400',
                },
              ].map((c) => (
                <div key={c.title} className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:border-white/10 hover:bg-white/[0.05]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <svg className="h-4.5 w-4.5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      <h3 className="text-[14px] font-semibold">{c.title}</h3>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/35">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="bg-white py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-gray-950 px-8 py-20 text-center sm:px-16">
            <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px] animate-glow-pulse" />
            <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px] animate-glow-pulse" style={{ animationDelay: '2s' }} />

            <div className="relative">
              <h2 className="text-[34px] leading-tight font-bold tracking-tight text-white sm:text-[46px]">
                Stop reacting to leaks.<br className="hidden sm:block" /> Start preventing them.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/40">
                Setup takes minutes. Your building starts getting smarter immediately.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="rounded-full bg-white px-10 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 hover:shadow-xl"
                >
                  Get Started Free
                </Link>
                <a
                  href="#product"
                  className="rounded-full border border-white/10 px-10 py-3.5 text-sm font-semibold text-white/50 transition hover:border-white/20 hover:text-white"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Footer ━━━ */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <span className="text-sm font-bold tracking-tight text-gray-900"><span className="text-indigo-600">flo</span>mo</span>
          <div className="flex gap-8">
            {['Product', 'Features', 'How It Works'].map((l, i) => (
              <a key={l} href={['#product', '#features', '#how-it-works'][i]} className="text-[12px] text-gray-400 transition hover:text-gray-600">{l}</a>
            ))}
            <Link to="/login" className="text-[12px] text-gray-400 transition hover:text-gray-600">Sign In</Link>
          </div>
          <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} Flomo</p>
        </div>
      </footer>
    </div>
  )
}
