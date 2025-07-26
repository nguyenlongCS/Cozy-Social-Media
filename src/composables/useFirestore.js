/*
Composable quản lý Firestore và Storage
Centralize logic tương tác với Firebase Firestore để lưu posts và Firebase Storage để upload media
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  orderBy,
  query,
  limit
} from 'firebase/firestore'
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage'
import app from '@/firebase/config'

// Initialize Firestore và Storage
const db = getFirestore(app)
const storage = getStorage(app)

export function useFirestore() {
  const isLoading = ref(false)
  const error = ref(null)

  // Upload media file vào Firebase Storage
  const uploadMedia = async (file, userId) => {
    if (!file || !userId) {
      throw new Error('MISSING_FILE_OR_USER')
    }

    isLoading.value = true
    error.value = null

    try {
      // Tạo unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}_${timestamp}.${fileExtension}`
      
      // Tạo storage reference
      const mediaRef = storageRef(storage, `posts/${fileName}`)
      
      // Upload file
      const snapshot = await uploadBytes(mediaRef, file)
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      return {
        fileName,
        downloadURL,
        size: file.size,
        type: file.type
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Tạo post mới trong Firestore
  const createPost = async (postData) => {
    if (!postData) {
      throw new Error('MISSING_POST_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      // Validate required fields
      if (!postData.caption || !postData.authorId) {
        throw new Error('MISSING_REQUIRED_FIELDS')
      }

      // Add post to Firestore collection 'posts'
      const postsCollection = collection(db, 'posts')
      const docRef = await addDoc(postsCollection, {
        ...postData,
        createdAt: postData.createdAt || new Date(),
        updatedAt: new Date()
      })

      return {
        id: docRef.id,
        ...postData
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Lấy danh sách posts từ Firestore (để hiển thị feed)
  const getPosts = async (limitCount = 10) => {
    isLoading.value = true
    error.value = null

    try {
      const postsCollection = collection(db, 'posts')
      const q = query(
        postsCollection, 
        orderBy('createdAt', 'desc'), 
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const posts = []
      
      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return posts
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    uploadMedia,
    createPost,
    getPosts
  }
}