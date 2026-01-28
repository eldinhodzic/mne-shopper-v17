import me from './me.json'
import en from './en.json'
import ru from './ru.json'
import de from './de.json'

export const languages = {
  me: { code: 'me', name: 'Crnogorski', flag: '🇲🇪', translations: me },
  en: { code: 'en', name: 'English', flag: '🇬🇧', translations: en },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺', translations: ru },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪', translations: de }
}

export const defaultLanguage = 'me'

export function getTranslations(lang) {
  return languages[lang]?.translations || languages[defaultLanguage].translations
}

// Helper function to interpolate variables in translation strings
// Usage: t('receipt.savedCommunity', { count: 5 }) -> "5 products added to community"
export function interpolate(text, vars = {}) {
  if (!text) return ''
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match
  })
}
