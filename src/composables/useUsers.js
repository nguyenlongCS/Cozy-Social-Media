/*
src/composables/useUsers.js
Composable quản lý users collection trên Firestore
Logic:
- Sync user data từ Firebase Auth vào Firestore collection "users"
- Tạo/cập nhật user document khi đăng nhập thành công
- Mapping các field từ Firebase Auth sang Firestore với đầy đủ thông tin
- Handle các provider khác nhau (email, google, facebook)
- Cung cấp methods để query user data từ Firestore
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

  // Generate random username 6 characters (letters + numbers)
  const generateRandomUsername = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Sync user từ Firebase Auth vào Firestore collection "users"
  const syncUserToFirestore = async (firebaseUser) => {
    if (!firebaseUser) {
      throw new Error('NO_USER_PROVIDED')
    }

    try {
      // Xác định provider từ providerData
      let provider = 'email'
      if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
        const providerId = firebaseUser.providerData[0].providerId
        if (providerId === 'google.com') {
          provider = 'google'
        } else if (providerId === 'facebook.com') {
          provider = 'facebook'
        }
      }

      // Chuẩn bị user data để lưu vào Firestore
      const userData = {
        UserID: firebaseUser.uid,
        UserName: firebaseUser.displayName || generateRandomUsername(),
        Email: firebaseUser.email || null,
        Provider: provider,
        Created: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        SignedIn: new Date(),
        Avatar: firebaseUser.photoURL || null,
        Bio: null,
        Gender: null,
        UpdatedAt: new Date()
      }

      // Sử dụng merge: true để không ghi đè dữ liệu có sẵn
      const userRef = doc(db, 'users', firebaseUser.uid)
      await setDoc(userRef, userData, { merge: true })

      console.log('User synced to Firestore:', firebaseUser.uid)
      return userData

    } catch (err) {
      console.error('Error syncing user to Firestore:', err)
      // Không throw error để không làm fail login process
      return null
    }
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
        return null
      }

      return {
        id: userDoc.id,
        ...userDoc.data()
      }
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

  // Update user profile (Bio, Gender, etc.)
  const updateUserProfile = async (userId, profileData) => {
    if (!userId || !profileData) {
      throw new Error('MISSING_USER_OR_PROFILE_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      const userRef = doc(db, 'users', userId)
      const updateData = {
        ...profileData,
        UpdatedAt: new Date()
      }

      await updateDoc(userRef, updateData)
      console.log('User profile updated:', userId)

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