import { Link } from 'react-router'

import type { LandingShowcaseBuilding } from '@/data/landingShowcaseBuildings'

type LandingClientShowcaseSectionProps = {
  buildings: LandingShowcaseBuilding[]
  showViewAll: boolean
}

export function LandingClientShowcaseSection({
  buildings,
  showViewAll,
}: LandingClientShowcaseSectionProps) {
  return (
    <section
      id="clients"
      className="relative border-t border-gray-100 bg-gradient-to-b from-gray-50/90 to-white pt-12 pb-16 sm:pt-16 sm:pb-24"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-500 uppercase">On site</p>
          <h2 className="mt-4 text-[26px] leading-tight font-bold tracking-tight text-gray-900 sm:text-[34px] md:text-[40px]">
            Buildings running Beluga
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Real installs—see where we monitor water health today.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => (
            <article
              key={b.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.02] transition hover:shadow-md"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <img
                  src={b.imageSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{b.label}</p>
                <p className="mt-1 text-[16px] font-semibold text-gray-900">{b.addressLine1}</p>
                {b.cityLine ? <p className="mt-1 text-[13px] text-gray-500">{b.cityLine}</p> : null}
              </div>
            </article>
          ))}
        </div>

        {showViewAll ? (
          <div className="mt-10 text-center">
            <Link
              to="/clients"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-2.5 text-[13px] font-semibold text-gray-800 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
            >
              View all buildings
              <svg
                className="h-4 w-4"
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
        ) : null}
      </div>
    </section>
  )
}
