import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources.js'

export const LANGUAGE_STORAGE_KEY = 'media.language.v1'
const DEFAULT_LANGUAGE = 'en'

function readLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && resources[stored]) return stored
  } catch {
    /* localStorage may be unavailable */
  }
  return DEFAULT_LANGUAGE
}

function applyLanguage(language) {
  const code = String(language).split('-')[0]
  document.documentElement.lang = code

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
  } catch {
    /* localStorage may be unavailable */
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: readLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: Object.keys(resources),
  interpolation: { escapeValue: false },
})

applyLanguage(i18n.language)
i18n.on('languageChanged', applyLanguage)

export default i18n
