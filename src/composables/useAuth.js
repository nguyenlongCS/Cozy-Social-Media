/*
Composable quản lý authentication
Centralize logic đăng nhập, đăng ký, đăng xuất và theo dõi trạng thái user
Sử dụng chung cho tất cả components liên quan đến auth
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

export function useAuth() {
  const user = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  let unsubscribe = null

  // Khởi tạo listener theo dõi trạng thái auth
  const initAuthListener = () => {
    unsubscribe = onAuthStateChanged(auth, (authUser) => {
      user.value = authUser
      console.log('Auth state changed:', authUser ? 'Logged in' : 'Logged out')
    })
  }

  // Đăng nhập với email/password
  const loginWithEmail = async (email, password) => {
    if (!email || !password) {
      throw new Error('MISSING_FIELDS')
    }

    isLoading.value = true
    error.value = null
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return userCredential.user
    } catch (err) {
      error.value = err
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
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      return userCredential.user
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Đăng nhập với Google
  const loginWithGoogle = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      const result = await signInWithPopup(auth, provider)
      return result.user
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Đăng nhập với Facebook
  const loginWithFacebook = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const provider = new FacebookAuthProvider()
      provider.addScope('email')
      provider.addScope('public_profile')
      provider.setCustomParameters({
        'display': 'popup'
      })
      
      const result = await signInWithPopup(auth, provider)
      return result.user
    } catch (err) {
      error.value = err
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
    cleanup
  }
}