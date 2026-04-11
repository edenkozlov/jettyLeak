export function ArticleHero({
  eyebrow,
  h1,
  subtitle,
}: {
  eyebrow: string
  h1: string
  subtitle: string
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-12 sm:pt-36 sm:pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">{eyebrow}</p>
        <h1 className="mt-5 text-[26px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[42px]">
          {h1}
        </h1>
        <p className="mt-3 text-[15px] text-gray-500 sm:text-[16px]">{subtitle}</p>
      </div>
    </header>
  )
}
