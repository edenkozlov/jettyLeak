type LandingPillarsModalProps = {
  open: boolean
  onClose: () => void
}

export function LandingPillarsModal({ open, onClose }: LandingPillarsModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
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
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-gray-600 sm:px-6 sm:py-5">
          <p className="text-[14px] text-gray-700">
            We learn how water usually behaves in <em>your</em> building, compare new behavior to that
            history, and to ideal benchmarks for how the whole system should behave. The index blends four
            kinds of signal—each one uses sensor data you already have on the main line.
          </p>
          <ul className="mt-5 space-y-4 text-[13px]">
            <li>
              <strong className="text-gray-900">System stability</strong>{' '}
              <span className="text-gray-400">(largest share)</span>
              — whether usage patterns, timing, and flow duration still match what we’ve learned is normal for
              you—new or drifting behavior gets flagged.
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
  )
}
