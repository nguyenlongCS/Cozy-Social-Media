/*
Composable quản lý theme
Centralize logic chuyển đổi theme color và lưu trữ vào localStorage
- Load theme từ localStorage khi khởi tạo
- Save theme vào localStorage khi thay đổi
- Apply theme color vào CSS variables
*/
import { ref, onMounted } from 'vue'

// Global state cho theme color
const currentTheme = ref('#ffeb7c') // Default yellow theme

// Load theme từ localStorage
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem('appTheme')
    if (savedTheme) {
      currentTheme.value = savedTheme
      applyTheme(savedTheme)
    }
  } catch (error) {
    console.error('Error loading theme from localStorage:', error)
  }
}

// Save theme vào localStorage
const saveThemeToStorage = (theme) => {
  try {
    localStorage.setItem('appTheme', theme)
  } catch (error) {
    console.error('Error saving theme to localStorage:', error)
  }
}

// Apply theme color vào CSS
const applyTheme = (color) => {
  document.documentElement.style.setProperty('--theme-color', color)
}

// Initialize theme từ storage khi module load
loadThemeFromStorage()

export function useTheme() {
  // Change theme và save vào localStorage
  const changeTheme = (color) => {
    currentTheme.value = color
    applyTheme(color)
    saveThemeToStorage(color)
  }

  // Initialize theme khi component mount
  const initTheme = () => {
    loadThemeFromStorage()
  }

  return {
    currentTheme,
    changeTheme,
    initTheme
  }
}