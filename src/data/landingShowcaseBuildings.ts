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
    id: 'demo-mixed-1',
    label: 'Mixed-use',
    addressLine1: '400 Market Street',
    cityLine: 'Portland, OR',
    imageSrc: 'https://picsum.photos/seed/beluga-demo-market/960/640',
  },
  {
    id: 'demo-waterfront-1',
    label: 'Waterfront',
    addressLine1: '88 Riverfront Drive',
    cityLine: 'Denver, CO',
    imageSrc: 'https://picsum.photos/seed/beluga-demo-river/960/640',
  },
  {
    id: 'demo-office-1',
    label: 'Office',
    addressLine1: '2200 Commerce Place',
    cityLine: 'Austin, TX',
    imageSrc: 'https://picsum.photos/seed/beluga-demo-office/960/640',
  },
]
