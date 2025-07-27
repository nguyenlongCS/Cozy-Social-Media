/*
src/composables/useFirestore.js - Updated
Composable quản lý Firestore và Storage
Centralize logic tương tác với Firebase Firestore để lưu posts và Firebase Storage để upload media
Added: Comments and Likes functionality
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  limit,
  where
} from 'firebase/firestore'
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage'
import app from '@/firebase/config'

// Initialize Firestore và Storage
const db = getFirestore(app, 'social-media-db')
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
        updatedAt: new Date(),
        likes: postData.likes || 0,
        likedBy: [] // Array để track users đã like
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

  // Update likes cho một post
  const updatePostLikes = async (postId, newLikeCount, userId, isLiking) => {
    if (!postId || !userId) {
      throw new Error('MISSING_POST_OR_USER_ID')
    }

    try {
      const postRef = doc(db, 'posts', postId)
      
      // Lấy current likedBy array
      const currentDoc = await getDocs(query(collection(db, 'posts'), where('__name__', '==', postId)))
      let likedBy = []
      
      if (!currentDoc.empty) {
        likedBy = currentDoc.docs[0].data().likedBy || []
      }

      // Update likedBy array
      if (isLiking) {
        if (!likedBy.includes(userId)) {
          likedBy.push(userId)
        }
      } else {
        likedBy = likedBy.filter(id => id !== userId)
      }

      // Update document
      await updateDoc(postRef, {
        likes: newLikeCount,
        likedBy: likedBy,
        updatedAt: new Date()
      })

      return { success: true, likes: newLikeCount }
    } catch (err) {
      error.value = err
      throw err
    }
  }

  // Thêm comment cho một post
  const addComment = async (commentData) => {
    if (!commentData || !commentData.postId || !commentData.text || !commentData.authorId) {
      throw new Error('MISSING_COMMENT_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      // Add comment to 'comments' collection
      const commentsCollection = collection(db, 'comments')
      const docRef = await addDoc(commentsCollection, {
        ...commentData,
        createdAt: commentData.createdAt || new Date()
      })

      return {
        id: docRef.id,
        ...commentData
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Lấy comments cho một post
  const getPostComments = async (postId) => {
    if (!postId) {
      return [] // Return empty array thay vì throw error
    }

    try {
      const commentsCollection = collection(db, 'comments')
      const q = query(
        commentsCollection,
        where('postId', '==', postId),
        orderBy('createdAt', 'asc') // Comments cũ trước, mới sau
      )
      
      const querySnapshot = await getDocs(q)
      const comments = []
      
      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return comments
    } catch (err) {
      console.error('Error loading comments:', err)
      // Return empty array instead of throwing error
      return []
    }
  }

  return {
    isLoading,
    error,
    uploadMedia,
    createPost,
    getPosts,
    updatePostLikes,
    addComment,
    getPostComments
  }
}