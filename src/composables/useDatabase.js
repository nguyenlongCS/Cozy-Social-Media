/*
Composable quản lý database operations - Frontend only
Gọi API endpoints để sync Firebase users với MySQL
Không import mysql2 trực tiếp trên frontend
*/
import { ref } from 'vue'

export function useDatabase() {
  const isConnected = ref(false)
  const syncError = ref(null)
  const isLoading = ref(false)

  // Base API URL (có thể config từ env)
  const API_BASE = import.meta.env.VITE_API_BASE || '/api'

  // Helper function để call API
  const callAPI = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }

  // Test database connection qua API
  const testConnection = async () => {
    try {
      isLoading.value = true
      const result = await callAPI('/test-connection')
      isConnected.value = result.success
      return result.success
    } catch (error) {
      console.error('Database connection test failed:', error)
      isConnected.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Sync Firebase user với MySQL qua API
  const syncUser = async (firebaseUser, loginProvider = null) => {
    try {
      isLoading.value = true
      syncError.value = null

      if (!firebaseUser) {
        throw new Error('Firebase user is required')
      }

      // Prepare user data để gửi lên server
      const userData = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        provider: loginProvider || detectProvider(firebaseUser)
      }

      const result = await callAPI('/sync-user', {
        method: 'POST',
        body: JSON.stringify(userData)
      })

      if (!result.success) {
        syncError.value = result.error
        console.error('User sync failed:', result.error)
      }

      return result

    } catch (error) {
      syncError.value = error.message
      console.error('Sync user error:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // Detect provider từ Firebase user
  const detectProvider = (firebaseUser) => {
    if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
      const provider = firebaseUser.providerData[0].providerId
      switch (provider) {
        case 'google.com':
          return 'google'
        case 'facebook.com':
          return 'facebook'
        case 'password':
          return 'email'
        default:
          return 'email'
      }
    }
    return 'email'
  }

  // Get user từ MySQL by UID qua API
  const getUserByUID = async (uid) => {
    try {
      isLoading.value = true
      const result = await callAPI(`/user/${uid}`)
      return result
    } catch (error) {
      console.error('Get user error:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // Get user statistics qua API
  const getUserStats = async () => {
    try {
      isLoading.value = true
      const stats = await callAPI('/user-stats')
      return stats
    } catch (error) {
      console.error('Get stats error:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Deactivate user qua API
  const deactivateUser = async (uid) => {
    try {
      isLoading.value = true
      const result = await callAPI(`/user/${uid}/deactivate`, {
        method: 'PUT'
      })
      return result
    } catch (error) {
      console.error('Deactivate user error:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isConnected,
    syncError,
    isLoading,
    testConnection,
    syncUser,
    getUserByUID,
    getUserStats,
    deactivateUser
  }
}