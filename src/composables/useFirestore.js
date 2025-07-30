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
  deleteDoc,
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
import { useUsers } from './useUsers'

// Initialize Firestore và Storage
const db = getFirestore(app, 'social-media-db')
const storage = getStorage(app)

export function useFirestore() {
  const isLoading = ref(false)
  const error = ref(null)
  const { getUserById } = useUsers()

  // Helper function để populate user info từ users collection
  const populateUserInfo = async (userId) => {
    try {
      const userData = await getUserById(userId)
      if (userData) {
        return {
          UserName: userData.UserName || 'Unknown User',
          Avatar: userData.Avatar || null
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err)
    }
    
    // Fallback nếu không tìm thấy user trong collection
    return {
      UserName: 'Unknown User',
      Avatar: null
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

  // Tạo post mới trong Firestore với user info từ users collection
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

      // Get user info từ users collection
      const userInfo = await populateUserInfo(postData.authorId)

      // Add post to Firestore collection 'posts'
      const postsCollection = collection(db, 'posts')
      const postToSave = {
        // PostID sẽ được auto-generated bởi Firestore
        UserID: postData.authorId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Caption: postData.caption.trim(),
        Created: postData.createdAt || new Date(),
        MediaType: postData.mediaType || null,
        MediaURL: postData.mediaUrl || null,
        likes: 0,
        comments: 0
      }

      const docRef = await addDoc(postsCollection, postToSave)

      console.log('Post created with user info:', {
        PostID: docRef.id,
        UserID: postData.authorId,
        UserName: userInfo.UserName
      })

      return {
        PostID: docRef.id,
        ...postToSave
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Lấy danh sách posts từ Firestore với populated user info
  const getPosts = async (limitCount = 10) => {
    isLoading.value = true
    error.value = null

    try {
      const postsCollection = collection(db, 'posts')
      const q = query(
        postsCollection, 
        orderBy('Created', 'desc'), 
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const posts = []
      
      // Process posts và populate user info nếu cần
      for (const docSnap of querySnapshot.docs) {
        const postData = docSnap.data()
        
        // Nếu post chưa có đầy đủ user info, populate từ users collection
        if (!postData.UserName && postData.UserID) {
          const userInfo = await populateUserInfo(postData.UserID)
          postData.UserName = userInfo.UserName
          postData.Avatar = userInfo.Avatar
        }
        
        posts.push({
          PostID: docSnap.id,
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

  // Check if user has liked a post
  const checkUserLikedPost = async (postId, userId) => {
    try {
      const likesCollection = collection(db, 'likes')
      const existingLikeQuery = query(
        likesCollection,
        where('PostID', '==', postId),
        where('UserID', '==', userId),
        limit(1)
      )
      
      const existingLikeSnapshot = await getDocs(existingLikeQuery)
      return !existingLikeSnapshot.empty
    } catch (err) {
      console.error('Error checking user like:', err)
      return false
    }
  }

  // Get all posts user has liked (for UI state management)
  const getUserLikedPosts = async (userId) => {
    try {
      const likesCollection = collection(db, 'likes')
      const userLikesQuery = query(
        likesCollection,
        where('UserID', '==', userId)
      )
      
      const userLikesSnapshot = await getDocs(userLikesQuery)
      const likedPostIds = []
      
      userLikesSnapshot.forEach((doc) => {
        likedPostIds.push(doc.data().PostID)
      })
      
      return likedPostIds
    } catch (err) {
      console.error('Error getting user liked posts:', err)
      return []
    }
  }
  // Add like vào likes collection và update post likes count
  const addLike = async (postId, userId) => {
    if (!postId || !userId) {
      throw new Error('MISSING_POST_OR_USER_ID')
    }

    try {
      // Check if user already liked this post - STRICT CHECK
      const alreadyLiked = await checkUserLikedPost(postId, userId)
      if (alreadyLiked) {
        console.log('User already liked this post - cannot like again')
        return { success: false, alreadyLiked: true, message: 'ALREADY_LIKED' }
      }

      // Get user info
      const userInfo = await populateUserInfo(userId)

      // Add like to likes collection
      const likeData = {
        // LikeID sẽ được auto-generated bởi Firestore
        PostID: postId,
        UserID: userId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Created: new Date()
      }

      await addDoc(collection(db, 'likes'), likeData)

      // Update post likes count
      await updatePostLikesCount(postId, 1)

      console.log('Like added successfully:', { postId, userId })
      return { success: true, alreadyLiked: false }

    } catch (err) {
      console.error('Error adding like:', err)
      throw err
    }
  }

  // Remove like từ likes collection và update post likes count  
  const removeLike = async (postId, userId) => {
    if (!postId || !userId) {
      throw new Error('MISSING_POST_OR_USER_ID')
    }

    try {
      // Find existing like
      const likesCollection = collection(db, 'likes')
      const existingLikeQuery = query(
        likesCollection,
        where('PostID', '==', postId),
        where('UserID', '==', userId),
        limit(1)
      )
      
      const existingLikeSnapshot = await getDocs(existingLikeQuery)
      if (existingLikeSnapshot.empty) {
        console.log('User has not liked this post')
        return { success: false, wasNotLiked: true, message: 'NOT_LIKED' }
      }

      // Delete like document
      const likeDoc = existingLikeSnapshot.docs[0]
      await deleteDoc(doc(db, 'likes', likeDoc.id))

      // Update post likes count
      await updatePostLikesCount(postId, -1)

      console.log('Like removed successfully:', { postId, userId })
      return { success: true, wasNotLiked: false }

    } catch (err) {
      console.error('Error removing like:', err)
      throw err
    }
  }

  // Helper function để update likes count trong posts
  const updatePostLikesCount = async (postId, increment) => {
    const postRef = doc(db, 'posts', postId)
    const postDoc = await getDoc(postRef)
    
    if (postDoc.exists()) {
      const currentLikes = postDoc.data().likes || 0
      const newLikes = Math.max(0, currentLikes + increment)
      await updateDoc(postRef, { likes: newLikes })
    }
  }
  const togglePostLike = async (postId, userId) => {
    // Check current like status
    const isLiked = await checkUserLikedPost(postId, userId)

    if (isLiked) {
      // User đã like -> unlike
      return await removeLike(postId, userId)
    } else {
      // User chưa like -> like (chỉ được 1 lần)
      return await addLike(postId, userId)
    }
  }

  // Thêm comment cho một post với user info từ users collection
  const addComment = async (commentData) => {
    if (!commentData || !commentData.postId || !commentData.text || !commentData.authorId) {
      throw new Error('MISSING_COMMENT_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      // Get user info từ users collection
      const userInfo = await populateUserInfo(commentData.authorId)

      // Add comment to 'comments' collection
      const commentsCollection = collection(db, 'comments')
      const commentToSave = {
        // CommentID sẽ được auto-generated bởi Firestore
        PostID: commentData.postId,
        UserID: commentData.authorId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Created: commentData.createdAt || new Date(),
        Content: commentData.text.trim()
      }

      const docRef = await addDoc(commentsCollection, commentToSave)

      // Update post comments count
      await updatePostCommentsCount(commentData.postId, 1)

      console.log('Comment added with user info:', {
        CommentID: docRef.id,
        PostID: commentData.postId,
        UserID: commentData.authorId,
        UserName: userInfo.UserName
      })

      // Return complete comment data with ID
      return {
        CommentID: docRef.id,
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

  // Helper function để update comments count trong posts
  const updatePostCommentsCount = async (postId, increment) => {
    const postRef = doc(db, 'posts', postId)
    const postDoc = await getDoc(postRef)
    
    if (postDoc.exists()) {
      const currentComments = postDoc.data().comments || 0
      const newComments = Math.max(0, currentComments + increment)
      await updateDoc(postRef, { comments: newComments })
    }
  }

  // Lấy comments cho một post với user info từ users collection
  const getPostComments = async (postId) => {
    if (!postId) {
      return [] // Return empty array thay vì throw error
    }

    try {
      console.log('Fetching comments for PostID:', postId)
      
      const commentsCollection = collection(db, 'comments')
      const q = query(
        commentsCollection,
        where('PostID', '==', postId)
      )
      
      const querySnapshot = await getDocs(q)
      const comments = []
      
      // Process comments và populate user info nếu cần
      for (const docSnap of querySnapshot.docs) {
        const commentData = docSnap.data()
        
        // Nếu comment chưa có đầy đủ user info, populate từ users collection
        if (!commentData.UserName && commentData.UserID) {
          const userInfo = await populateUserInfo(commentData.UserID)
          commentData.UserName = userInfo.UserName
          commentData.Avatar = userInfo.Avatar
        }
        
        const processedComment = {
          CommentID: docSnap.id,
          ...commentData
        }
        
        comments.push(processedComment)
        console.log('Comment loaded with user info:', processedComment)
      }

      // Sort comments theo Created trong code thay vì Firestore query
      comments.sort((a, b) => {
        const dateA = a.Created?.toDate ? a.Created.toDate() : new Date(a.Created)
        const dateB = b.Created?.toDate ? b.Created.toDate() : new Date(b.Created)
        return dateA - dateB // Comments cũ trước, mới sau
      })

      console.log('Total comments loaded with user info:', comments.length)
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
    addLike,
    removeLike,
    togglePostLike,
    checkUserLikedPost,
    getUserLikedPosts,
    addComment,
    getPostComments
  }
}