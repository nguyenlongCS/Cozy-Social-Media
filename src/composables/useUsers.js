/*
src/composables/useUsers.js - Refactored
Users collection management với smart avatar handling
Logic: CRUD operations với avatar preservation và data sync integration
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useDataSync } from './useDataSync'

const db = getFirestore(app, 'social-media-db')

export function useUsers() {
  const isLoading = ref(false)
  const error = ref(null)
  const { syncUserDataAcrossCollections, isSyncing } = useDataSync()

  // Smart sync user từ Firebase Auth
  const syncUserToFirestore = async (firebaseUser) => {
    if (!firebaseUser) {
      throw new Error('NO_USER_PROVIDED')
    }

    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const existingDoc = await getDoc(userRef)

      if (existingDoc.exists()) {
        const existingData = existingDoc.data()
        
        // Update data với smart avatar handling
        const updateData = {
          SignedIn: new Date(),
          Email: firebaseUser.email || existingData.Email
        }

        // Chỉ update avatar nếu user chưa có custom avatar
        const hasCustomAvatar = existingData.HasCustomAvatar === true
        const hasNoAvatar = !existingData.Avatar

        if (!hasCustomAvatar && (hasNoAvatar || firebaseUser.photoURL)) {
          updateData.Avatar = firebaseUser.photoURL || existingData.Avatar
        }
        
        await setDoc(userRef, updateData, { merge: true })
        return existingData
      }

      // Create new user
      const provider = getProviderFromFirebaseUser(firebaseUser)
      const newUserData = {
        UserID: firebaseUser.uid,
        UserName: firebaseUser.displayName || 'NoName',
        Email: firebaseUser.email || null,
        Provider: provider,
        Created: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        SignedIn: new Date(),
        Avatar: firebaseUser.photoURL || null,
        HasCustomAvatar: false,
        Bio: null,
        Gender: null
      }

      await setDoc(userRef, newUserData)
      return newUserData

    } catch (err) {
      return null
    }
  }

  // Helper function to determine provider
  const getProviderFromFirebaseUser = (firebaseUser) => {
    if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
      const providerId = firebaseUser.providerData[0].providerId
      if (providerId === 'google.com') return 'google'
      if (providerId === 'facebook.com') return 'facebook'
    }
    return 'email'
  }

  // Get user by ID
  const getUserById = async (userId) => {
    if (!userId) {
      throw new Error('NO_USER_ID_PROVIDED')
    }

    isLoading.value = true
    error.value = null

    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        return null
      }

      return {
        id: userDoc.id,
        ...userDoc.data()
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get users with pagination
  const getUsers = async (limitCount = 20) => {
    isLoading.value = true
    error.value = null

    try {
      const usersCollection = collection(db, 'users')
      const q = query(
        usersCollection,
        orderBy('Created', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const users = []
      
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return users
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update user profile với data sync
  const updateUserProfile = async (userId, profileData) => {
    if (!userId || !profileData) {
      throw new Error('MISSING_USER_OR_PROFILE_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      // Get current user data
      const currentUserData = await getUserById(userId)
      if (!currentUserData) {
        throw new Error('USER_NOT_FOUND')
      }

      const userRef = doc(db, 'users', userId)
      
      // Prepare update data
      const updateData = {
        ...profileData,
        UpdatedAt: new Date()
      }

      // Mark custom avatar if uploaded
      if (profileData.Avatar !== undefined) {
        updateData.HasCustomAvatar = true
      }

      // Update user profile
      await setDoc(userRef, updateData, { merge: true })

      // Check if data sync needed
      const needsSync = shouldSyncData(currentUserData, updateData)
      
      if (needsSync.shouldSync) {
        // Background sync - không chờ để không chậm UX
        syncUserDataAcrossCollections(userId, needsSync.changes).catch(() => {
          // Silent fail
        })
      }

      return await getUserById(userId)
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Helper to check if sync needed
  const shouldSyncData = (currentData, newData) => {
    const changes = {}
    let shouldSync = false

    if (newData.UserName && newData.UserName !== currentData.UserName) {
      changes.UserName = newData.UserName
      shouldSync = true
    }

    if (newData.hasOwnProperty('Avatar') && newData.Avatar !== currentData.Avatar) {
      changes.Avatar = newData.Avatar
      shouldSync = true
    }

    return { shouldSync, changes }
  }

  // Search users by name
  const searchUsersByName = async (searchTerm, limitCount = 10) => {
    if (!searchTerm) return []

    isLoading.value = true
    error.value = null

    try {
      const usersCollection = collection(db, 'users')
      const q = query(
        usersCollection,
        where('UserName', '>=', searchTerm),
        where('UserName', '<=', searchTerm + '\uf8ff'),
        orderBy('UserName'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const users = []
      
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return users
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    isSyncing,
    error,
    syncUserToFirestore,
    getUserById,
    getUsers,
    updateUserProfile,
    searchUsersByName
  }
}