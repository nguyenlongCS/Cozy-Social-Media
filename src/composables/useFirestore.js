/*
src/composables/useFirestore.js - Updated with Users Integration
Composable quản lý Firestore và Storage với tích hợp users collection
Logic:
- Posts: Tự động populate author info từ users collection
- Likes: Track users đã like với references đến users collection
- Comments: Populate comment author info từ users collection
- Users: Integration với useUsers composable cho user data consistency
- Centralize logic tương tác với Firebase Firestore và Storage
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  query,
  limit,
  where,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage'
import app from '@/firebase/config'
import { useUsers } from './useUsers'

// Initialize Firestore và Storage
const db = getFirestore(app, 'social-media-db')
const storage = getStorage(app)

export function useFirestore() {
  const isLoading = ref(false)
  const error = ref(null)
  const { getUserById } = useUsers()

  // Helper function để populate author info từ users collection
  const populateAuthorInfo = async (authorId) => {
    try {
      const userData = await getUserById(authorId)
      if (userData) {
        return {
          authorName: userData.UserName || userData.Email || 'Unknown User',
          authorEmail: userData.Email,
          authorAvatar: userData.Avatar
        }
      }
    } catch (err) {
      console.error('Error fetching author info:', err)
    }
    
    // Fallback nếu không tìm thấy user trong collection
    return {
      authorName: 'Unknown User',
      authorEmail: null,
      authorAvatar: null
    }
  }

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

  // Tạo post mới trong Firestore với author info từ users collection
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

      // Get author info từ users collection
      const authorInfo = await populateAuthorInfo(postData.authorId)

      // Add post to Firestore collection 'posts'
      const postsCollection = collection(db, 'posts')
      const postToSave = {
        ...postData,
        // Override author info với data từ users collection
        authorName: authorInfo.authorName,
        authorEmail: authorInfo.authorEmail,
        authorAvatar: authorInfo.authorAvatar,
        createdAt: postData.createdAt || new Date(),
        updatedAt: new Date(),
        likes: postData.likes || 0,
        likedBy: [] // Array để track users đã like
      }

      const docRef = await addDoc(postsCollection, postToSave)

      console.log('Post created with author info:', {
        postId: docRef.id,
        authorId: postData.authorId,
        authorName: authorInfo.authorName
      })

      return {
        id: docRef.id,
        ...postToSave
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Lấy danh sách posts từ Firestore với populated author info
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
      
      // Process posts và populate author info nếu cần
      for (const docSnap of querySnapshot.docs) {
        const postData = docSnap.data()
        
        // Nếu post chưa có đầy đủ author info, populate từ users collection
        if (!postData.authorName && postData.authorId) {
          const authorInfo = await populateAuthorInfo(postData.authorId)
          postData.authorName = authorInfo.authorName
          postData.authorEmail = authorInfo.authorEmail
          postData.authorAvatar = authorInfo.authorAvatar
        }
        
        posts.push({
          id: docSnap.id,
          ...postData
        })
      }

      return posts
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update likes cho một post với logic like/unlike hoàn chỉnh
  const updatePostLikes = async (postId, newLikeCount, userId, isLiking) => {
    if (!postId || !userId) {
      throw new Error('MISSING_POST_OR_USER_ID')
    }

    try {
      console.log('Updating post likes:', {
        postId,
        newLikeCount,
        userId,
        isLiking
      })

      const postRef = doc(db, 'posts', postId)
      
      // Kiểm tra post hiện tại để đảm bảo data consistency
      const postDoc = await getDoc(postRef)
      if (!postDoc.exists()) {
        throw new Error('POST_NOT_FOUND')
      }

      const postData = postDoc.data()
      const currentLikedBy = postData.likedBy || []
      
      // Kiểm tra trạng thái like hiện tại để tránh duplicate
      const isCurrentlyLiked = currentLikedBy.includes(userId)
      
      if (isLiking && isCurrentlyLiked) {
        console.log('User already liked this post')
        return { success: true, likes: postData.likes || 0 }
      }
      
      if (!isLiking && !isCurrentlyLiked) {
        console.log('User has not liked this post yet')
        return { success: true, likes: postData.likes || 0 }
      }

      // Chuẩn bị update data
      const updateData = {
        likes: newLikeCount,
        updatedAt: new Date()
      }

      // Sử dụng Firestore array operations để đảm bảo atomic operations
      if (isLiking) {
        updateData.likedBy = arrayUnion(userId)
      } else {
        updateData.likedBy = arrayRemove(userId)
      }

      // Thực hiện update
      await updateDoc(postRef, updateData)

      console.log('Post likes updated successfully:', {
        postId,
        newLikeCount,
        isLiking
      })

      return { success: true, likes: newLikeCount }
    } catch (err) {
      console.error('Error updating post likes:', err)
      error.value = err
      throw err
    }
  }

  // Thêm comment cho một post với populated author info
  const addComment = async (commentData) => {
    if (!commentData || !commentData.postId || !commentData.text || !commentData.authorId) {
      throw new Error('MISSING_COMMENT_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      // Get author info từ users collection
      const authorInfo = await populateAuthorInfo(commentData.authorId)

      // Add comment to 'comments' collection với populated author info
      const commentsCollection = collection(db, 'comments')
      const commentToSave = {
        ...commentData,
        // Override author info với data từ users collection
        authorName: authorInfo.authorName,
        authorEmail: authorInfo.authorEmail,
        authorAvatar: authorInfo.authorAvatar,
        createdAt: commentData.createdAt || new Date()
      }

      const docRef = await addDoc(commentsCollection, commentToSave)

      console.log('Comment added to Firestore with populated author info:', {
        commentId: docRef.id,
        authorId: commentData.authorId,
        authorName: authorInfo.authorName
      })

      // Return complete comment data with ID
      return {
        id: docRef.id,
        ...commentToSave
      }
    } catch (err) {
      error.value = err
      console.error('Error in addComment:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Lấy comments cho một post với populated author info
  const getPostComments = async (postId) => {
    if (!postId) {
      return [] // Return empty array thay vì throw error
    }

    try {
      console.log('Fetching comments for postId:', postId)
      
      const commentsCollection = collection(db, 'comments')
      const q = query(
        commentsCollection,
        where('postId', '==', postId)
      )
      
      const querySnapshot = await getDocs(q)
      const comments = []
      
      // Process comments và populate author info nếu cần
      for (const docSnap of querySnapshot.docs) {
        const commentData = docSnap.data()
        
        // Nếu comment chưa có đầy đủ author info, populate từ users collection
        if (!commentData.authorName && commentData.authorId) {
          const authorInfo = await populateAuthorInfo(commentData.authorId)
          commentData.authorName = authorInfo.authorName
          commentData.authorEmail = authorInfo.authorEmail
          commentData.authorAvatar = authorInfo.authorAvatar
        }
        
        const processedComment = {
          id: docSnap.id,
          ...commentData
        }
        
        comments.push(processedComment)
        console.log('Comment loaded with author info:', processedComment)
      }

      // Sort comments theo createdAt trong code thay vì Firestore query
      comments.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateA - dateB // Comments cũ trước, mới sau
      })

      console.log('Total comments loaded with author info:', comments.length)
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