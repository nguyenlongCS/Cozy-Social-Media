/*
src/composables/useUsers.js - Fixed Sync Logic
Composable quản lý users collection trên Firestore
Logic:
- FIX: Sử dụng merge: true để không ghi đè toàn bộ document
- Chỉ sync các field cơ bản từ Firebase Auth
- Không ghi đè UserName, Bio, Gender đã được user cập nhật
- Smart sync: kiểm tra existing data trước khi sync
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

// Initialize Firestore với cùng database name như useFirestore
const db = getFirestore(app, 'social-media-db')

export function useUsers() {
  const isLoading = ref(false)
  const error = ref(null)

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
        
        // Chỉ update SignedIn timestamp và các field auth cơ bản
        const updateData = {
          SignedIn: new Date(),
          Email: firebaseUser.email || existingData.Email,
          Avatar: firebaseUser.photoURL || existingData.Avatar
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

  // Update user profile - CHỈ update fields user muốn thay đổi
  const updateUserProfile = async (userId, profileData) => {
    if (!userId || !profileData) {
      throw new Error('MISSING_USER_OR_PROFILE_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      const userRef = doc(db, 'users', userId)
      
      // Chuẩn bị update data với timestamp
      const updateData = {
        ...profileData,
        UpdatedAt: new Date()
      }

      // Sử dụng merge: true để chỉ update fields được chỉ định
      await setDoc(userRef, updateData, { merge: true })
      console.log('User profile updated successfully:', userId, updateData)

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

  return {
    isLoading,
    error,
    syncUserToFirestore,
    getUserById,
    getUserByEmail,
    getUsers,
    updateUserProfile,
    searchUsersByName
  }
}