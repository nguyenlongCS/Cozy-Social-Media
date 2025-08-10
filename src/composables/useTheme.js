/*
src/composables/useTheme.js - Refactored
Quản lý theme color với localStorage persistence
Logic: Global state cho theme với auto-load và auto-save
*/
import { ref } from 'vue'

const currentTheme = ref('#6495ED') // Default blue theme

// Apply theme to CSS root variables
const applyTheme = (color) => {
  document.documentElement.style.setProperty('--theme-color', color)
}

// Load theme from storage
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem('appTheme')
    if (savedTheme) {
      currentTheme.value = savedTheme
    }
    applyTheme(currentTheme.value)
  } catch {
    applyTheme(currentTheme.value)
  }
}

// Save theme to storage
const saveThemeToStorage = (theme) => {
  try {
    localStorage.setItem('appTheme', theme)
  } catch {
    // Silent fail
  }
}

// Initialize theme
loadThemeFromStorage()

export function useTheme() {
  const changeTheme = (color) => {
    currentTheme.value = color
    applyTheme(color)
    saveThemeToStorage(color)
  }

  return {
    currentTheme,
    changeTheme
  }
}
