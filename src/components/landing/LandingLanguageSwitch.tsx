import { useTranslation } from 'react-i18next'

export function LandingLanguageSwitch() {
  const { i18n, t } = useTranslation('landing')
  const active = i18n.resolvedLanguage?.startsWith('fr') ? 'fr' : 'en'

  const setLang = (lng: 'en' | 'fr') => {
    void i18n.changeLanguage(lng)
  }

  const btn =
    'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-[12px]'
  const activeCls = 'bg-white text-gray-900 shadow-sm'
  const idleCls = 'text-gray-500 hover:text-gray-800'

  return (
    <div
      role="group"
      aria-label={t('lang.groupAria')}
      className="flex items-center rounded-lg border border-gray-200/90 bg-gray-50/80 p-0.5"
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`${btn} ${active === 'en' ? activeCls : idleCls}`}
        aria-pressed={active === 'en'}
      >
        {t('lang.en')}
      </button>
      <button
        type="button"
        onClick={() => setLang('fr')}
        className={`${btn} ${active === 'fr' ? activeCls : idleCls}`}
        aria-pressed={active === 'fr'}
      >
        {t('lang.fr')}
      </button>
    </div>
  )
}
