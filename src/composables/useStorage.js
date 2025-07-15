/*
Composable quản lý localStorage
Centralize logic lưu trữ và lấy dữ liệu từ localStorage
Handle errors và provide safe storage operations
*/
import { ref } from 'vue'

export function useStorage() {
  // Lưu dữ liệu vào localStorage
  const setItem = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      return false
    }
  }

  // Lấy dữ liệu từ localStorage
  const getItem = (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return defaultValue
    }
  }

  // Xóa item từ localStorage
  const removeItem = (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('Error removing from localStorage:', error)
      return false
    }
  }

  // Xóa tất cả localStorage
  const clear = () => {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('Error clearing localStorage:', error)
      return false
    }
  }

  // Reactive storage cho remembered email
  const rememberedEmail = ref('')
  const rememberMe = ref(false)

  // Load remembered email
  const loadRememberedEmail = () => {
    rememberedEmail.value = getItem('rememberedEmail', '')
    rememberMe.value = getItem('rememberMe', false)
    return { email: rememberedEmail.value, remember: rememberMe.value }
  }

  // Save remembered email
  const saveRememberedEmail = (email, remember) => {
    if (remember && email) {
      setItem('rememberedEmail', email)
      setItem('rememberMe', true)
      rememberedEmail.value = email
      rememberMe.value = true
    } else {
      removeItem('rememberedEmail')
      removeItem('rememberMe')
      rememberedEmail.value = ''
      rememberMe.value = false
    }
  }

  return {
    setItem,
    getItem,
    removeItem,
    clear,
    rememberedEmail,
    rememberMe,
    loadRememberedEmail,
    saveRememberedEmail
  }
}