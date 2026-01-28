import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'mne_cjenovnik_settings'

const defaultSettings = {
  shareWithCommunity: true,  // Opt-in by default
  showCommunityPrices: true,
  theme: 'dark',
  language: 'sr-Latn'
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
    } catch {
      return defaultSettings
    }
  })

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return { settings, updateSetting, toggleSetting }
}
