import { Link } from 'react-router'

import logo from '@/assets/belugaTransparent.png'
import cs1 from '@/assets/CS1.jpg'
import cs2 from '@/assets/CS2.jpg'
import cs3 from '@/assets/CS3.jpg'
import cs4 from '@/assets/CS4.jpg'
import cs5 from '@/assets/CS5.jpg'
import ScrollToTopButton from '@/components/ScrollToTopButton'

export default function CaseStudy() {
  return (
    <div className="min-h-screen bg-white antialiased">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/">
            <img src={logo} alt="Beluga" className="h-10 sm:h-12" />
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">Home</Link>
            <Link to="/demo" className="text-[13px] text-gray-400 transition hover:text-gray-700">Live Demo</Link>
            <Link to="/login" className="rounded-full bg-indigo-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-500 sm:px-5 sm:text-[13px]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">Case Study</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            How a single pipe burst turned into a national problem worth solving
          </h1>
        </div>
      </header>

      {/* Content */}
      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="space-y-16 sm:space-y-24">

          {/* The spark — text only */}
          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">The spark</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                The idea behind our system did not start in a lab or a pitch deck. It started with a phone call.
              </p>
              <p>
                After hearing that our landlord had experienced a pipe burst in one of his buildings, we started asking a simple question: how often does this actually happen? What we found was alarming. In Canada, nearly <strong className="text-gray-900">48 percent of home insurance claims</strong> are caused by water damage — almost double the rate seen in the United States. Yet most buildings still rely on noticing damage after it has already occurred.
              </p>
              <p>
                We believed this was a problem worth solving.
              </p>
            </div>
          </section>

          {/* First prototype — image LEFT */}
          <section className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
            <figure>
              <img src={cs1} alt="Initial prototype installed and running" className="w-full rounded-2xl shadow-lg object-cover aspect-square" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-left">Initial prototype installed and running</figcaption>
            </figure>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">The first prototype</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>
                  We moved fast. Within days, we built a rough, clunky first prototype. It was far from pretty, but it worked. The goal was simple: measure flow, establish a baseline, and see if early anomalies could be detected before damage occurred.
                </p>
              </div>
            </div>
          </section>

          {/* Calibration — image RIGHT */}
          <section className="grid items-center gap-8 lg:grid-cols-[1fr_280px] lg:gap-14">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Calibration and the unexpected</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>
                  During the first two hours of testing, we focused on calibration and baseline measurements. Normal building usage - Toilets, sinks, background flow. Everything looked stable.
                </p>
                <p>
                  Then something completely unexpected happened.
                </p>
                <p className="text-lg font-semibold text-gray-900 sm:text-xl">
                  The system detected a sudden spike in flow: 700 liters per hour.
                </p>
                <p>
                  At first, we assumed it was an error.
                </p>
                <p>
                  It was not.
                </p>
              </div>
            </div>
            <figure className="order-first lg:order-last">
              <img src={cs2} alt="System alert showing a 700 L/h flow anomaly" className="w-full rounded-2xl shadow-lg object-cover aspect-square" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-right">System alert showing a 700 L/h flow anomaly</figcaption>
            </figure>
          </section>

          {/* Finding the source — image LEFT */}
          <section className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
            <figure>
              <img src={cs3} alt="Physical source of the leak identified on site" className="w-full rounded-2xl shadow-lg object-cover aspect-square" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-left">Physical source of the leak identified on site</figcaption>
            </figure>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Finding the source</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>
                  We searched the entire building, floor by floor, unit by unit. Eventually, we found the culprit. A hose connection had failed, likely due to pressure buildup, causing a massive and continuous leak.
                </p>
                <p>
                  Left undetected, this would have resulted in extensive water damage.
                </p>
              </div>
            </div>
          </section>

          {/* Real world validation — image RIGHT */}
          <section className="grid items-center gap-8 lg:grid-cols-[1fr_280px] lg:gap-14">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Real world validation</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>
                  Our landlord and two building managers came on site immediately. Seeing the live flow data in real time changed the conversation. At that rate of water loss, the concern was no longer hypothetical. It was urgent.
                </p>
                <p>
                  They suspected the hose cap had blown off due to pressure. The main valve was shut off, and a full investigation began.
                </p>
              </div>
            </div>
            <figure className="order-first lg:order-last">
              <img src={cs4} alt="Landlord and building managers inspecting the issue" className="w-full rounded-2xl shadow-lg object-cover aspect-square" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-right">Landlord and building managers inspecting the issue</figcaption>
            </figure>
          </section>

          {/* Mitigation — image LEFT */}
          <section className="grid items-center gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
            <figure>
              <img src={cs5} alt="Flow rate at zero confirming resolution" className="w-full rounded-2xl shadow-lg object-cover aspect-square" />
              <figcaption className="mt-3 text-center text-[12px] text-gray-400 lg:text-left">Flow rate at zero — issue fully resolved</figcaption>
            </figure>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Mitigation confirmed</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                <p>
                  Once the main valve was closed, the system told the story instantly. Flow dropped to zero.
                </p>
                <p>
                  The issue was fully mitigated.
                </p>
              </div>
            </div>
          </section>

          {/* Why this mattered — text only */}
          <section className="mx-auto max-w-2xl">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">Why this mattered</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              <p>
                This felt like more than coincidence.
              </p>
              <p>
                Within hours of installing a rough prototype, it had already prevented what could have been a costly and damaging incident. That moment made something very clear to us: this was not an edge case. This was a <strong className="text-gray-900">systemic problem across Canadian buildings</strong>.
              </p>
              <p>
                From a founder's perspective, this was the turning point. We were no longer experimenting with an idea. We were staring at a real, measurable problem that affects homeowners, landlords, insurers, and cities across Canada.
              </p>
              <p>
                And it was clear that <strong className="text-gray-900">early detection, not cleanup, is the solution</strong>.
              </p>
              <p>
                This case study became the foundation for everything we are building next.
              </p>
            </div>
          </section>

        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-gray-100 pt-16 text-center sm:mt-24 sm:flex-row sm:justify-center sm:gap-5 sm:pt-20">
          <Link
            to="/demo"
            className="w-full rounded-full bg-indigo-600 px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-xl sm:w-auto"
          >
            View Live Demo
          </Link>
          <Link
            to="/"
            className="w-full rounded-full border border-gray-200 px-8 py-3.5 text-center text-sm font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700 sm:w-auto"
          >
            Back to Home
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 md:flex-row">
          <Link to="/"><img src={logo} alt="Beluga" className="h-8" /></Link>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            <Link to="/" className="text-[12px] text-gray-400 transition hover:text-gray-600">Home</Link>
            <Link to="/demo" className="text-[12px] text-gray-400 transition hover:text-gray-600">Live Demo</Link>
            <Link to="/case-study" className="text-[12px] text-gray-400 transition hover:text-gray-600">Case Study</Link>
            <Link to="/login" className="text-[12px] text-gray-400 transition hover:text-gray-600">Sign In</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
            <Link to="/support" className="text-[12px] text-gray-400 transition hover:text-gray-600">Support</Link>
            <Link to="/privacy" className="text-[12px] text-gray-400 transition hover:text-gray-600">Privacy Policy</Link>
            <Link to="/terms" className="text-[12px] text-gray-400 transition hover:text-gray-600">Terms of Service</Link>
          </div>
          <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} Beluga — Made in Canada</p>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  )
}
