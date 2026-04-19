import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import ScrollToTopButton from '@/components/ScrollToTopButton'
import { LandingNav } from '@/components/landing'
import { AddressAutocomplete, PropertyMap } from '@/components/intelligence'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import {
  logPropertySearch,
  markQuoteClicked,
  type SearchSource,
} from '@/lib/analytics/propertyIntelligence'
import { estimatePropertyScore } from '@/lib/scoring'
import type {
  CategoryScore,
  MapboxFeature,
  PropertyScore,
  ScoreBand,
} from '@/lib/scoring'

const LOADING_MS = 900

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PropertyIntelligence() {
  const { t } = useTranslation('landing')
  useDocumentMeta(t('intelligence.meta.title'), t('intelligence.meta.description'))

  const location = useLocation()
  const initialFeature =
    (location.state as { feature?: MapboxFeature } | null)?.feature ?? null

  const [feature, setFeature] = useState<MapboxFeature | null>(initialFeature)
  const [result, setResult] = useState<PropertyScore | null>(null)
  const [loading, setLoading] = useState<boolean>(initialFeature != null)

  const onSelect = useCallback((f: MapboxFeature) => {
    setFeature(f)
    setResult(null)
    setLoading(true)
    window.setTimeout(() => {
      const score = estimatePropertyScore(f)
      setResult(score)
      setLoading(false)
      void logPropertySearch(f, score, 'intelligence_page' satisfies SearchSource)
    }, LOADING_MS)
  }, [])

  const reset = useCallback(() => {
    setFeature(null)
    setResult(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!initialFeature) return
    const timer = window.setTimeout(() => {
      const score = estimatePropertyScore(initialFeature)
      setResult(score)
      setLoading(false)
      void logPropertySearch(
        initialFeature,
        score,
        'landing_hero' satisfies SearchSource,
      )
    }, LOADING_MS)
    return () => window.clearTimeout(timer)
  }, [initialFeature])

  const selectedCoords = useMemo(() => {
    if (!feature) return { latitude: undefined, longitude: undefined }
    const [lng, lat] = feature.center
    return { latitude: lat, longitude: lng }
  }, [feature])

  const hasSelection = feature != null
  const primaryAddressLine = feature?.text ?? feature?.place_name.split(',')[0] ?? ''
  const secondaryAddressLine = feature
    ? feature.place_name.replace(
        new RegExp(`^${escapeReg(primaryAddressLine)},?\\s*`),
        '',
      )
    : ''

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <LandingNav />

      <SplitHero
        hasSelection={hasSelection}
        loading={loading}
        result={result}
        coords={selectedCoords}
        primaryAddressLine={primaryAddressLine}
        secondaryAddressLine={secondaryAddressLine}
        onSelect={onSelect}
        onReset={reset}
      />

      <ScrollToTopButton />
      <QuoteCtaPopup resultShown={result != null} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Split hero (panel + map)                                                   */
/* -------------------------------------------------------------------------- */

interface SplitHeroProps {
  hasSelection: boolean
  loading: boolean
  result: PropertyScore | null
  coords: { latitude?: number; longitude?: number }
  primaryAddressLine: string
  secondaryAddressLine: string
  onSelect: (f: MapboxFeature) => void
  onReset: () => void
}

function useIsLargeScreen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(min-width: 1024px)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => true,
  )
}

function SplitHero({
  hasSelection,
  loading,
  result,
  coords,
  primaryAddressLine,
  secondaryAddressLine,
  onSelect,
  onReset,
}: SplitHeroProps) {
  const isLarge = useIsLargeScreen()
  const mapPadding = isLarge ? { left: 120 } : undefined

  // Scroll hint for the mobile panel — only shown when the panel actually has
  // overflow AND the user hasn't yet scrolled near the bottom.
  const scrollableRef = useRef<HTMLDivElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  const recomputeScrollHint = useCallback(() => {
    const el = scrollableRef.current
    if (!el) return
    const overflows = el.scrollHeight - el.clientHeight > 16
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    setShowScrollHint(overflows && !nearBottom)
  }, [])

  useEffect(() => {
    recomputeScrollHint()
    const el = scrollableRef.current
    if (!el) return
    const ro = new ResizeObserver(recomputeScrollHint)
    ro.observe(el)
    window.addEventListener('resize', recomputeScrollHint)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recomputeScrollHint)
    }
  }, [recomputeScrollHint, hasSelection, loading, result])

  const onPanelScroll = useCallback(() => {
    recomputeScrollHint()
  }, [recomputeScrollHint])

  return (
    <section
      className="relative w-full border-b border-gray-200 pt-16"
      style={{ height: '100svh', minHeight: 640 }}
    >
      {/* On small screens, put the map FIRST (visually, via flex-col-reverse)
          so users see the fly-to animation and the highlighted building, then
          swipe the panel to read the breakdown. */}
      <div className="flex h-full w-full flex-col-reverse lg:flex-row">
        {/* Panel — takes remaining vertical space on mobile, fixed width on desktop */}
        <aside className="relative z-10 flex min-h-0 w-full flex-1 flex-col border-t border-gray-200 bg-white lg:h-full lg:flex-none lg:w-[440px] lg:border-t-0 lg:border-r xl:w-[480px]">
          <div
            ref={scrollableRef}
            onScroll={onPanelScroll}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {hasSelection ? (
              <ResultPanel
                loading={loading}
                result={result}
                primaryAddressLine={primaryAddressLine}
                secondaryAddressLine={secondaryAddressLine}
                onReset={onReset}
              />
            ) : (
              <EmptyPanel onSelect={onSelect} />
            )}
          </div>
          {/* Mobile scroll affordance — gradient + "scroll" chip so users know
              the breakdown continues below the visible area. Hides on desktop
              (no overflow there) and when scrolled to the end. */}
          {showScrollHint ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent lg:hidden"
              aria-hidden
            >
              <div className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-600 shadow-sm backdrop-blur">
                Scroll
                <svg
                  className="h-3 w-3 animate-bounce"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </div>
            </div>
          ) : null}
        </aside>

        {/* Map — fixed 55% viewport height on mobile so it never collapses to a
            sliver, fills remaining width on desktop. */}
        <div className="relative h-[55svh] w-full shrink-0 lg:h-full lg:w-auto lg:flex-1 lg:shrink">
          <PropertyMap
            latitude={coords.latitude}
            longitude={coords.longitude}
            active={hasSelection}
            idle={!hasSelection}
            styleVariant="streets"
            className="h-full w-full"
            occludedPadding={mapPadding}
          />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Empty panel                                                                */
