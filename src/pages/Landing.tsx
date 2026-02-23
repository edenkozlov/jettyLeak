import { Link } from 'react-router'

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Why Flomo', href: '#why-flomo' },
]

function DropletIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    </svg>
  )
}

function ShieldIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function BoltIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function WaveIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M2 7c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    </svg>
  )
}

function BellIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function ChartIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function BuildingIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6" />
      <line x1="12" y1="6" x2="12" y2="6" />
      <line x1="16" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
    </svg>
  )
}

function TagIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

const PROBLEM_CARDS = [
  {
    icon: WaveIcon,
    title: 'City water fails',
    description: 'A main breaks or the city shuts off water without notice. Pressure drops suddenly and air enters the system.',
  },
  {
    icon: BoltIcon,
    title: 'Pressure surges back',
    description: 'When service is restored, water slams back through pipes at full force. Weak joints, aging fittings, and appliances take the hit.',
  },
  {
    icon: ShieldIcon,
    title: 'Damage happens unseen',
    description: 'Most residents only find out after pipes burst, appliances fail, or flooding has already started, often while they are away or asleep.',
  },
]

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    icon: WaveIcon,
    title: 'Monitor',
    description: 'Ultrasonic sensing tracks flow patterns and pressure behavior in your pipes continuously.',
  },
  {
    step: '02',
    icon: ChartIcon,
    title: 'Detect',
    description: 'Pattern recognition identifies abnormal events: sudden pressure loss, unexpected flow, air in the system.',
  },
  {
    step: '03',
    icon: BellIcon,
    title: 'Alert',
    description: 'Instant notifications with address, device, timestamp, and severity so you can act immediately.',
  },
]

const DETECTION_EVENTS = [
  {
    title: 'Sudden pressure loss',
    description: 'Detects rapid drops indicating a city-side shutoff or main break.',
    severity: 'Critical',
    severityColor: 'bg-red-100 text-red-700',
  },
  {
    title: 'Unexpected flow',
    description: 'Picks up water movement when no fixtures should be running.',
    severity: 'Warning',
    severityColor: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Abnormal spikes on restore',
    description: 'Flags dangerous pressure surges when water service resumes.',
    severity: 'Critical',
    severityColor: 'bg-red-100 text-red-700',
  },
  {
    title: 'Air in system',
    description: 'Identifies air pockets from pressure loss that signal bigger issues ahead.',
    severity: 'Warning',
    severityColor: 'bg-amber-100 text-amber-700',
  },
]

const FEATURES = [
  {
    icon: ChartIcon,
    title: 'Real-time charts',
    description: 'Live flow and pressure data visualized with interactive timelines, zoom, and pan.',
  },
  {
    icon: TagIcon,
    title: 'Signal classification',
    description: 'Automatically categorize flow events by type, from toilet flushes to washing machines.',
  },
  {
    icon: BellIcon,
    title: 'Alert system',
    description: 'Configurable alerts by address, device, and severity. Never miss a critical event.',
  },
  {
    icon: BuildingIcon,
    title: 'Multi-building support',
    description: 'Monitor an entire portfolio of buildings from a single dashboard.',
  },
]

const AWARENESS_STATS = [
  { value: 'Minutes', label: 'Detection to alert' },
  { value: '24/7', label: 'Continuous monitoring' },
  { value: '100%', label: 'Event coverage' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-indigo-600">
            <DropletIcon className="h-6 w-6 text-indigo-500" />
            Flomo
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/60 to-white" />
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 inline-block rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Infrastructure Safety
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              The seatbelt for
              <span className="text-indigo-600"> your pipes</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
              Smart water monitoring that detects city-side water events before they cause damage inside your building. Know immediately. Act early. Prevent disaster.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/login"
                className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300"
              >
                Get Started Free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border border-gray-200 px-8 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                See How It Works
              </a>
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-16">
            <p className="text-sm text-gray-400">Hero image / product illustration placeholder</p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">The Real Problem</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              City water failures cause damage inside your building
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              When the city shuts off water or a main breaks, the chain reaction that follows is what destroys pipes, appliances, and property.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {PROBLEM_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <card.icon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Three steps to protection
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From ultrasonic sensing to instant alerts, Flomo creates a time advantage that lets you act before damage occurs.
            </p>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">
                  Step {step.step}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Gets Detected */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">Detection</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What gets detected
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Pattern recognition, not a single threshold. The system identifies events that signal real problems.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {DETECTION_EVENTS.map((event) => (
              <div
                key={event.title}
                className="flex items-start gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="shrink-0">
                  <ChartIcon className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${event.severityColor}`}>
                      {event.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Early Awareness */}
      <section id="why-flomo" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">Why Early Awareness</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                The time advantage that prevents damage
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">
                Even though pressure loss will happen anyway, knowing before you are asleep, away, or unaware is the difference between a minor inconvenience and a disaster.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Water restored at full pressure is what causes the worst damage. Turning water back on slowly can prevent burst supply lines, appliance failure, and flooding while no one is home. Flomo gives people the chance to intervene intelligently, not react to a disaster.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6">
                {AWARENESS_STATS.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-indigo-600">{stat.value}</p>
                    <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-16">
              <p className="text-center text-sm text-gray-400">
                Illustration / diagram placeholder showing alert timeline
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">App Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to monitor and respond
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A visual dashboard with charts, timelines, and real-time insight into your water infrastructure.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <feature.icon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10">
                  <p className="text-center text-xs text-gray-400">Screenshot placeholder</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Protect your building before the next event
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            Join the early adopters using Flomo to get ahead of city-side water failures. Set up takes minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-500"
            >
              Get Started Free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-gray-700 px-8 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2 text-lg font-bold text-indigo-600">
              <DropletIcon className="h-5 w-5 text-indigo-500" />
              Flomo
            </div>
            <div className="flex items-center gap-8">
              <a href="#problem" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
                Problem
              </a>
              <a href="#how-it-works" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
                How It Works
              </a>
              <a href="#features" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
                Features
              </a>
              <Link to="/login" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
                Sign In
              </Link>
            </div>
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Flomo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
