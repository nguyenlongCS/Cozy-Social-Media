/*
src/composables/useTheme.js - Refactored  
Composable quản lý theme color với localStorage persistence
Logic: Global state cho theme với auto-load và auto-save
*/
import { ref } from 'vue'

const currentTheme = ref('#6495ED') // Default blue theme

// Apply theme color vào CSS root variables
const applyTheme = (color) => {
  document.documentElement.style.setProperty('--theme-color', color)
}

// Load theme từ localStorage với error handling
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem('appTheme')
    if (savedTheme) {
      currentTheme.value = savedTheme
    }
    applyTheme(currentTheme.value)
  } catch (error) {
    applyTheme(currentTheme.value)
  }
}

// Save theme vào localStorage
const saveThemeToStorage = (theme) => {
  try {
    localStorage.setItem('appTheme', theme)
  } catch (error) {
    // Silent fail để không break functionality
  }
}

// Initialize theme khi module load
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