import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enArticles from '@/locales/en/articles.json'
import enComparePages from '@/locales/en/comparePagesBundle'
import enFaq from '@/locales/en/faq.json'
import enLanding from '@/locales/en/landing.json'
import frArticles from '@/locales/fr/articles.json'
import frComparePages from '@/locales/fr/comparePagesBundle'
import frFaq from '@/locales/fr/faq.json'
import frLanding from '@/locales/fr/landing.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        landing: { ...enLanding, faq: enFaq },
        articles: enArticles,
        comparePages: enComparePages,
      },
      fr: {
        landing: { ...frLanding, faq: frFaq },
        articles: frArticles,
        comparePages: frComparePages,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    load: 'languageOnly',
    defaultNS: 'landing',
    ns: ['landing', 'articles', 'comparePages'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'beluga_lang',
    },
  })

function syncDocumentLang(lng: string) {
  document.documentElement.lang = lng.startsWith('fr') ? 'fr' : 'en'
}

syncDocumentLang(i18n.resolvedLanguage ?? i18n.language)
i18n.on('languageChanged', syncDocumentLang)

export default i18n
