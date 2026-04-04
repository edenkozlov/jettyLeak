import { Link } from 'react-router'

import heroVideo from '@/assets/water.mp4'

export function LandingHero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center bg-white">
      <video
        ref={(el) => {
          if (el && !el.dataset.started) {
            el.dataset.started = 'true'
            el.addEventListener(
              'loadedmetadata',
              () => {
                el.currentTime = el.duration * 0.1
              },
              { once: true },
            )
          }
        }}
        autoPlay
        loop
        muted
        playsInline
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
            <span className="text-[13px] font-medium text-gray-700">
              Water intelligence for buildings
            </span>
          </div>

          <h1
            className="max-w-4xl text-[36px] leading-[1.08] font-bold tracking-tight text-gray-900 animate-slide-up sm:text-5xl md:text-6xl lg:text-[72px]"
            style={{ animationDelay: '0.1s' }}
          >
            Full{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 bg-clip-text text-transparent">
              water system
            </span>{' '}
            visibility
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl animate-slide-up text-[18px] font-medium leading-snug text-gray-700 sm:mt-7 sm:text-[20px] md:text-[22px]"
            style={{ animationDelay: '0.2s' }}
          >
            One sensor. Every fixture.
          </p>

          <div className="mt-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/quote"
              className="inline-block rounded-full bg-indigo-500 px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              Get a quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
