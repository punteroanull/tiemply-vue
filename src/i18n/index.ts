import { createI18n } from 'vue-i18n'
import en from './locales/en'
import es from './locales/es'

// Detect browser language
function getBrowserLocale(): string {
  const browserLang = navigator.language.split('-')[0]
  return ['es', 'en'].includes(browserLang) ? browserLang : 'en'
}

// Get saved locale or detect from browser
function getInitialLocale(): string {
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && ['es', 'en'].includes(savedLocale)) {
    return savedLocale
  }
  return getBrowserLocale()
}

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    es
  }
})

export default i18n
