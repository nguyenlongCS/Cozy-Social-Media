/*
src/composables/useFirestore.js - Refactored  
Quản lý Firestore operations và Storage uploads
Logic: CRUD cho posts, comments, likes với auto-tagging
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
  const { getUserById } = useUsers()

  // Helper: populate user info
  const populateUserInfo = async (userId) => {
    try {
      const userData = await getUserById(userId)
      return {
        UserName: userData?.UserName || 'Unknown User',
        Avatar: userData?.Avatar || null
      }
    } catch {
      return { UserName: 'Unknown User', Avatar: null }
    }
  }

  // Upload file helper
  const uploadFile = async (file, folder, userId) => {
    if (!file || !userId) throw new Error('MISSING_FILE_OR_USER')
    
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${userId}_${timestamp}.${fileExtension}`
    
    const fileRef = storageRef(storage, `${folder}/${fileName}`)
    const snapshot = await uploadBytes(fileRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return { fileName, downloadURL, size: file.size, type: file.type }
  }

  // Upload avatar
  const uploadAvatar = async (file, userId) => {
    isLoading.value = true
    try {
      return await uploadFile(file, 'avatar', userId)
    } finally {
      isLoading.value = false
    }
  }

  // Upload media
  const uploadMedia = async (file, userId) => {
    isLoading.value = true
    try {
      return await uploadFile(file, 'posts', userId)
    } finally {
      isLoading.value = false
    }
  }

  // Create post
  const createPost = async (postData) => {
    if (!postData?.caption || !postData?.authorId) {
      throw new Error('MISSING_REQUIRED_FIELDS')
    }

    isLoading.value = true
    try {
      const userInfo = await populateUserInfo(postData.authorId)
      
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

      const docRef = await addDoc(collection(db, 'posts'), postToSave)
      
      // Background classification
      classifyNewPost(docRef.id, postData.caption.trim()).catch(() => {})

      return { PostID: docRef.id, ...postToSave }
    } finally {
      isLoading.value = false
    }
  }

  // Get posts
  const getPosts = async (limitCount = 10) => {
    isLoading.value = true
    try {
      const q = query(
        collection(db, 'posts'), 
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
    } finally {
      isLoading.value = false
    }
  }

  // Get posts by tags
  const getPostsByTags = async (tags, limitCount = 10) => {
    if (!tags?.length) return []

    try {
      const q = query(
        collection(db, 'posts'),
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
    } catch {
      return []
    }
  }

  // Like system
  const checkUserLikedPost = async (postId, userId) => {
    try {
      const q = query(
        collection(db, 'likes'),
        where('PostID', '==', postId),
        where('UserID', '==', userId),
        limit(1)
      )
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch {
      return false
    }
  }

  const getUserLikedPosts = async (userId) => {
    try {
      const q = query(collection(db, 'likes'), where('UserID', '==', userId))
      const querySnapshot = await getDocs(q)
      const likedPostIds = []
      
      querySnapshot.forEach((doc) => {
        likedPostIds.push(doc.data().PostID)
      })
      
      return likedPostIds
    } catch {
      return []
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

  const addLike = async (postId, userId) => {
    if (!postId || !userId) throw new Error('MISSING_POST_OR_USER_ID')

    const alreadyLiked = await checkUserLikedPost(postId, userId)
    if (alreadyLiked) return { success: false, message: 'ALREADY_LIKED' }

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
    return { success: true }
  }

  const removeLike = async (postId, userId) => {
    if (!postId || !userId) throw new Error('MISSING_POST_OR_USER_ID')

    const q = query(
      collection(db, 'likes'),
      where('PostID', '==', postId),
      where('UserID', '==', userId),
      limit(1)
    )
    
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) return { success: false, message: 'NOT_LIKED' }

    const likeDoc = querySnapshot.docs[0]
    await deleteDoc(doc(db, 'likes', likeDoc.id))
    await updatePostLikesCount(postId, -1)
    return { success: true }
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
    try {
      const userInfo = await populateUserInfo(commentData.authorId)
      
      const commentToSave = {
        PostID: commentData.postId,
        UserID: commentData.authorId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Created: commentData.createdAt || new Date(),
        Content: commentData.text.trim()
      }

      const docRef = await addDoc(collection(db, 'comments'), commentToSave)
      await updatePostCommentsCount(commentData.postId, 1)

      return { CommentID: docRef.id, ...commentToSave }
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
      const q = query(collection(db, 'comments'), where('PostID', '==', postId))
      const querySnapshot = await getDocs(q)
      const comments = []
      
      for (const docSnap of querySnapshot.docs) {
        const commentData = docSnap.data()
        
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
    } catch {
      return []
    }
  }

  return {
    isLoading,
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