/*
Composable quản lý theme - Refactored
Centralize logic chuyển đổi theme color và lưu trữ vào localStorage
- Đơn giản hóa logic load/save localStorage
- Loại bỏ initTheme method không cần thiết vì đã auto load
*/
import { ref } from 'vue'

// Global state cho theme color
const currentTheme = ref('#6495ED') // Default blue theme

// Apply theme color vào CSS
const applyTheme = (color) => {
  document.documentElement.style.setProperty('--theme-color', color)
}

// Load và apply theme từ localStorage
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem('appTheme')
    if (savedTheme) {
      currentTheme.value = savedTheme
      applyTheme(savedTheme)
    } else {
      // Apply default theme nếu chưa có theme được lưu
      applyTheme(currentTheme.value)
    }
  } catch (error) {
    console.error('Error loading theme from localStorage:', error)
    applyTheme(currentTheme.value)
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

// Initialize theme từ storage khi module load
loadThemeFromStorage()

export function useTheme() {
  // Change theme và save vào localStorage
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