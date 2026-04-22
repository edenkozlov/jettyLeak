/** Anchor hrefs for landing nav & footer — labels come from `landing.navAnchors.*` in locale JSON. */
export const LANDING_ANCHOR_LINKS = [
  { labelKey: 'navAnchors.product', href: '#product' },
  { labelKey: 'navAnchors.features', href: '#features' },
  { labelKey: 'navAnchors.health', href: '#building-health' },
  { labelKey: 'navAnchors.howItWorks', href: '/how-it-works' },
] as const
