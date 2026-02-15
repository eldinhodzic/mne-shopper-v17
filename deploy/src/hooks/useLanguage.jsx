import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { languages, defaultLanguage, getTranslations, interpolate } from '../locales'

const LANGUAGE_KEY = 'mne_cjenovnik_language'

// Create context
const LanguageContext = createContext(null)

// Provider component
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved && languages[saved]) {
      return saved
    }
    
    // Try to detect from browser
    const browserLang = navigator.language?.split('-')[0]
    if (languages[browserLang]) {
      return browserLang
    }
    
    return defaultLanguage
  })

  const [translations, setTranslations] = useState(() => getTranslations(language))

  useEffect(() => {
    setTranslations(getTranslations(language))
    localStorage.setItem(LANGUAGE_KEY, language)
    
    // Update html lang attribute
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((lang) => {
    if (languages[lang]) {
      setLanguageState(lang)
    }
  }, [])

  // Translation function with interpolation support
  const t = useCallback((key, vars = {}) => {
    const keys = key.split('.')
    let value = translations
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) {
        console.warn(`Translation missing: ${key}`)
        return key
      }
    }
    
    return interpolate(value, vars)
  }, [translations])

  const value = {
    language,
    setLanguage,
    t,
    languages,
    currentLanguage: languages[language]
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
