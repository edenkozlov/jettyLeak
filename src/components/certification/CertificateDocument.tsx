/**
 * Premium certificate layout optimised for both on-screen display and print / PDF.
 * All visual elements are self-contained (inline SVG, CSS) — no external images
 * except the Beluga brand logo.
 */

import { BrandLogoMark } from '@/components/BrandLogoMark'
import CertificateSeal from '@/components/certification/CertificateSeal'
import type { CertificateData } from '@/utils/certification'
import { getCertificationStatusLabel } from '@/utils/certification'

interface Props {
  data: CertificateData
}

// QR code via free public API — falls back gracefully if blocked
function qrUrl(text: string, size = 120) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=0`
}

export default function CertificateDocument({ data }: Props) {
  const statusLabel = getCertificationStatusLabel(data.certificationStatus)
  const tierMap = { certified: 'certified', gold: 'gold', platinum: 'platinum' } as const
  const tier = tierMap[data.certificationStatus]

  const accentText =
    tier === 'platinum'
      ? 'text-slate-700'
      : tier === 'gold'
        ? 'text-amber-800'
        : 'text-indigo-700'

  const accentBorder =
    tier === 'platinum'
      ? 'border-slate-300'
      : tier === 'gold'
        ? 'border-amber-300'
        : 'border-indigo-200'

  return (
    <div
      id="beluga-certificate"
      className="certificate-page relative mx-auto bg-white"
      style={{
        width: '8.5in',
        minHeight: '11in',
        padding: '0.6in 0.75in',
        fontFamily: "'Montserrat', sans-serif",
        color: '#1e293b',
      }}
    >
      {/* ── Decorative outer border ── */}
      <div
        className={`absolute inset-[0.35in] border-2 ${accentBorder} pointer-events-none`}
        style={{ borderRadius: 6 }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 'calc(0.35in + 5px)',
          border: '1px solid',
          borderColor: tier === 'gold' ? '#fbbf2480' : tier === 'platinum' ? '#94a3b840' : '#bae6fd60',
          borderRadius: 4,
        }}
      />

      {/* ── Header: logo + certificate number ── */}
      <div className="flex items-start justify-between mb-6">
        <BrandLogoMark className="h-8 w-auto max-w-[180px] object-contain" />
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
            Certificate No.
          </p>
          <p className="text-xs font-semibold text-gray-600 mt-0.5 tracking-wide">
            {data.certificateId}
          </p>
        </div>
      </div>

      {/* ── Divider line ── */}
      <div className={`border-t ${accentBorder} mb-8`} />

      {/* ── Main title area ── */}
      <div className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-semibold mb-3">
          Certificate of Building Health
        </p>
        <h1 className={`text-[28px] font-bold tracking-tight leading-tight ${accentText}`}>
          Beluga Certified Building
        </h1>
        <div className="flex items-center justify-center gap-2 mt-3">
          <span
            className={`inline-block rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest ${
              tier === 'platinum'
                ? 'bg-slate-100 text-slate-700'
                : tier === 'gold'
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ── Certification statement ── */}
      <div className="text-center max-w-[5.5in] mx-auto mb-8">
        <p className="text-[13px] leading-relaxed text-gray-600">
          This certifies that the building identified below has been independently assessed
          through Beluga's Building Health Index and has achieved certification status based on
          its measured plumbing and water system health performance.
        </p>
      </div>

      {/* ── Building info panel ── */}
      <div
        className="mx-auto max-w-[5.5in] rounded-lg border border-gray-100 bg-gray-50/60 px-8 py-6 mb-8"
        style={{ pageBreakInside: 'avoid' }}
      >
        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-gray-900 leading-snug">
            {data.buildingName}
          </h2>
          {data.buildingAddress && (
            <p className="text-sm text-gray-500 mt-1">{data.buildingAddress}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              BHI Score
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{data.bhiScore}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              Health Status
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5 capitalize">
              {data.bhiLabel}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              Issue Date
            </p>
            <p className="font-semibold text-gray-700 mt-0.5">
              {data.issueDateFormatted}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              Valid Until
            </p>
            <p className="font-semibold text-gray-700 mt-0.5">
              {data.reviewDateFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* ── Secondary statement ── */}
      <p className="text-center text-[11px] text-gray-400 max-w-[5in] mx-auto mb-10 leading-relaxed">
        This property has satisfied Beluga's certification threshold for building water
        and plumbing health performance. The Building Health Index evaluates data trust,
        leak detection, hydraulic stress, and mechanical vibration to produce a composite
        health score.
      </p>

      {/* ── Seal + signature row ── */}
      <div
        className="flex items-end justify-between mx-auto max-w-[5.5in] mt-auto"
        style={{ pageBreakInside: 'avoid' }}
      >
        {/* Signature */}
        <div className="flex-1">
          <div className="w-48 border-b border-gray-300 mb-1" />
          <p className="text-[11px] font-semibold text-gray-600">Beluga Certification Authority</p>
          <p className="text-[10px] text-gray-400">Building Health Index Program</p>
        </div>

        {/* Seal */}
        <div className="flex flex-col items-center">
          <CertificateSeal tier={tier} size={120} />
        </div>

        {/* QR verification */}
        <div className="flex-1 flex flex-col items-end">
          <img
            src={qrUrl(data.verificationUrl)}
            alt="Verification QR code"
            width={72}
            height={72}
            className="mb-1.5 rounded"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-[9px] text-gray-400 text-right leading-tight max-w-[120px]">
            Scan to verify this certification at beluga.io
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className={`border-t ${accentBorder} mt-10 pt-4 flex items-center justify-between`}>
        <p className="text-[9px] text-gray-300">
          {data.certificateId}
        </p>
        <p className="text-[9px] text-gray-300">
          beluga.io &middot; Water Monitoring Intelligence for Buildings
        </p>
      </div>
    </div>
  )
}
