import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ScrollToTopButton() {
  const { t } = useTranslation('landing')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <button
      onClick={scrollToTop}
      aria-label={t('a11y.backToTop')}
      className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg ring-1 ring-white/10 transition-all duration-300 hover:bg-indigo-600 hover:shadow-xl hover:scale-110 active:scale-95 sm:bottom-8 sm:right-8 sm:h-12 sm:w-12 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l5.5 5.5a.75.75 0 01-1.06 1.06L10.75 5.56v10.69a.75.75 0 01-1.5 0V5.56L5.03 9.78a.75.75 0 01-1.06-1.06l5.5-5.5A.75.75 0 0110 3z" clipRule="evenodd" />
      </svg>
    </button>
  )
}
