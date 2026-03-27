/**
 * Buildings shown on the marketing landing page. Edit this list as you onboard sites.
 * The section only renders when there are at least SHOWCASE_MIN_VISIBLE entries.
 */

export const SHOWCASE_MIN_VISIBLE = 3

/** Show “View all” on the landing grid when there are more than this many (rest on /clients). */
export const SHOWCASE_VIEW_ALL_AFTER = 6

export interface LandingShowcaseBuilding {
  id: string
  /** Short label above the address (e.g. building type or name). */
  label: string
  /** Street line — what visitors should recognize. */
  addressLine1: string
  cityLine?: string
  /** Stable image URL (e.g. your own photo or a seeded placeholder). */
  imageSrc: string
}

export const LANDING_SHOWCASE_BUILDINGS: LandingShowcaseBuilding[] = [
  {
    id: 'pare-1',
    label: 'Mixed-use',
    addressLine1: '5579 Pare',
    cityLine: 'Montreal, QC',
    imageSrc: 'https://picsum.photos/seed/beluga5579pare/960/640',
  },
  {
    id: 'commune-1',
    label: 'Waterfront',
    addressLine1: '221 de la Commune',
    cityLine: 'Montreal, QC',
    imageSrc: 'https://picsum.photos/seed/beluga221commune/960/640',
  },
  // Demo duplicate of a real site so the grid shows 3 cards — remove when you have a third building.
  {
    id: 'pare-2',
    label: 'Office',
    addressLine1: '5579 Pare',
    cityLine: 'Montreal, QC',
    imageSrc: 'https://picsum.photos/seed/beluga5579pare-b/960/640',
  },
]
