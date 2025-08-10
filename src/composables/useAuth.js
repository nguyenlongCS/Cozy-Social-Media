/*
src/composables/useAuth.js - Refactored
Quản lý authentication với Firebase Auth
Logic: Login/logout, đăng ký, reset password, social auth với user sync
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
  const { syncUserToFirestore } = useUsers()
  
  let unsubscribe = null

  // Email/password login
  const loginWithEmail = async (email, password) => {
    if (!email || !password) throw new Error('MISSING_FIELDS')

    isLoading.value = true
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await syncUserToFirestore(userCredential.user)
      return userCredential.user
    } finally {
      isLoading.value = false
    }
  }

  // Email/password signup
  const signupWithEmail = async (email, password, confirmPassword) => {
    if (!email || !password || !confirmPassword) throw new Error('MISSING_FIELDS')
    if (password !== confirmPassword) throw new Error('PASSWORD_MISMATCH')
    if (password.length < 6) throw new Error('WEAK_PASSWORD')

    isLoading.value = true
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await syncUserToFirestore(userCredential.user)
      return userCredential.user
    } finally {
      isLoading.value = false
    }
  }

  // Social login helper
  const handleSocialLogin = async (provider) => {
    isLoading.value = true
    try {
      const result = await signInWithPopup(auth, provider)
      await syncUserToFirestore(result.user)
      return result.user
    } finally {
      isLoading.value = false
    }
  }

  // Google login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    return handleSocialLogin(provider)
  }

  // Facebook login
  const loginWithFacebook = async () => {
    const provider = new FacebookAuthProvider()
    provider.addScope('email')
    provider.addScope('public_profile')
    provider.setCustomParameters({ 'display': 'popup' })
    return handleSocialLogin(provider)
  }

  // Password reset
  const resetPassword = async (email) => {
    if (!email) throw new Error('MISSING_EMAIL')
    
    isLoading.value = true
    try {
      await sendPasswordResetEmail(auth, email)
    } finally {
      isLoading.value = false
    }
  }

  // Logout
  const logout = async () => {
    isLoading.value = true
    try {
      await signOut(auth)
    } finally {
      isLoading.value = false
    }
  }

  // Auth state listener
  const initAuthListener = () => {
    unsubscribe = onAuthStateChanged(auth, (authUser) => {
      user.value = authUser
      if (authUser) syncUserToFirestore(authUser)
    })
  }

  onMounted(initAuthListener)
  onUnmounted(() => unsubscribe?.())

  return {
    user,
    isLoading,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    loginWithFacebook,
    resetPassword,
    logout
  }
}