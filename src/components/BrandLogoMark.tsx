import logo from '@/assets/belugaLogo2048x1024Transparent.png'

const DEFAULT_CLASS =
  'h-8 w-auto max-w-[min(100%,12rem)] shrink-0 object-contain object-left sm:h-9 sm:max-w-[13.5rem]'

/** 2048×1024 transparent mark — pair with a “Beluga” label beside it. */
export function BrandLogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt=""
      width={2048}
      height={1024}
      className={className ?? DEFAULT_CLASS}
    />
  )
}
