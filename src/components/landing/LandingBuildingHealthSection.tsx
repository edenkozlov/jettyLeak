import { LandingBhiTrendChart } from './LandingBhiTrendChart'
import { LandingHealthGauge } from './LandingHealthGauge'

/** Fictional placeholder — not a real customer site */
const EXAMPLE_BUILDING = {
  name: 'Lakeview Tower',
  cityLine: 'Chicago, IL',
} as const

const PILLAR_ROWS = [
  { k: 'Stability', v: 82 },
  { k: 'Hydraulic stress', v: 76 },
  { k: 'Appliance health', v: 74 },
  { k: 'Mechanical', v: 88 },
] as const

type LandingBuildingHealthSectionProps = {
  pillarsModalOpen: boolean
  onOpenPillars: () => void
}

export function LandingBuildingHealthSection({
  pillarsModalOpen,
  onOpenPillars,
}: LandingBuildingHealthSectionProps) {
  return (
    <section
      id="building-health"
      className="relative border-t border-gray-100 bg-gradient-to-b from-slate-50/80 to-white pt-10 pb-14 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.06),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(6,182,212,0.05),transparent_45%)]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[10px] font-semibold tracking-[0.25em] text-indigo-500 uppercase">
            Building Health Index
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl md:text-[28px] md:leading-snug">
            Your building—and what good looks like
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-snug text-gray-600 sm:text-sm">
            See how your building compares to its own normal—and to how things should be running.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-lg lg:mx-0 lg:mt-10 lg:max-w-none lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-5">
          <div
            className="flex h-full min-h-0 flex-col rounded-xl border border-gray-200/80 bg-white p-4 shadow-md shadow-indigo-500/[0.05] ring-1 ring-black/[0.02] sm:p-5"
            aria-label={`Building Health Index example · ${EXAMPLE_BUILDING.name}`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-gray-900">{EXAMPLE_BUILDING.name}</p>
                <p className="mt-0.5 text-[12px] text-gray-500">{EXAMPLE_BUILDING.cityLine}</p>
              </div>
              <p className="shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-gray-400">Today</p>
            </div>

            <div className="py-1">
              <LandingHealthGauge />
            </div>

            <p className="text-center text-[11px] leading-snug text-gray-500">
              Example: flow pattern off your norm—flagged before damage.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2">
              {PILLAR_ROWS.map((row) => (
                <div
                  key={row.k}
                  className="rounded-lg border border-gray-100 bg-gray-50/90 px-2.5 py-2 sm:px-3"
                >
                  <p className="text-[9px] font-medium tracking-wide text-gray-500 uppercase">{row.k}</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900 sm:text-lg">{row.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto shrink-0" aria-hidden />
          </div>

          <div className="mt-6 flex min-h-0 flex-col gap-3 lg:mt-0 lg:h-full">
            <LandingBhiTrendChart
              fillHeight
              buildingName={EXAMPLE_BUILDING.name}
              buildingLocation={EXAMPLE_BUILDING.cityLine}
            />
            <button
              type="button"
              onClick={onOpenPillars}
              className="flex w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-indigo-200/80 bg-indigo-50/50 px-3 py-2.5 text-left text-[13px] font-semibold text-gray-900 transition hover:border-indigo-300 hover:bg-indigo-50"
              aria-haspopup="dialog"
              aria-expanded={pillarsModalOpen}
              aria-label="How the Building Health Index is calculated"
            >
              <span>How the score is built</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
