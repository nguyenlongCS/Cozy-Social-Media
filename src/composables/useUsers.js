/*
src/composables/useUsers.js - Fixed Avatar Override Logic
Composable quản lý users collection với smart avatar handling
Logic:
- FIX: Không ghi đè avatar đã được user tùy chỉnh
- Smart avatar sync: chỉ sync từ Firebase Auth khi user chưa có custom avatar
- Preserve user customizations và ưu tiên custom avatar
- Track HasCustomAvatar flag để phân biệt custom vs default avatar
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
  limit,
  updateDoc
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useDataSync } from './useDataSync'

// Initialize Firestore với cùng database name như useFirestore
const db = getFirestore(app, 'social-media-db')

export function useUsers() {
  const isLoading = ref(false)
  const error = ref(null)
  const { syncUserDataAcrossCollections, isSyncing } = useDataSync()

  // Smart sync user từ Firebase Auth vào Firestore collection "users"
  const syncUserToFirestore = async (firebaseUser) => {
    if (!firebaseUser) {
      throw new Error('NO_USER_PROVIDED')
    }

    try {
      // Kiểm tra xem user đã tồn tại chưa
      const userRef = doc(db, 'users', firebaseUser.uid)
      const existingDoc = await getDoc(userRef)

      if (existingDoc.exists()) {
        const existingData = existingDoc.data()
        console.log('User already exists in Firestore:', firebaseUser.uid)
        
        // SMART AVATAR HANDLING: Chỉ update avatar nếu user chưa có custom avatar
        const updateData = {
          SignedIn: new Date(),
          Email: firebaseUser.email || existingData.Email
        }

        // Chỉ update avatar từ Firebase Auth nếu:
        // 1. User chưa có custom avatar (HasCustomAvatar !== true)
        // 2. Hoặc user chưa có avatar nào cả
        const hasCustomAvatar = existingData.HasCustomAvatar === true
        const hasNoAvatar = !existingData.Avatar

        if (!hasCustomAvatar && (hasNoAvatar || firebaseUser.photoURL)) {
          updateData.Avatar = firebaseUser.photoURL || existingData.Avatar
          console.log('Updated avatar from Firebase Auth (no custom avatar detected)')
        } else {
          console.log('Preserving custom avatar - not overriding with Firebase Auth avatar')
        }
        
        // Chỉ update nếu có thay đổi thật sự
        await setDoc(userRef, updateData, { merge: true })
        console.log('Updated sign-in time and auth fields only')
        
        return existingData
      }

      // User chưa tồn tại - tạo mới với full data
      const provider = getProviderFromFirebaseUser(firebaseUser)
      
      const newUserData = {
        UserID: firebaseUser.uid,
        UserName: firebaseUser.displayName || 'NoName',
        Email: firebaseUser.email || null,
        Provider: provider,
        Created: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        SignedIn: new Date(),
        Avatar: firebaseUser.photoURL || null,
        HasCustomAvatar: false, // Đánh dấu đây là avatar từ Firebase Auth
        Bio: null,
        Gender: null
      }

      await setDoc(userRef, newUserData)
      console.log('Created new user in Firestore:', firebaseUser.uid)
      return newUserData

    } catch (err) {
      console.error('Error syncing user to Firestore:', err)
      // Không throw error để không làm fail login process
      return null
    }
  }

  // Helper function để xác định provider
  const getProviderFromFirebaseUser = (firebaseUser) => {
    if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
      const providerId = firebaseUser.providerData[0].providerId
      if (providerId === 'google.com') return 'google'
      if (providerId === 'facebook.com') return 'facebook'
    }
    return 'email'
  }

  // Get user by ID từ Firestore
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
        console.log('User not found in Firestore:', userId)
        return null
      }

      const userData = {
        id: userDoc.id,
        ...userDoc.data()
      }

      console.log('User loaded from Firestore:', userData)
      return userData
    } catch (err) {
      console.error('Error getting user by ID:', err)
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get user by email từ Firestore
  const getUserByEmail = async (email) => {
    if (!email) {
      throw new Error('NO_EMAIL_PROVIDED')
    }

    isLoading.value = true
    error.value = null

    try {
      const usersCollection = collection(db, 'users')
      const q = query(usersCollection, where('Email', '==', email), limit(1))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const userDoc = querySnapshot.docs[0]
      return {
        id: userDoc.id,
        ...userDoc.data()
      }
    } catch (err) {
      console.error('Error getting user by email:', err)
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get all users với pagination
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
      console.error('Error getting users:', err)
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update user profile với tích hợp data sync và smart avatar handling
  const updateUserProfile = async (userId, profileData) => {
    if (!userId || !profileData) {
      throw new Error('MISSING_USER_OR_PROFILE_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      // Get current user data trước khi update
      const currentUserData = await getUserById(userId)
      if (!currentUserData) {
        throw new Error('USER_NOT_FOUND')
      }

      const userRef = doc(db, 'users', userId)
      
      // Chuẩn bị update data với timestamp
      const updateData = {
        ...profileData,
        UpdatedAt: new Date()
      }

      // SMART AVATAR HANDLING: Nếu user upload custom avatar
      if (profileData.Avatar !== undefined) {
        updateData.HasCustomAvatar = true // Đánh dấu đây là custom avatar
        console.log('User uploaded custom avatar - marking HasCustomAvatar = true')
      }

      // Update user profile trong users collection
      await setDoc(userRef, updateData, { merge: true })
      console.log('User profile updated successfully:', userId, updateData)

      // Kiểm tra xem có cần sync data không (avatar hoặc username thay đổi)
      const needsSync = shouldSyncData(currentUserData, updateData)
      
      if (needsSync.shouldSync) {
        console.log('Profile changes detected, starting data sync:', needsSync.changes)
        
        try {
          // Sync data across collections trong background
          // Không chờ sync hoàn thành để không làm chậm UX
          syncUserDataAcrossCollections(userId, needsSync.changes)
            .then((result) => {
              console.log('Background sync completed:', result)
            })
            .catch((syncError) => {
              console.error('Background sync failed:', syncError)
              // Log lỗi nhưng không throw để không ảnh hưởng đến profile update
            })
        } catch (syncError) {
          console.error('Error initiating data sync:', syncError)
          // Log warning nhưng không fail profile update
        }
      } else {
        console.log('No data sync needed - no relevant changes detected')
      }

      // Return updated user data
      return await getUserById(userId)
    } catch (err) {
      console.error('Error updating user profile:', err)
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Helper function để kiểm tra có cần sync data không
  const shouldSyncData = (currentData, newData) => {
    const changes = {}
    let shouldSync = false

    // Check username change
    if (newData.UserName && newData.UserName !== currentData.UserName) {
      changes.UserName = newData.UserName
      shouldSync = true
    }

    // Check avatar change (bao gồm cả trường hợp set null)
    if (newData.hasOwnProperty('Avatar') && newData.Avatar !== currentData.Avatar) {
      changes.Avatar = newData.Avatar
      shouldSync = true
    }

    return { shouldSync, changes }
  }

  // Search users by name
  const searchUsersByName = async (searchTerm, limitCount = 10) => {
    if (!searchTerm) {
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const usersCollection = collection(db, 'users')
      // Firestore không hỗ trợ full-text search, sử dụng range query cho startsWith
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
      console.error('Error searching users:', err)
      error.value = err
      // Return empty array thay vì throw error để không break UI
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Force sync user data (for admin/debugging)
  const forceSyncUserData = async (userId) => {
    try {
      const userData = await getUserById(userId)
      if (!userData) {
        throw new Error('USER_NOT_FOUND')
      }

      const syncData = {
        UserName: userData.UserName,
        Avatar: userData.Avatar
      }

      return await syncUserDataAcrossCollections(userId, syncData)
    } catch (err) {
      console.error('Error force syncing user data:', err)
      throw err
    }
  }

  // Reset HasCustomAvatar flag (for admin/debugging)
  const resetCustomAvatarFlag = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      await setDoc(userRef, { 
        HasCustomAvatar: false,
        UpdatedAt: new Date()
      }, { merge: true })
      
      console.log('Reset HasCustomAvatar flag for user:', userId)
      return true
    } catch (err) {
      console.error('Error resetting custom avatar flag:', err)
      throw err
    }
  }

  return {
    isLoading,
    isSyncing, // Expose sync status
    error,
    syncUserToFirestore,
    getUserById,
    getUserByEmail,
    getUsers,
    updateUserProfile,
    searchUsersByName,
    forceSyncUserData,
    resetCustomAvatarFlag
  }
}