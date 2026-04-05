import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import CertificateDocument from '@/components/certification/CertificateDocument'
import { useBuildingDetail } from '@/hooks/useBuildingDetail'
import type { CertificateData } from '@/utils/certification'
import {
  BHI_CERTIFICATION_THRESHOLD,
  buildCertificateData,
  getCertificationStatusLabel,
  isCertificationEligible,
} from '@/utils/certification'

// ---------------------------------------------------------------------------
// Shimmer placeholder
// ---------------------------------------------------------------------------

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/[0.06]'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BuildingCertification() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { building, loading, error } = useBuildingDetail(id)

  const navState = location.state as { bhi?: number; bhiLabel?: string } | null
  const bhi = building?.bhi ?? navState?.bhi ?? null
  const bhiLabel = building?.bhi_label ?? navState?.bhiLabel ?? null

  const eligible = isCertificationEligible(bhi)

  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(() => {
    if (!building || bhi == null || !bhiLabel) return
    const data = buildCertificateData(building, bhi, bhiLabel)
    setCertificate(data)
    setShowPreview(true)
  }, [building, bhi, bhiLabel])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const statusColor = useMemo(() => {
    if (!certificate) return ''
    switch (certificate.certificationStatus) {
      case 'platinum': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'gold': return 'bg-amber-50 text-amber-800 border-amber-200'
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }
  }, [certificate])

  // ── Error / not found states ──
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    )
  }
  if (!loading && !building) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
        Building not found
      </div>
    )
  }

  // ── Certificate preview modal ──
  if (showPreview && certificate) {
    return (
      <div className="-m-3 sm:-m-6">
        {/* Screen UI (hidden when printing) */}
        <div className="print:hidden">
          {/* Sticky toolbar — flush against dashboard header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 dark:border-gray-700 dark:bg-gray-800/95">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Back"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-sm font-bold text-gray-900 dark:text-white">
                  Beluga Building Certificate
                </h1>
                <p className="text-xs text-gray-400">{certificate.certificateId}</p>
              </div>
              <span className={`ml-2 rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                {getCertificationStatusLabel(certificate.certificationStatus)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          {/* Print instructions callout */}
          <div className="mx-auto mt-4 mb-4 max-w-[8.5in] px-3 sm:px-6">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs text-indigo-600 dark:border-indigo-800/30 dark:bg-indigo-900/10 dark:text-indigo-400">
              <strong>Tip:</strong> To save as PDF, click "Download PDF" and choose "Save as PDF"
              in the print dialog. For best results, set margins to "None" and enable "Background graphics."
            </div>
          </div>
        </div>

        {/* Certificate (visible in both screen and print) */}
        <div ref={printRef} className="mx-auto max-w-[8.5in] px-3 sm:px-6 print:max-w-none print:px-0">
          <div className="rounded-xl shadow-2xl shadow-gray-200/50 print:rounded-none print:shadow-none">
            <CertificateDocument data={certificate} />
          </div>
        </div>

        {/* Door plaque preview (screen only) */}
        <div className="print:hidden mx-auto mt-12 mb-6 max-w-[8.5in] px-3 sm:px-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Building Entrance Display Preview
          </h3>
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-12 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
            <DoorPlaque data={certificate} />
          </div>
        </div>
      </div>
    )
  }

  // ── Main landing: eligibility + generate ──
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(`/dashboard/buildings/${id}`)}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Back to Building"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Beluga Building Certification
          </h1>
          {building && (
            <p className="text-sm text-gray-400">
              {building.name ?? 'Unnamed Building'}
              {building.full_address ? ` · ${building.full_address}` : ''}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-32 rounded-xl bg-gray-200/70 dark:bg-gray-700/50 ${shimmer}`} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          {/* BHI summary card */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold ${
                  eligible
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}
              >
                {bhi ?? '—'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Building Health Index
                </p>
                <p className={`text-lg font-bold ${eligible ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {bhiLabel
                    ? bhiLabel.charAt(0).toUpperCase() + bhiLabel.slice(1)
                    : 'Not available'}
                </p>
              </div>
              {eligible && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Eligible
                </div>
              )}
            </div>
          </div>

          {eligible ? (
            <>
              {/* Eligible — show info + generate button */}
              <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 dark:border-emerald-800/30 dark:bg-emerald-900/10">
                <div className="flex gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      This building qualifies for Beluga Certification
                    </p>
                    <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/70">
                      With a BHI of {bhi}, this building has exceeded the certification threshold
                      of {BHI_CERTIFICATION_THRESHOLD}. Generate a formal certificate to display at
                      the building entrance and demonstrate verified plumbing and water system health.
                    </p>
                  </div>
                </div>
              </div>

              {/* What's included */}
              <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Your certificate will include
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Official certification document', 'Suitable for lobby display or framing'],
                    ['Building entrance plaque', 'Compact format for door or entrance display'],
                    ['QR verification code', 'Allows anyone to verify certification status'],
                    ['Print & PDF export', 'Professional output for physical display'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-2.5">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Generate Certificate
              </button>
            </>
          ) : (
            /* Not eligible */
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                Not Currently Eligible
              </h3>
              <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400">
                This building is not currently eligible for Beluga Certification.
                A Building Health Index above {BHI_CERTIFICATION_THRESHOLD} is required.
                {bhi != null && (
                  <> The current BHI is <strong>{bhi}</strong>.</>
                )}
              </p>
              <button
                disabled
                className="mt-6 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 text-sm font-medium text-gray-400 dark:bg-gray-700 dark:text-gray-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Generate Certificate
              </button>
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                Improve building health by addressing plumbing issues, reducing leak indicators,
                and ensuring sensor coverage to raise the BHI.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Door plaque — compact "entrance display" version
// ---------------------------------------------------------------------------

function DoorPlaque({ data }: { data: CertificateData }) {
  const tierBg =
    data.certificationStatus === 'platinum'
      ? 'from-slate-800 to-slate-900'
      : data.certificationStatus === 'gold'
        ? 'from-amber-900 to-amber-950'
        : 'from-indigo-900 to-indigo-950'

  return (
    <div
      className={`w-80 rounded-2xl bg-gradient-to-b ${tierBg} p-6 text-center shadow-xl`}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Top accent line */}
      <div className="mx-auto mb-5 h-px w-16 bg-white/30" />

      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
        Certified by
      </p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-white">Beluga</h3>

      <div className="mx-auto my-4 h-px w-24 bg-white/15" />

      <p className="text-xs font-medium text-white/70">{data.buildingName}</p>
      {data.buildingAddress && (
        <p className="mt-0.5 text-[10px] text-white/40">{data.buildingAddress}</p>
      )}

      <div className="mx-auto my-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10">
        <span className="text-lg font-bold text-white">{data.bhiScore}</span>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
        {getCertificationStatusLabel(data.certificationStatus)}
      </p>

      <div className="mx-auto mt-4 h-px w-16 bg-white/15" />

      <p className="mt-3 text-[9px] text-white/30">
        {data.certificateId} · Valid until {data.reviewDateFormatted}
      </p>
    </div>
  )
}
