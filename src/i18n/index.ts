import { createI18n } from 'vue-i18n'
import en from './locales/en'
import es from './locales/es'

// This module must stay free of imports from the API client and the stores: both of them
// import it to translate their own messages.

export const SUPPORTED_LOCALES = ['es', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_KEY = 'locale'

export function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** The language chosen on this device, or null when none was ever chosen. */
export function savedLocale(): AppLocale | null {
  const saved = localStorage.getItem(LOCALE_KEY)
  return isSupportedLocale(saved) ? saved : null
}

// Detect browser language
function getBrowserLocale(): AppLocale {
  const browserLang = navigator.language.split('-')[0]
  return isSupportedLocale(browserLang) ? browserLang : 'en'
}

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: savedLocale() ?? getBrowserLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    es
  }
})

function syncDocumentLanguage(locale: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

/**
 * Switch the language of the whole app: the translations, `<html lang>` (read by screen
 * readers and by the browser's own translation prompt) and, when `persist` is set, the
 * choice remembered for this device.
 */
export function setAppLocale(locale: string, options: { persist?: boolean } = {}): boolean {
  if (!isSupportedLocale(locale)) return false

  i18n.global.locale.value = locale
  syncDocumentLanguage(locale)

  if (options.persist) {
    localStorage.setItem(LOCALE_KEY, locale)
  }

  return true
}

syncDocumentLanguage(i18n.global.locale.value)

export default i18n
