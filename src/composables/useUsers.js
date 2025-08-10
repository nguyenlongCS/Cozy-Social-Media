/*
src/composables/useUsers.js - Refactored
Quản lý users collection với smart avatar handling và data sync
Logic: CRUD operations với avatar preservation và sync integration
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
  const { syncUserDataAcrossCollections, isSyncing } = useDataSync()

  // Helper: get provider from Firebase user
  const getProviderFromFirebaseUser = (firebaseUser) => {
    if (firebaseUser.providerData?.length > 0) {
      const providerId = firebaseUser.providerData[0].providerId
      if (providerId === 'google.com') return 'google'
      if (providerId === 'facebook.com') return 'facebook'
    }
    return 'email'
  }

  // Sync user to Firestore with smart avatar handling
  const syncUserToFirestore = async (firebaseUser) => {
    if (!firebaseUser) throw new Error('NO_USER_PROVIDED')

    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const existingDoc = await getDoc(userRef)

      if (existingDoc.exists()) {
        const existingData = existingDoc.data()
        
        const updateData = {
          SignedIn: new Date(),
          Email: firebaseUser.email || existingData.Email
        }

        // Smart avatar handling
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
    } catch {
      return null
    }
  }

  // Get user by ID
  const getUserById = async (userId) => {
    if (!userId) throw new Error('NO_USER_ID_PROVIDED')

    isLoading.value = true
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) return null

      return { id: userDoc.id, ...userDoc.data() }
    } finally {
      isLoading.value = false
    }
  }

  // Get users with pagination
  const getUsers = async (limitCount = 20) => {
    isLoading.value = true
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('Created', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const users = []
      
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() })
      })

      return users
    } finally {
      isLoading.value = false
    }
  }

  // Helper: check if data sync needed
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

  // Update user profile with data sync
  const updateUserProfile = async (userId, profileData) => {
    if (!userId || !profileData) throw new Error('MISSING_USER_OR_PROFILE_DATA')

    isLoading.value = true
    try {
      const currentUserData = await getUserById(userId)
      if (!currentUserData) throw new Error('USER_NOT_FOUND')

      const userRef = doc(db, 'users', userId)
      
      const updateData = {
        ...profileData,
        UpdatedAt: new Date()
      }

      // Mark custom avatar if uploaded
      if (profileData.Avatar !== undefined) {
        updateData.HasCustomAvatar = true
      }

      await setDoc(userRef, updateData, { merge: true })

      // Background sync if needed
      const needsSync = shouldSyncData(currentUserData, updateData)
      if (needsSync.shouldSync) {
        syncUserDataAcrossCollections(userId, needsSync.changes).catch(() => {})
      }

      return await getUserById(userId)
    } finally {
      isLoading.value = false
    }
  }

  // Search users by name
  const searchUsersByName = async (searchTerm, limitCount = 10) => {
    if (!searchTerm) return []

    isLoading.value = true
    try {
      const q = query(
        collection(db, 'users'),
        where('UserName', '>=', searchTerm),
        where('UserName', '<=', searchTerm + '\uf8ff'),
        orderBy('UserName'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const users = []
      
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() })
      })

      return users
    } catch {
      return []
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    isSyncing,
    syncUserToFirestore,
    getUserById,
    getUsers,
    updateUserProfile,
    searchUsersByName
  }
}