import { ref } from 'vue'
import vi from '@/locales/vi'
import en from '@/locales/en'

const globalLanguage = ref('vi')

const loadLanguageFromStorage = () => {
  try {
    const saved = localStorage.getItem('appLanguage')
    if (saved === 'vi' || saved === 'en') {
      globalLanguage.value = saved
    }
  } catch {}
}

const saveLanguageToStorage = (lang) => {
  try {
    localStorage.setItem('appLanguage', lang)
  } catch {}
}

loadLanguageFromStorage()

const translations = { vi, en }

export function useLanguage() {
  const toggleLanguage = () => {
    const newLang = globalLanguage.value === 'vi' ? 'en' : 'vi'
    setLanguage(newLang)
  }

  const setLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      globalLanguage.value = lang
      saveLanguageToStorage(lang)
    }
  }

  const getText = (key) => {
    const current = translations[globalLanguage.value]
    const fallback = translations.en
    return current[key] || fallback[key] || key
  }

  return {
    currentLanguage: globalLanguage,
    toggleLanguage,
    setLanguage,
    getText,
    t: getText,
    availableLanguages: ['vi', 'en']
  }
}
