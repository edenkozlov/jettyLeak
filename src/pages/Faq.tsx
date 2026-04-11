import { useMemo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { BrandLogoMark } from '@/components/BrandLogoMark'
import { LandingLanguageSwitch } from '@/components/landing/LandingLanguageSwitch'
import { SiteFooter } from '@/components/SiteFooter'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

type FaqEntry = {
  q: string
  schemaText: string
  paragraphs?: string[]
  list?: string[]
  afterList?: string
}

type FaqSection = { heading: string; items: FaqEntry[] }

function FaqAnswer({ entry }: { entry: FaqEntry }) {
  return (
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
      {entry.paragraphs?.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {entry.list && entry.list.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {entry.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {entry.afterList ? <p>{entry.afterList}</p> : null}
    </div>
  )
}

export default function Faq() {
  const { t, i18n } = useTranslation('landing')
  useDocumentMeta(t('faq.pageTitle'), t('faq.metaDescription'))

  const sections = useMemo(
    () => t('faq.sections', { returnObjects: true }) as FaqSection[],
    [t, i18n.resolvedLanguage],
  )

  const faqLd = useMemo(
    () =>
      sections.flatMap((s) =>
        s.items.map((item) => ({
          '@type': 'Question' as const,
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer' as const,
            text: item.schemaText,
          },
        })),
      ),
    [sections],
  )

  return (
    <div className="min-h-screen bg-white antialiased">
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogoMark />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <LandingLanguageSwitch />
            <Link to="/" className="text-[13px] text-gray-400 transition hover:text-gray-700">
              {t('footer.links.home')}
            </Link>
            <Link to="/case-study" className="text-[13px] text-gray-400 transition hover:text-gray-700">
              {t('footer.links.caseStudy')}
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-indigo-600 sm:px-5 sm:text-[13px]"
            >
              {t('nav.signIn')}
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(68,87,194,0.10),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">{t('faq.eyebrow')}</p>
          <h1 className="mt-5 text-[28px] leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            {t('faq.title')}
          </h1>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {sections.map((section) => (
          <section key={`${i18n.resolvedLanguage}-${section.heading}`} className="mb-14 last:mb-0 sm:mb-16">
            <h2 className="border-b border-gray-200 pb-3 text-[20px] font-bold tracking-tight text-gray-900 sm:text-[22px]">
              {section.heading}
            </h2>
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <div key={item.q} className="py-8 first:pt-6">
                  <h3 className="text-[17px] font-semibold text-gray-900">{item.q}</h3>
                  <FaqAnswer entry={item} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold tracking-wide text-gray-500 uppercase">{t('faq.disclaimerTitle')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-400">{t('faq.disclaimerBody')}</p>
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqLd,
          }),
        }}
      />

      <SiteFooter variant="page" />
      <ScrollToTopButton />
    </div>
  )
}
