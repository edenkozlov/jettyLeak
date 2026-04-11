import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LandingLanguageSwitch } from '@/components/landing/LandingLanguageSwitch'

/* ------------------------------------------------------------------ */
/*  Comparison page registry (labels: `landing.compare.*` in JSON)   */
/* ------------------------------------------------------------------ */

export const COMPARISON_ROUTE_ENTRIES = [
  { path: '/flo-by-moen-alternative', labelKey: 'compare.linkFloByMoen' as const },
  { path: '/phyn-alternative', labelKey: 'compare.linkPhyn' as const },
  { path: '/wint-alternative', labelKey: 'compare.linkWint' as const },
  { path: '/alert-labs-alternative', labelKey: 'compare.linkAlertLabs' as const },
  { path: '/flume-alternative', labelKey: 'compare.linkFlume' as const },
  { path: '/water-alert-alternative', labelKey: 'compare.linkWaterAlert' as const },
] as const

export const HUB_PATH = '/best-water-monitoring-systems'

/* ------------------------------------------------------------------ */
/*  SEO helpers                                                       */
/* ------------------------------------------------------------------ */

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(
    `meta[property="${property}"]`,
  ) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.content = content
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export function usePageSeo({
  title,
  description,
  canonicalPath,
}: {
  title: string
  description: string
  canonicalPath: string
}) {
  useEffect(() => {
    document.title = title
    setMeta('description', description)
    setMetaProperty('og:title', title)
    setMetaProperty('og:description', description)
    setMetaProperty('og:type', 'website')

    const origin = window.location.origin
    const url = `${origin}${canonicalPath}`
    setMetaProperty('og:url', url)
    setCanonical(url)
  }, [title, description, canonicalPath])
}

/* ------------------------------------------------------------------ */
/*  Structured data                                                   */
/* ------------------------------------------------------------------ */

export function FaqSchema({ items }: { items: { q: string; a: string }[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }),
      }}
    />
  )
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; path: string }[]
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: `${origin}${item.path}`,
          })),
        }),
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Layout components                                                 */
/* ------------------------------------------------------------------ */

const linkClass =
  'text-[14px] text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 transition hover:decoration-indigo-600 sm:text-[15px]'

export function CompareNav() {
  const { t } = useTranslation('comparePages')
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogoMark />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <LandingLanguageSwitch />
          <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
            {t('shell.navHome')}
          </Link>
          <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">
            {t('shell.navCaseStudy')}
          </Link>
          <Link
            to="/quote"
            className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
          >
            {t('shell.navGetQuote')}
          </Link>
        </div>
      </div>
    </nav>
  )
}

export function CompareHero({
  h1,
  subtitle,
}: {
  h1: string
  subtitle: string
}) {
  const { t } = useTranslation('comparePages')
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
      <div className="absolute top-12 left-1/4 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">
          {t('shell.heroEyebrow')}
        </p>
        <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
          {h1}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
          {subtitle}
        </p>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  Content blocks                                                    */
/* ------------------------------------------------------------------ */

export function CompareTable({
  belugaLabel,
  competitorLabel,
  rows,
}: {
  belugaLabel?: string
  competitorLabel: string
  rows: { feature: string; beluga: string; competitor: string }[]
}) {
  const { t } = useTranslation('comparePages')
  return (
    <section>
      <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
        {t('shell.tableSectionTitle')}
      </h2>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[14px] sm:text-[15px]">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-3 pr-4 font-semibold text-gray-500">{t('shell.tableColFeature')}</th>
              <th className="py-3 px-4 font-semibold text-indigo-600">{belugaLabel ?? t('shell.tableColBeluga')}</th>
              <th className="py-3 pl-4 font-semibold text-gray-700">{competitorLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.feature} className={i % 2 === 0 ? 'bg-gray-50/60' : ''}>
                <td className="py-3 pr-4 font-medium text-gray-900">{row.feature}</td>
                <td className="py-3 px-4 text-gray-600">{row.beluga}</td>
                <td className="py-3 pl-4 text-gray-600">{row.competitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function CompareFaq({ items }: { items: { q: string; a: string }[] }) {
  const { t } = useTranslation('comparePages')
  return (
    <section>
      <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
        {t('shell.faqSectionTitle')}
      </h2>
      <dl className="mx-auto mt-10 max-w-2xl divide-y divide-gray-200">
        {items.map((item) => (
          <div key={item.q} className="py-6 first:pt-0 last:pb-0">
            <dt className="text-[15px] font-semibold text-gray-900 sm:text-[16px]">{item.q}</dt>
            <dd className="mt-2 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function CompareDisclaimer({ competitorName }: { competitorName: string }) {
  const { t } = useTranslation('comparePages')
  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
      <h3 className="text-[13px] font-semibold tracking-wide text-gray-500 uppercase">{t('shell.disclaimerTitle')}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
        {t('shell.disclaimerBody', { competitorName })}
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  CTA                                                               */
/* ------------------------------------------------------------------ */

export function CompareCta({
  competitorName,
  competitorUrl,
}: {
  competitorName: string
  competitorUrl: string
}) {
  const { t } = useTranslation('comparePages')
  return (
    <section className="mt-16 border-t border-gray-100 pt-14 sm:mt-24 sm:pt-18">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[28px]">
          {t('shell.ctaTitle')}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-500 sm:text-[16px]">
          {t('shell.ctaSubtitle')}
        </p>
        <Link
          to="/quote"
          className="mt-7 inline-flex items-center justify-center rounded-full bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600 hover:shadow-xl"
        >
          {t('shell.ctaButton')}
        </Link>
        <p className="mt-6 text-[13px] text-gray-400">
          {t('shell.ctaLookingFor', { competitorName })}{' '}
          <a
            href={competitorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-gray-300 underline-offset-4 transition hover:text-gray-600 hover:decoration-gray-500"
          >
            {t('shell.visitWebsite')}
          </a>
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Internal cross-links                                              */
/* ------------------------------------------------------------------ */

export function CompareOtherSystems({ currentPath }: { currentPath: string }) {
  const { t } = useTranslation('landing')

  return (
    <section className="mt-16 sm:mt-20">
      <h2 className="text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">
        {t('compare.otherSystemsHeading')}
      </h2>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
        {COMPARISON_ROUTE_ENTRIES.filter((c) => c.path !== currentPath).map((c) => (
          <Link key={c.path} to={c.path} className={linkClass}>
            {t(c.labelKey)}
          </Link>
        ))}
      </div>
      <p className="mt-4">
        <Link
          to={HUB_PATH}
          className="text-[13px] text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-700 hover:decoration-gray-500"
        >
          {t('compare.hubLinkText')}
        </Link>
      </p>
    </section>
  )
}

export function RelatedQuestions({ questions }: { questions: string[] }) {
  const { t } = useTranslation('comparePages')
  return (
    <section className="mt-12 sm:mt-14">
      <h2 className="text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">
        {t('shell.relatedHeading')}
      </h2>
      <ul className="mt-5 space-y-2.5 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
        {questions.map((q) => (
          <li key={q} className="flex items-start gap-2.5">
            <span className="mt-0.5 block shrink-0 text-[15px] text-gray-400">{t('shell.relatedQPrefix')}</span>
            {q}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Utility                                                           */
/* ------------------------------------------------------------------ */

export function Bullet({
  children,
  variant = 'gray',
}: {
  children: React.ReactNode
  variant?: 'gray' | 'indigo'
}) {
  const dot = variant === 'indigo' ? 'bg-indigo-400' : 'bg-gray-400'
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {children}
    </li>
  )
}
