import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LANDING_SHOWCASE_BUILDINGS } from '@/data/landingShowcaseBuildings'

export default function ClientsDirectoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
            <span className="text-lg font-bold text-gray-900">Beluga</span>
          </Link>
          <Link to="/" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-800">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Buildings on Beluga</h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-600">
          A growing list of properties where we monitor water health from the main line.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_SHOWCASE_BUILDINGS.map((b) => (
            <li key={b.id}>
              <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  <img
                    src={b.imageSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{b.label}</p>
                  <p className="mt-1 text-[15px] font-semibold text-gray-900">{b.addressLine1}</p>
                  {b.cityLine ? (
                    <p className="mt-0.5 text-[13px] text-gray-500">{b.cityLine}</p>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
