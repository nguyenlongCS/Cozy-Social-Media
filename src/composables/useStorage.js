/*
src/composables/useStorage.js - Refactored
Quản lý localStorage với safe operations
Logic: Centralize localStorage với error handling
*/
import { ref } from 'vue'

export function useStorage() {
  const rememberedEmail = ref('')
  const rememberMe = ref(false)

  // Safe localStorage operations
  const setItem = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  const getItem = (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  const removeItem = (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  // Remember email functionality
  const loadRememberedEmail = () => {
    rememberedEmail.value = getItem('rememberedEmail', '')
    rememberMe.value = getItem('rememberMe', false)
    return { email: rememberedEmail.value, remember: rememberMe.value }
  }

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
    rememberedEmail,
    rememberMe,
    loadRememberedEmail,
    saveRememberedEmail
  }
}
