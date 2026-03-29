import deviceImg from '@/assets/iphone1.png'

const PRODUCT_FEATURES = [
  {
    title: 'Understands every fixture',
    desc: 'Identifies how toilets, sinks, showers, and appliances behave — even in older buildings with no documentation.',
    icon: (
      <>
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </>
    ),
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
    icon: (
      <>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </>
    ),
    gradient: 'from-cyan-500 to-teal-500',
  },
  {
    title: 'Builds a live model of your system',
    desc: 'Beluga continuously maps how water flows through your building, creating a dynamic understanding of your plumbing.',
    icon: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    title: 'Immediate visibility',
    desc: 'Right after installation, Beluga surfaces key insights on usage, inefficiencies, and opportunities to improve performance.',
    icon: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    gradient: 'from-violet-500 to-indigo-500',
  },
] as const

export function LandingProductSection() {
  return (
    <section
      id="product"
      className="relative bg-white pt-12 pb-20 sm:pt-16 sm:pb-32 lg:pt-24 lg:pb-40"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.04),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:text-[34px] md:text-[46px]">
            A system that understands
            <br className="hidden sm:block" /> your plumbing
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:mt-4 sm:text-[16px]">
            See what's happening immediately, and how it changes over time.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 sm:mt-20 sm:gap-16 lg:grid-cols-[1fr_auto]">
          <div className="order-2 space-y-6 lg:order-1">
            {PRODUCT_FEATURES.map((f) => (
              <div key={f.title} className="group flex gap-5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg shadow-indigo-500/10 transition-transform group-hover:scale-105`}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {f.icon}
                  </svg>
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
            <img
              src={deviceImg}
              alt="Beluga mobile app"
              className="relative mx-auto w-52 rounded-[2rem] shadow-xl sm:w-60 lg:w-64"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
