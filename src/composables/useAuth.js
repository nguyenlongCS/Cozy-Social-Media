/*
src/composables/useAuth.js - Fixed User Sync Issue
Composable quản lý authentication
Logic:
- Centralize logic đăng nhập, đăng ký, đăng xuất và theo dõi trạng thái user
- FIX: Không tự động sync/overwrite user data khi auth state change
- Chỉ sync user data khi đăng nhập lần đầu hoặc đăng ký mới
- Tránh ghi đè thông tin user đã cập nhật trên Firestore
*/
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth } from '@/firebase/config'
import { useUsers } from './useUsers'

export function useAuth() {
  const user = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const { syncUserToFirestore } = useUsers()
  let unsubscribe = null

  // Track nếu đây là login session mới để quyết định có sync hay không
  let isNewLoginSession = false

  // Helper function để sync user sau khi authentication thành công
  const handleSuccessfulAuth = async (firebaseUser, forceSync = false) => {
    // Chỉ sync nếu đây là login mới hoặc được force
    if (forceSync || isNewLoginSession) {
      try {
        await syncUserToFirestore(firebaseUser)
        console.log('User synced to Firestore (new login):', firebaseUser.uid)
      } catch (syncError) {
        console.error('Error syncing user to Firestore:', syncError)
      }
      isNewLoginSession = false // Reset flag
    }
    
    return firebaseUser
  }

  // Khởi tạo listener theo dõi trạng thái auth
  const initAuthListener = () => {
    unsubscribe = onAuthStateChanged(auth, (authUser) => {
      const wasLoggedOut = !user.value
      user.value = authUser
      
      if (authUser) {
        console.log('Auth state changed: User logged in', authUser.uid)
        
        // Chỉ sync nếu đây là session mới (từ logged out → logged in)
        // Không sync nếu chỉ là page refresh với existing session
        if (wasLoggedOut) {
          console.log('New login session detected')
          isNewLoginSession = true
          handleSuccessfulAuth(authUser)
        } else {
          console.log('Existing session maintained - no sync needed')
        }
      } else {
        console.log('Auth state changed: User logged out')
        isNewLoginSession = false
      }
    })
  }

  // Đăng nhập với email/password
  const loginWithEmail = async (email, password) => {
    if (!email || !password) {
      throw new Error('MISSING_FIELDS')
    }

    isLoading.value = true
    error.value = null
    isNewLoginSession = true // Đánh dấu đây là login session mới
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      // handleSuccessfulAuth sẽ được gọi trong onAuthStateChanged
      return userCredential.user
    } catch (err) {
      error.value = err
      isNewLoginSession = false
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Đăng ký với email/password
  const signupWithEmail = async (email, password, confirmPassword) => {
    if (!email || !password || !confirmPassword) {
      throw new Error('MISSING_FIELDS')
    }

    if (password !== confirmPassword) {
      throw new Error('PASSWORD_MISMATCH')
    }

    if (password.length < 6) {
      throw new Error('WEAK_PASSWORD')
    }

    isLoading.value = true
    error.value = null
    isNewLoginSession = true // Đánh dấu đây là signup session mới
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      // Force sync cho user mới đăng ký
      await handleSuccessfulAuth(userCredential.user, true)
      return userCredential.user
    } catch (err) {
      error.value = err
      isNewLoginSession = false
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Đăng nhập với Google
  const loginWithGoogle = async () => {
    isLoading.value = true
    error.value = null
    isNewLoginSession = true // Đánh dấu đây là login session mới
    
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      const result = await signInWithPopup(auth, provider)
      // Force sync cho Google login (có thể là user mới)
      await handleSuccessfulAuth(result.user, true)
      return result.user
    } catch (err) {
      error.value = err
      isNewLoginSession = false
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Đăng nhập với Facebook
  const loginWithFacebook = async () => {
    isLoading.value = true
    error.value = null
    isNewLoginSession = true // Đánh dấu đây là login session mới
    
    try {
      const provider = new FacebookAuthProvider()
      provider.addScope('email')
      provider.addScope('public_profile')
      provider.setCustomParameters({
        'display': 'popup'
      })
      
      const result = await signInWithPopup(auth, provider)
      // Force sync cho Facebook login (có thể là user mới)
      await handleSuccessfulAuth(result.user, true)
      return result.user
    } catch (err) {
      error.value = err
      isNewLoginSession = false
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Gửi email reset password
  const resetPassword = async (email) => {
    if (!email) {
      throw new Error('MISSING_EMAIL')
    }

    isLoading.value = true
    error.value = null
    
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Đăng xuất
  const logout = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      await signOut(auth)
      isNewLoginSession = false
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Cleanup listener
  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe()
    }
  }

  // Auto setup và cleanup
  onMounted(() => {
    initAuthListener()
  })

  onUnmounted(() => {
    cleanup()
  })

  // Force sync current user to Firestore (for debugging)
  const forceSyncCurrentUser = async () => {
    if (user.value) {
      await syncUserToFirestore(user.value)
    }
  }

  return {
    user,
    isLoading,
    error,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    loginWithFacebook,
    resetPassword,
    logout,
    initAuthListener,
    cleanup,
    forceSyncCurrentUser
  }
}