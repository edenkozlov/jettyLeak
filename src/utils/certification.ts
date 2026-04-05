import type { Building } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CertificateData {
  certificateId: string
  buildingName: string
  buildingAddress: string
  bhiScore: number
  bhiLabel: string
  certificationStatus: 'certified' | 'gold' | 'platinum'
  issueDate: string
  issueDateFormatted: string
  reviewDate: string
  reviewDateFormatted: string
  verificationUrl: string
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export const BHI_CERTIFICATION_THRESHOLD = 50

export function isCertificationEligible(bhi: number | null | undefined): boolean {
  return bhi != null && bhi > BHI_CERTIFICATION_THRESHOLD
}

export function getCertificationStatus(
  bhi: number,
): CertificateData['certificationStatus'] {
  if (bhi >= 85) return 'platinum'
  if (bhi >= 70) return 'gold'
  return 'certified'
}

export function getCertificationStatusLabel(
  status: CertificateData['certificationStatus'],
): string {
  switch (status) {
    case 'platinum':
      return 'Platinum Certified'
    case 'gold':
      return 'Gold Certified'
    default:
      return 'Certified'
  }
}

// ---------------------------------------------------------------------------
// Certificate ID generation — deterministic from building ID + issue date
// ---------------------------------------------------------------------------

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4)
}

export function generateCertificateId(buildingId: number, issueDate: Date): string {
  const year = issueDate.getFullYear()
  const seq = String(buildingId).padStart(5, '0')
  const check = simpleHash(`${buildingId}-${year}-${issueDate.getMonth()}`)
  return `BLG-${year}-${seq}-${check}`
}

// ---------------------------------------------------------------------------
// Build certificate data from a Building
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function buildCertificateData(
  building: Building,
  bhi: number,
  bhiLabel: string,
): CertificateData {
  const now = new Date()
  const review = new Date(now)
  review.setFullYear(review.getFullYear() + 1)

  const certificateId = generateCertificateId(building.id, now)
  const status = getCertificationStatus(bhi)

  return {
    certificateId,
    buildingName: building.name ?? 'Unnamed Building',
    buildingAddress: building.full_address ?? '',
    bhiScore: bhi,
    bhiLabel,
    certificationStatus: status,
    issueDate: now.toISOString(),
    issueDateFormatted: formatDate(now),
    reviewDate: review.toISOString(),
    reviewDateFormatted: formatDate(review),
    verificationUrl: `https://beluga.io/verify/${certificateId}`,
  }
}
