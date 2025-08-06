/*
src/composables/useAuth.js - Refactored
Authentication với smart avatar handling và session management
Logic: Firebase Auth với user sync và avatar preservation
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
  let isNewLoginSession = false

  // Handle successful authentication
  const handleSuccessfulAuth = async (firebaseUser, forceSync = false) => {
    if (forceSync || isNewLoginSession) {
      try {
        await syncUserToFirestore(firebaseUser)
      } catch (syncError) {
        // Silent fail để không break login
      }
      isNewLoginSession = false
    }
    return firebaseUser
  }

  // Initialize auth state listener
  const initAuthListener = () => {
    unsubscribe = onAuthStateChanged(auth, (authUser) => {
      const wasLoggedOut = !user.value
      user.value = authUser
      
      if (authUser && wasLoggedOut) {
        isNewLoginSession = true
        handleSuccessfulAuth(authUser)
      }
    })
  }

  // Email/password login
  const loginWithEmail = async (email, password) => {
    if (!email || !password) {
      throw new Error('MISSING_FIELDS')
    }

    isLoading.value = true
    error.value = null
    isNewLoginSession = true
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return userCredential.user
    } catch (err) {
      error.value = err
      isNewLoginSession = false
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Email/password signup
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
    isNewLoginSession = true
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
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

  // Google login
  const loginWithGoogle = async () => {
    isLoading.value = true
    error.value = null
    isNewLoginSession = true
    
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      const result = await signInWithPopup(auth, provider)
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

  // Facebook login
  const loginWithFacebook = async () => {
    isLoading.value = true
    error.value = null
    isNewLoginSession = true
    
    try {
      const provider = new FacebookAuthProvider()
      provider.addScope('email')
      provider.addScope('public_profile')
      provider.setCustomParameters({
        'display': 'popup'
      })
      
      const result = await signInWithPopup(auth, provider)
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

  // Password reset
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

  // Logout
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

  // Lifecycle
  onMounted(() => {
    initAuthListener()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
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
    logout
  }
}