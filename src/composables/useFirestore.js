/*
src/composables/useFirestore.js - Simplified Classification Integration
Composable quản lý Firestore và Storage với tích hợp hệ thống phân loại đơn giản
Logic:
- Giữ nguyên tất cả logic và chức năng đã có trước đó
- Tích hợp classification system vào createPost chỉ với field Tags
- Loại bỏ ClassificationVersion và ClassifiedAt fields
- Avatar files được lưu vào bucket avatar/
- Post media files được lưu vào bucket posts/
- Tự động populate author info từ users collection
- Background classification không ảnh hưởng UX
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

// Import classification service cho auto-classification
import { classifyNewPost } from '@/services/postClassificationService'

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

  // Upload avatar file vào Firebase Storage bucket avatar/
  const uploadAvatar = async (file, userId) => {
    if (!file || !userId) {
      throw new Error('MISSING_FILE_OR_USER')
    }

    isLoading.value = true
    error.value = null

    try {
      // Tạo unique filename cho avatar
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}_${timestamp}.${fileExtension}`
      
      // Tạo storage reference trong bucket avatar/
      const avatarRef = storageRef(storage, `avatar/${fileName}`)
      
      // Upload file
      const snapshot = await uploadBytes(avatarRef, file)
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      console.log('Avatar uploaded to avatar/ bucket:', fileName)
      
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

  // Upload media file vào Firebase Storage bucket posts/
  const uploadMedia = async (file, userId) => {
    if (!file || !userId) {
      throw new Error('MISSING_FILE_OR_USER')
    }

    isLoading.value = true
    error.value = null

    try {
      // Tạo unique filename cho post media
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}_${timestamp}.${fileExtension}`
      
      // Tạo storage reference trong bucket posts/
      const mediaRef = storageRef(storage, `posts/${fileName}`)
      
      // Upload file
      const snapshot = await uploadBytes(mediaRef, file)
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      console.log('Media uploaded to posts/ bucket:', fileName)
      
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

  // Tạo post mới trong Firestore với user info từ users collection
  // UPDATED: Tích hợp classification system đơn giản chỉ với Tags field
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

      // Prepare post data structure
      const postToSave = {
        // PostID sẽ được auto-generated bởi Firestore
        UserID: postData.authorId,
        UserName: userInfo.UserName,
        Avatar: userInfo.Avatar,
        Caption: postData.caption.trim(),
        Created: postData.createdAt || new Date(),
        likes: 0,
        comments: 0,
        // Tags field - sẽ được populate bởi classification service
        Tags: null
      }

      // Handle multi-media vs single media
      if (postData.mediaItems && postData.mediaItems.length > 0) {
        // Multi-media support
        postToSave.mediaItems = postData.mediaItems
        postToSave.mediaCount = postData.mediaItems.length
        
        // Backward compatibility - use first media as primary
        postToSave.MediaURL = postData.mediaItems[0].url
        postToSave.MediaType = postData.mediaItems[0].type
        
        console.log(`Creating post with ${postData.mediaItems.length} media items`)
      } else {
        // Single media (backward compatibility)
        postToSave.MediaType = postData.mediaType || null
        postToSave.MediaURL = postData.mediaUrl || null
        postToSave.mediaItems = null
        postToSave.mediaCount = postData.mediaUrl ? 1 : 0
      }

      // Add post to Firestore collection 'posts'
      const postsCollection = collection(db, 'posts')
      const docRef = await addDoc(postsCollection, postToSave)

      console.log('Post created with user info:', {
        PostID: docRef.id,
        UserID: postData.authorId,
        UserName: userInfo.UserName,
        MediaCount: postToSave.mediaCount
      })

      // Background classification - không await để không làm chậm UX
      classifyNewPost(docRef.id, postData.caption.trim()).catch(error => {
        console.error('Classification failed for post:', docRef.id, error)
        // Log error nhưng không ảnh hưởng đến user experience
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
  // UPDATED: Include Tags field với backward compatibility
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
          ...postData,
          // Ensure Tags field exists (backward compatibility)
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

  // =============================================================================
  // TAG-BASED QUERIES
  // =============================================================================

  // Lấy posts có chứa một hoặc nhiều tags cụ thể
  const getPostsByTags = async (tags, limitCount = 10) => {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return []
    }

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

      console.log(`Found ${posts.length} posts with tags:`, tags)
      return posts
      
    } catch (err) {
      console.error('Error getting posts by tags:', err)
      error.value = err
      // Return empty array instead of throwing để không break UI
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Lấy posts với tag filtering options
  const getPostsWithTagFilter = async (options = {}) => {
    const {
      includeTags = [],
      excludeTags = [],
      limitCount = 10,
      sortBy = 'Created'
    } = options

    isLoading.value = true
    error.value = null

    try {
      let q = query(
        collection(db, 'posts'),
        orderBy(sortBy, 'desc'),
        limit(limitCount * 2) // Over-fetch để có thể filter
      )

      // Nếu có includeTags, add where clause
      if (includeTags.length > 0) {
        q = query(
          collection(db, 'posts'),
          where('Tags', 'array-contains-any', includeTags),
          orderBy(sortBy, 'desc'),
          limit(limitCount * 2)
        )
      }
      
      const querySnapshot = await getDocs(q)
      let posts = []
      
      querySnapshot.forEach(doc => {
        const postData = doc.data()
        posts.push({
          PostID: doc.id,
          ...postData,
          Tags: postData.Tags || []
        })
      })

      // Client-side filtering cho excludeTags
      if (excludeTags.length > 0) {
        posts = posts.filter(post => 
          !post.Tags.some(tag => excludeTags.includes(tag))
        )
      }

      // Limit to requested count
      posts = posts.slice(0, limitCount)

      console.log(`Filtered posts result: ${posts.length} posts`)
      return posts
      
    } catch (err) {
      console.error('Error getting posts with tag filter:', err)
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Lấy thống kê tag distribution
  const getTagStatistics = async () => {
    try {
      const postsCollection = collection(db, 'posts')
      const q = query(
        postsCollection,
        where('Tags', '!=', null)
      )
      
      const querySnapshot = await getDocs(q)
      const tagCounts = {}
      let totalClassifiedPosts = 0
      
      querySnapshot.forEach(doc => {
        const tags = doc.data().Tags || []
        totalClassifiedPosts++
        
        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      })
      
      // Sort tags by frequency
      const sortedTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([tag, count]) => ({
          tag,
          count,
          percentage: Math.round((count / totalClassifiedPosts) * 100)
        }))
      
      return {
        totalClassifiedPosts,
        tagStatistics: sortedTags,
        uniqueTags: Object.keys(tagCounts).length
      }
      
    } catch (error) {
      console.error('Error getting tag statistics:', error)
      return null
    }
  }

  // =============================================================================
  // LIKE FUNCTIONS (Không thay đổi)
  // =============================================================================

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
      // User đã like → unlike
      return await removeLike(postId, userId)
    } else {
      // User chưa like → like (chỉ được 1 lần)
      return await addLike(postId, userId)
    }
  }

  // =============================================================================
  // COMMENT FUNCTIONS (Không thay đổi)
  // =============================================================================

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

  // =============================================================================
  // RETURN ALL FUNCTIONS
  // =============================================================================

  return {
    isLoading,
    error,
    
    // Storage functions
    uploadAvatar, // Avatar uploads (bucket: avatar/)
    uploadMedia,  // Post media uploads (bucket: posts/)
    
    // Post functions (UPDATED với simplified classification)
    createPost, // Updated với automatic classification chỉ Tags field
    getPosts,   // Updated với Tags field support
    
    // Tag-based query functions
    getPostsByTags,
    getPostsWithTagFilter,
    getTagStatistics,
    
    // Like functions (UNCHANGED)
    addLike,
    removeLike,
    togglePostLike,
    checkUserLikedPost,
    getUserLikedPosts,
    
    // Comment functions (UNCHANGED)
    addComment,
    getPostComments
  }
}