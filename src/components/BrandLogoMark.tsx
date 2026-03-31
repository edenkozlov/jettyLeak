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
