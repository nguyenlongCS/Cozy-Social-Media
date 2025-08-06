/*
src/composables/useFirestore.js - Refactored
Firestore và Storage operations với simplified classification
Logic: CRUD cho posts, comments, likes với auto-tagging system
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
import { classifyNewPost } from '@/services/postClassificationService'

const db = getFirestore(app, 'social-media-db')
const storage = getStorage(app)

export function useFirestore() {
  const isLoading = ref(false)
  const error = ref(null)
  const { getUserById } = useUsers()

  // Populate user info từ users collection
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
      // Silent fail
    }
    
    return {
      UserName: 'Unknown User',
      Avatar: null
    }
  }

  // Upload avatar vào bucket avatar/
  const uploadAvatar = async (file, userId) => {
    if (!file || !userId) {
      throw new Error('MISSING_FILE_OR_USER')
    }

    isLoading.value = true
    error.value = null

    try {
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}_${timestamp}.${fileExtension}`
      
      const avatarRef = storageRef(storage, `avatar/${fileName}`)
      const snapshot = await uploadBytes(avatarRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      return {
        fileName,
        downloadURL,
        size: file.size,
        type: file.type,
        bucket: 'avatar'
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Upload media vào bucket posts/
  const uploadMedia = async (file, userId) => {
    if (!file || !userId) {
      throw new Error('MISSING_FILE_OR_USER')
    }

    isLoading.value = true
    error.value = null

    try {
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}_${timestamp}.${fileExtension}`
      
      const mediaRef = storageRef(storage, `posts/${fileName}`)
      const snapshot = await uploadBytes(mediaRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      return {
        fileName,
        downloadURL,
        size: file.size,
        type: file.type,
        bucket: 'posts'
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Create post với automatic classification
  const createPost = async (postData) => {
    if (!postData) {
      throw new Error('MISSING_POST_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      if (!postData.caption || !postData.authorId) {
        throw new Error('MISSING_REQUIRED_FIELDS')
      }

      // Get user info
      const userInfo = await populateUserInfo(postData.authorId)

      // Prepare post data
      const postToSave = {
        UserID: postData.authorId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Caption: postData.caption.trim(),
        Created: postData.createdAt || new Date(),
        likes: 0,
        comments: 0,
        Tags: null
      }

      // Handle media
      if (postData.mediaItems?.length > 0) {
        postToSave.mediaItems = postData.mediaItems
        postToSave.mediaCount = postData.mediaItems.length
        postToSave.MediaURL = postData.mediaItems[0].url
        postToSave.MediaType = postData.mediaItems[0].type
      } else {
        postToSave.MediaType = postData.mediaType || null
        postToSave.MediaURL = postData.mediaUrl || null
        postToSave.mediaItems = null
        postToSave.mediaCount = postData.mediaUrl ? 1 : 0
      }

      // Add post to Firestore
      const postsCollection = collection(db, 'posts')
      const docRef = await addDoc(postsCollection, postToSave)

      // Background classification
      classifyNewPost(docRef.id, postData.caption.trim()).catch(() => {
        // Silent fail
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

  // Get posts với populated user info
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
      
      for (const docSnap of querySnapshot.docs) {
        const postData = docSnap.data()
        
        // Populate user info if missing
        if (!postData.UserName && postData.UserID) {
          const userInfo = await populateUserInfo(postData.UserID)
          postData.UserName = userInfo.UserName
          postData.Avatar = userInfo.Avatar
        }
        
        posts.push({
          PostID: docSnap.id,
          ...postData,
          Tags: postData.Tags || []
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

  // Get posts by tags
  const getPostsByTags = async (tags, limitCount = 10) => {
    if (!tags?.length) return []

    isLoading.value = true
    error.value = null

    try {
      const postsCollection = collection(db, 'posts')
      const q = query(
        postsCollection,
        where('Tags', 'array-contains-any', tags),
        orderBy('Created', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const posts = []
      
      querySnapshot.forEach(doc => {
        const postData = doc.data()
        posts.push({
          PostID: doc.id,
          ...postData,
          Tags: postData.Tags || []
        })
      })

      return posts
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Like system
  const checkUserLikedPost = async (postId, userId) => {
    try {
      const likesCollection = collection(db, 'likes')
      const q = query(
        likesCollection,
        where('PostID', '==', postId),
        where('UserID', '==', userId),
        limit(1)
      )
      
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch (err) {
      return false
    }
  }

  const getUserLikedPosts = async (userId) => {
    try {
      const likesCollection = collection(db, 'likes')
      const q = query(likesCollection, where('UserID', '==', userId))
      
      const querySnapshot = await getDocs(q)
      const likedPostIds = []
      
      querySnapshot.forEach((doc) => {
        likedPostIds.push(doc.data().PostID)
      })
      
      return likedPostIds
    } catch (err) {
      return []
    }
  }

  const addLike = async (postId, userId) => {
    if (!postId || !userId) {
      throw new Error('MISSING_POST_OR_USER_ID')
    }

    try {
      const alreadyLiked = await checkUserLikedPost(postId, userId)
      if (alreadyLiked) {
        return { success: false, alreadyLiked: true, message: 'ALREADY_LIKED' }
      }

      const userInfo = await populateUserInfo(userId)

      const likeData = {
        PostID: postId,
        UserID: userId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Created: new Date()
      }

      await addDoc(collection(db, 'likes'), likeData)
      await updatePostLikesCount(postId, 1)

      return { success: true, alreadyLiked: false }
    } catch (err) {
      throw err
    }
  }

  const removeLike = async (postId, userId) => {
    if (!postId || !userId) {
      throw new Error('MISSING_POST_OR_USER_ID')
    }

    try {
      const likesCollection = collection(db, 'likes')
      const q = query(
        likesCollection,
        where('PostID', '==', postId),
        where('UserID', '==', userId),
        limit(1)
      )
      
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) {
        return { success: false, wasNotLiked: true, message: 'NOT_LIKED' }
      }

      const likeDoc = querySnapshot.docs[0]
      await deleteDoc(doc(db, 'likes', likeDoc.id))
      await updatePostLikesCount(postId, -1)

      return { success: true, wasNotLiked: false }
    } catch (err) {
      throw err
    }
  }

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
    const isLiked = await checkUserLikedPost(postId, userId)
    return isLiked ? await removeLike(postId, userId) : await addLike(postId, userId)
  }

  // Comment system
  const addComment = async (commentData) => {
    if (!commentData?.postId || !commentData?.text || !commentData?.authorId) {
      throw new Error('MISSING_COMMENT_DATA')
    }

    isLoading.value = true
    error.value = null

    try {
      const userInfo = await populateUserInfo(commentData.authorId)

      const commentsCollection = collection(db, 'comments')
      const commentToSave = {
        PostID: commentData.postId,
        UserID: commentData.authorId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Created: commentData.createdAt || new Date(),
        Content: commentData.text.trim()
      }

      const docRef = await addDoc(commentsCollection, commentToSave)
      await updatePostCommentsCount(commentData.postId, 1)

      return {
        CommentID: docRef.id,
        ...commentToSave
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updatePostCommentsCount = async (postId, increment) => {
    const postRef = doc(db, 'posts', postId)
    const postDoc = await getDoc(postRef)
    
    if (postDoc.exists()) {
      const currentComments = postDoc.data().comments || 0
      const newComments = Math.max(0, currentComments + increment)
      await updateDoc(postRef, { comments: newComments })
    }
  }

  const getPostComments = async (postId) => {
    if (!postId) return []

    try {
      const commentsCollection = collection(db, 'comments')
      const q = query(commentsCollection, where('PostID', '==', postId))
      
      const querySnapshot = await getDocs(q)
      const comments = []
      
      for (const docSnap of querySnapshot.docs) {
        const commentData = docSnap.data()
        
        // Populate user info if missing
        if (!commentData.UserName && commentData.UserID) {
          const userInfo = await populateUserInfo(commentData.UserID)
          commentData.UserName = userInfo.UserName
          commentData.Avatar = userInfo.Avatar
        }
        
        comments.push({
          CommentID: docSnap.id,
          ...commentData
        })
      }

      // Sort by Created date
      comments.sort((a, b) => {
        const dateA = a.Created?.toDate ? a.Created.toDate() : new Date(a.Created)
        const dateB = b.Created?.toDate ? b.Created.toDate() : new Date(b.Created)
        return dateA - dateB
      })

      return comments
    } catch (err) {
      return []
    }
  }

  return {
    isLoading,
    error,
    uploadAvatar,
    uploadMedia,
    createPost,
    getPosts,
    getPostsByTags,
    addLike,
    removeLike,
    togglePostLike,
    checkUserLikedPost,
    getUserLikedPosts,
    addComment,
    getPostComments
  }
}