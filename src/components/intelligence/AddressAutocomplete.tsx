import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { searchAddresses } from '@/lib/intelligence/geocoding'
import type { MapboxFeature } from '@/lib/scoring'

interface AddressAutocompleteProps {
  onSelect: (feature: MapboxFeature) => void
  placeholder?: string
  autoFocus?: boolean
  /** Called when the user clears the input or resets the form. */
  onClear?: () => void
  initialValue?: string
  /** Premium / compact variant switches padding + typography. */
  variant?: 'hero' | 'compact'
}

export function AddressAutocomplete({
  onSelect,
  placeholder,
  autoFocus = false,
  onClear,
  initialValue = '',
  variant = 'hero',
}: AddressAutocompleteProps) {
  const { t } = useTranslation('landing')
  const [query, setQuery] = useState(initialValue)
  const [results, setResults] = useState<MapboxFeature[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [loading, setLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useMemo(() => `addr-ac-${Math.random().toString(36).slice(2, 8)}`, [])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
    if (q.trim().length < 3) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const features = await searchAddresses(q, { signal: controller.signal, limit: 6 })
        setResults(features)
        setOpen(features.length > 0)
        setHighlight(features.length > 0 ? 0 : -1)
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const pick = useCallback(
    (f: MapboxFeature) => {
      setQuery(f.place_name)
      setResults([])
      setOpen(false)
      setHighlight(-1)
      onSelect(f)
    },
    [onSelect],
  )

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter' && query.length >= 3) runSearch(query)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const picked = results[highlight] ?? results[0]
      if (picked) pick(picked)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    setHighlight(-1)
    onClear?.()
    inputRef.current?.focus()
  }

  const isHero = variant === 'hero'

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        className={[
          'group relative flex items-center gap-3 rounded-2xl border bg-white/95 backdrop-blur-xl transition-all',
          'border-gray-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_50px_-20px_rgba(2,132,199,0.25)]',
          'focus-within:border-sky-400/60 focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_30px_60px_-20px_rgba(2,132,199,0.35)] focus-within:ring-4 focus-within:ring-sky-400/10',
          isHero ? 'px-4 py-3 sm:px-5 sm:py-4' : 'px-3.5 py-2.5',
        ].join(' ')}
      >
        <svg
          className={`shrink-0 text-gray-400 transition group-focus-within:text-sky-500 ${isHero ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-4 w-4'}`}
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

        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            runSearch(e.target.value)
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          onKeyDown={onKey}
          placeholder={placeholder ?? t('intelligence.search.placeholder')}
          className={[
            'w-full bg-transparent font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none',
            isHero ? 'text-[16px] sm:text-[18px]' : 'text-[14px]',
          ].join(' ')}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listId}-opt-${highlight}` : undefined}
        />

        {loading ? (
          <span
            className={`shrink-0 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-500 ${isHero ? 'h-4 w-4' : 'h-3.5 w-3.5'}`}
            aria-hidden
          />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={t('intelligence.search.clear')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <div
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/98 shadow-2xl shadow-sky-900/10 backdrop-blur-xl animate-slide-up"
          style={{ animationDuration: '0.25s' }}
        >
          <ul
            id={listId}
            role="listbox"
            className="max-h-[min(50vh,11.25rem)] overflow-y-auto overscroll-contain"
          >
          {results.map((f, i) => {
            const title = f.text ?? f.place_name.split(',')[0] ?? ''
            const rest = f.place_name.replace(new RegExp(`^${escapeReg(title)},?\\s*`), '')
            return (
              <li
                key={f.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(f)}
                  className={[
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition',
                    i === highlight ? 'bg-sky-50/80' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                      i === highlight ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500',
                    ].join(' ')}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13Z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-gray-900">{title}</span>
                    {rest ? (
                      <span className="block truncate text-[12px] text-gray-500">{rest}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
          </ul>
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-[11px] text-gray-400">
            {t('intelligence.search.attribution')}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
