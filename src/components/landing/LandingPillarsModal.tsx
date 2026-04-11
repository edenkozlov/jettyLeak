import { useTranslation } from 'react-i18next'

type LandingPillarsModalProps = {
  open: boolean
  onClose: () => void
}

export function LandingPillarsModal({ open, onClose }: LandingPillarsModalProps) {
  const { t } = useTranslation('landing')

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
            {t('pillarsModal.title')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label={t('pillarsModal.close')}
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
            {t('pillarsModal.introLead')}
            <em>{t('pillarsModal.introEm')}</em>
            {t('pillarsModal.introTrail')}
          </p>
          <ul className="mt-5 space-y-4 text-[13px]">
            <li>
              <strong className="text-gray-900">{t('pillarsModal.p1.strong')}</strong>{' '}
              <span className="text-gray-400">{t('pillarsModal.p1.paren')}</span>
              {t('pillarsModal.p1.rest')}
            </li>
            <li>
              <strong className="text-gray-900">{t('pillarsModal.p2.strong')}</strong>
              {t('pillarsModal.p2.rest')}
            </li>
            <li>
              <strong className="text-gray-900">{t('pillarsModal.p3.strong')}</strong>
              {t('pillarsModal.p3.rest')}
            </li>
            <li>
              <strong className="text-gray-900">{t('pillarsModal.p4.strong')}</strong>
              {t('pillarsModal.p4.rest')}
            </li>
          </ul>
          <p className="mt-5 text-[12px] text-gray-500">{t('pillarsModal.footnote')}</p>
        </div>
      </div>
    </div>
  )
}