/* -------------------------------------------------------------------------- */

function EmptyPanel({ onSelect }: { onSelect: (f: MapboxFeature) => void }) {
  const { t } = useTranslation('landing')

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-8 lg:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
          {t('intelligence.hero.eyebrow')}
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-[34px]">
          {t('intelligence.hero.titleBefore')} {t('intelligence.hero.titleHighlight')}{' '}
          {t('intelligence.hero.titleAfter')}
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
          {t('intelligence.hero.subtitle')}
        </p>

        <div className="mt-7">
          <AddressAutocomplete onSelect={onSelect} autoFocus variant="hero" />
        </div>

        <ul className="mt-8 space-y-2.5 text-[13px] text-gray-600">
          {(['publicRecords', 'infrastructure', 'environmental'] as const).map((k) => (
            <li key={k} className="flex items-center gap-2.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              {t(`intelligence.hero.trust.${k}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-gray-100 px-6 py-4 text-[11.5px] text-gray-400 sm:px-8">
        {t('intelligence.disclaimer.body')}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Result panel                                                               */
/* -------------------------------------------------------------------------- */

interface ResultPanelProps {
  loading: boolean
  result: PropertyScore | null
  primaryAddressLine: string
  secondaryAddressLine: string
  onReset: () => void
}

function ResultPanel({
  loading,
  result,
  primaryAddressLine,
  secondaryAddressLine,
  onReset,
}: ResultPanelProps) {
  const { t } = useTranslation('landing')

  return (
    <div className="flex h-full flex-col">
      {/* Header: address + icon reset */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            <span className="inline-flex h-1 w-1 rounded-full bg-sky-500" />
            {t('intelligence.results.eyebrow')}
          </p>
          <h2 className="mt-1.5 truncate text-[18px] font-semibold leading-tight tracking-tight text-gray-900">
            {primaryAddressLine}
          </h2>
          {secondaryAddressLine ? (
            <p className="mt-0.5 truncate text-[12px] text-gray-500">
              {secondaryAddressLine}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
          aria-label={t('intelligence.results.ctaReset')}
          title={t('intelligence.results.ctaReset')}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>

      {loading || !result ? (
        <LoadingBlock />
      ) : (
        <>
          {/* Overall score — compact single-row header */}
          <div className="border-y border-gray-100 bg-gray-50/60 px-5 py-3.5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-[34px] font-semibold leading-none tabular-nums ${bandText(
                    result.band,
                  )}`}
                >
                  {result.overall}
                </span>
                <span className="text-[13px] font-medium text-gray-400">/10</span>
                <span
                  className={`ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${bandText(
                    result.band,
                  )}`}
                >
                  {t(`intelligence.bands.${result.band}`)}
                </span>
              </div>
              <span className="text-[10.5px] font-medium tabular-nums text-gray-500">
                {t('intelligence.results.confidencePct', {
                  pct: Math.round(result.confidence * 100),
                })}
              </span>
            </div>
            <div className="mt-2.5 flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < result.overall ? bandBg(result.band) : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Category breakdown — tight single-line rows */}
          <div className="flex-1 px-5 pt-3 pb-3 sm:px-6">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                {t('intelligence.results.categoriesEyebrow')}
              </p>
              <p className="text-[10px] text-gray-400">
                {t('intelligence.results.scaleHint')}
              </p>
            </div>
            <ul>
              {result.categories.map((c) => (
                <CategoryRow key={c.key} category={c} />
              ))}
            </ul>
          </div>

          {/* Disclaimer footnote */}
          <div className="border-t border-gray-100 px-5 py-2.5 text-[10.5px] leading-snug text-gray-400 sm:px-6">
            {t('intelligence.disclaimer.body')}
          </div>

          {/* CTA */}
          <div className="border-t border-gray-200 bg-white px-5 py-3 sm:px-6">
            <Link
              to="/quote"
              onClick={() => void markQuoteClicked()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-gray-800"
            >
              {t('intelligence.results.ctaPrimary')}
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Category row                                                               */
/* -------------------------------------------------------------------------- */

function CategoryRow({ category }: { category: CategoryScore }) {
  const { t } = useTranslation('landing')
  const rationale = t(
    `intelligence.categories.${category.key}.rationale.${category.rationaleKey}`,
    {
      defaultValue: t(`intelligence.categories.${category.key}.rationale.default`),
    },
  )

  return (
    <li
      className="group grid grid-cols-[1fr_96px_36px] items-center gap-3 py-1.5"
      title={rationale}
    >
      <p className="truncate text-[12.5px] font-medium text-gray-800">
        {t(`intelligence.categories.${category.key}.title`)}
      </p>
      <span className="flex gap-[2px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`h-[5px] flex-1 rounded-sm ${
              i < category.score ? toneBg(category.score) : 'bg-gray-100'
            }`}
          />
        ))}
      </span>
      <span
        className={`text-right text-[12.5px] font-semibold tabular-nums ${toneText(
          category.score,
        )}`}
      >
        {category.score}
      </span>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*  Loading block                                                              */
/* -------------------------------------------------------------------------- */

function LoadingBlock() {
  const { t } = useTranslation('landing')
  return (
    <div className="flex flex-1 flex-col px-5 sm:px-6" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 border-y border-gray-100 bg-gray-50/60 py-3.5">
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"
          aria-hidden
        />
        <p className="text-[12.5px] font-medium text-gray-700">
          {t('intelligence.loading.title')}
        </p>
      </div>
      <ul className="flex-1 pt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <li
            key={i}
            className="grid grid-cols-[1fr_96px_36px] items-center gap-3 py-1.5"
          >
            <div className="h-3 w-2/3 rounded-full bg-gray-100" />
            <div className="h-[5px] w-full rounded-full bg-gray-100" />
            <div className="h-3 w-full rounded-full bg-gray-100" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Delayed /quote CTA popup                                                   */
/* -------------------------------------------------------------------------- */

const CTA_DELAY_MS = 8000
const CTA_DISMISS_KEY = 'beluga_pi_cta_dismissed_at'

function QuoteCtaPopup({ resultShown }: { resultShown: boolean }) {
  const { t } = useTranslation('landing')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!resultShown) {
      setOpen(false)
      return
    }
    // Respect a recent dismissal so we don't nag after every search.
    try {
      const dismissedAt = Number(window.sessionStorage.getItem(CTA_DISMISS_KEY) ?? 0)
      if (dismissedAt && Date.now() - dismissedAt < 30 * 60 * 1000) return
    } catch {
      /* no session storage — fall through */
    }
    const timer = window.setTimeout(() => setOpen(true), CTA_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [resultShown])

  const dismiss = () => {
    setOpen(false)
    try {
      window.sessionStorage.setItem(CTA_DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:justify-end"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] animate-[fade-scale_0.35s_cubic-bezier(0.2,0.8,0.2,1)_both]"
        role="dialog"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label={t('intelligence.ctaPopup.dismiss')}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="p-5 pr-9 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            {t('intelligence.ctaPopup.eyebrow')}
          </p>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug text-gray-900">
            {t('intelligence.ctaPopup.title')}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-600">
            {t('intelligence.ctaPopup.body')}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              to="/quote"
              onClick={() => {
                dismiss()
                void markQuoteClicked()
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-gray-800"
            >
              {t('intelligence.ctaPopup.primary')}
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
            >
              {t('intelligence.ctaPopup.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function bandText(band: ScoreBand): string {
  switch (band) {
    case 'excellent':
      return 'text-emerald-600'
    case 'good':
      return 'text-sky-600'
    case 'watch':
      return 'text-amber-600'
    case 'action':
      return 'text-rose-600'
  }
}

function bandBg(band: ScoreBand): string {
  switch (band) {
    case 'excellent':
      return 'bg-emerald-500'
    case 'good':
      return 'bg-sky-500'
    case 'watch':
      return 'bg-amber-500'
    case 'action':
      return 'bg-rose-500'
  }
}

function toneText(score: number): string {
  if (score >= 9) return 'text-emerald-600'
  if (score >= 7) return 'text-sky-600'
  if (score >= 5) return 'text-amber-600'
  return 'text-rose-600'
}

function toneBg(score: number): string {
  if (score >= 9) return 'bg-emerald-500'
  if (score >= 7) return 'bg-sky-500'
  if (score >= 5) return 'bg-amber-500'
  return 'bg-rose-500'
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
