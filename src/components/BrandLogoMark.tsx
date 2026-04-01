import logo from '@/assets/beluga2048x1024WhiteBGTransparent.png'

/** Nav / headers — compact beside default h-14–16 bars. */
export const BRAND_LOGO_NAV_CLASS =
  'h-7 w-auto max-w-[min(100%,13rem)] shrink-0 object-contain object-left sm:h-8 sm:max-w-[min(100%,16rem)]'

/** Footers — modest bump over nav. */
export const BRAND_LOGO_FOOTER_CLASS =
  'h-8 w-auto max-w-[min(100%,17rem)] shrink-0 object-contain object-left sm:h-9 sm:max-w-[min(100%,20rem)]'

export function BrandLogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Beluga"
      width={1203}
      height={234}
      className={className ?? BRAND_LOGO_NAV_CLASS}
    />
  )
}

/**
 * Dashboard chrome only. Renders the lockup as a light mark on transparent background
 * in dark theme (CSS filter). `alwaysDark` = always invert (sidebar that stays dark in “light” theme).
 */
export function DashboardBrandLogoMark({
  variant = 'theme',
}: {
  variant?: 'theme' | 'alwaysDark'
}) {
  const filter =
    variant === 'alwaysDark'
      ? '[&_img]:brightness-0 [&_img]:invert [&_img]:opacity-95'
      : 'dark:[&_img]:brightness-0 dark:[&_img]:invert dark:[&_img]:opacity-95'
  return (
    <span className={`inline-flex items-center ${filter}`}>
      <BrandLogoMark />
    </span>
  )
}
