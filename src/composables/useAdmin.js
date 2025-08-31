/*
src/composables/useAdmin.js
Composable quản lý chức năng admin: thống kê, xóa user, xóa post
Logic:
- Kiểm tra quyền admin dựa trên email trong collection 'admin'
- Thống kê tổng quan: users, posts, tương tác
- Xóa tài khoản user và tất cả dữ liệu liên quan
- Xóa post và dữ liệu liên quan
- Business logic tập trung cho admin features
*/

import { ref, computed } from 'vue'
import { 
  getFirestore, 
  collection, 
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useAuth } from './useAuth'
import { useErrorHandler } from './useErrorHandler'

const db = getFirestore(app, 'social-media-db')

export function useAdmin() {
  const { user } = useAuth()
  const { showError, showSuccess } = useErrorHandler()
  
  // Reactive state
  const isAdmin = ref(false)
  const isLoading = ref(false)
  const dashboardStats = ref({
    totalUsers: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    topPosts: [],
    recentUsers: []
  })

  // =============================================================================
  // ADMIN VERIFICATION
  // =============================================================================

  /**
   * Kiểm tra user hiện tại có phải admin không
   * Dựa trên email được lưu trong collection 'admin' với field permissions
   */
  const checkAdminStatus = async () => {
    if (!user.value?.email) {
      isAdmin.value = false
      return false
    }

    try {
      // Tìm email trong collection admin
      const adminQuery = query(
        collection(db, 'admin'),
        where('email', '==', user.value.email),
        limit(1)
      )

      const querySnapshot = await getDocs(adminQuery)
      
      if (querySnapshot.empty) {
        isAdmin.value = false
        return false
      }

      // Kiểm tra permissions array
      const adminDoc = querySnapshot.docs[0]
      const adminData = adminDoc.data()
      const permissions = adminData.permissions || []
      
      // Admin cần có ít nhất 1 permission để được coi là active
      isAdmin.value = permissions.length > 0
      
      return isAdmin.value
    } catch (error) {
      console.error('Error checking admin status:', error)
      isAdmin.value = false
      return false
    }
  }

  // =============================================================================
  // DASHBOARD STATISTICS
  // =============================================================================

  /**
   * Load thống kê tổng quan cho admin dashboard
   */
  const loadDashboardStats = async () => {
    if (!isAdmin.value) {
      throw new Error('ADMIN_ACCESS_REQUIRED')
    }

    isLoading.value = true

    try {
      // Parallel loading cho performance
      const [
        usersSnapshot,
        postsSnapshot,
        likesSnapshot,
        commentsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'likes')),
        getDocs(collection(db, 'comments'))
      ])

      // Thống kê cơ bản
      dashboardStats.value.totalUsers = usersSnapshot.size
      dashboardStats.value.totalPosts = postsSnapshot.size
      dashboardStats.value.totalLikes = likesSnapshot.size
      dashboardStats.value.totalComments = commentsSnapshot.size

      // Top posts (theo lượt like)
      const postsData = []
      postsSnapshot.forEach(doc => {
        const data = doc.data()
        postsData.push({
          id: doc.id,
          ...data,
          likes: data.likes || 0
        })
      })

      dashboardStats.value.topPosts = postsData
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 10)

      // Recent users (users mới nhất)
      const usersData = []
      usersSnapshot.forEach(doc => {
        const data = doc.data()
        usersData.push({
          id: doc.id,
          ...data
        })
      })

      dashboardStats.value.recentUsers = usersData
        .sort((a, b) => {
          const dateA = a.Created?.toDate ? a.Created.toDate() : new Date(a.Created || 0)
          const dateB = b.Created?.toDate ? b.Created.toDate() : new Date(b.Created || 0)
          return dateB - dateA
        })
        .slice(0, 10)

      return dashboardStats.value

    } catch (error) {
      showError(error, 'admin')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================

  /**
   * Xóa tài khoản user và tất cả dữ liệu liên quan
   * Xóa: user profile, posts, comments, likes, friend relationships
   */
  const deleteUserAccount = async (userId) => {
    if (!isAdmin.value) {
      throw new Error('ADMIN_ACCESS_REQUIRED')
    }

    if (!userId) {
      throw new Error('USER_ID_REQUIRED')
    }

    isLoading.value = true

    try {
      // Lấy thông tin user trước khi xóa
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('USER_NOT_FOUND')
      }

      const userData = userDoc.data()

      // Collect tất cả documents liên quan
      const [
        userPostsSnapshot,
        userCommentsSnapshot,
        userLikesSnapshot,
        friendsSnapshot1,
        friendsSnapshot2,
        userNotificationsSnapshot,
        userInterestsSnapshot,
        userLocationsSnapshot
      ] = await Promise.all([
        getDocs(query(collection(db, 'posts'), where('UserID', '==', userId))),
        getDocs(query(collection(db, 'comments'), where('UserID', '==', userId))),
        getDocs(query(collection(db, 'likes'), where('UserID', '==', userId))),
        getDocs(query(collection(db, 'friends'), where('senderId', '==', userId))),
        getDocs(query(collection(db, 'friends'), where('receiverId', '==', userId))),
        getDocs(query(collection(db, 'notifications'), where('recipientId', '==', userId))),
        getDocs(query(collection(db, 'userInterests'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'userLocations'), where('userId', '==', userId)))
      ])

      // Batch delete operations (Firestore limit: 500 operations per batch)
      const batches = []
      let currentBatch = writeBatch(db)
      let operationCount = 0

      const addToBatch = (docRef) => {
        if (operationCount >= 500) {
          batches.push(currentBatch)
          currentBatch = writeBatch(db)
          operationCount = 0
        }
        currentBatch.delete(docRef)
        operationCount++
      }

      // Delete user profile
      addToBatch(userRef)

      // Delete user posts
      userPostsSnapshot.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Delete user comments
      userCommentsSnapshot.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Delete user likes
      userLikesSnapshot.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Delete friend relationships
      friendsSnapshot1.forEach(doc => {
        addToBatch(doc.ref)
      })
      friendsSnapshot2.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Delete notifications
      userNotificationsSnapshot.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Delete user interests
      userInterestsSnapshot.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Delete user locations
      userLocationsSnapshot.forEach(doc => {
        addToBatch(doc.ref)
      })

      // Add last batch if has operations
      if (operationCount > 0) {
        batches.push(currentBatch)
      }

      // Execute all batches
      await Promise.all(batches.map(batch => batch.commit()))

      showSuccess('deleteUser')
      
      // Refresh dashboard stats
      await loadDashboardStats()

      return {
        success: true,
        deletedUser: userData.UserName || 'Unknown User',
        deletedPostsCount: userPostsSnapshot.size
      }

    } catch (error) {
      showError(error, 'admin')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // =============================================================================
  // POST MANAGEMENT
  // =============================================================================

  /**
   * Xóa post và tất cả dữ liệu liên quan (comments, likes)
   */
  const deletePost = async (postId) => {
    if (!isAdmin.value) {
      throw new Error('ADMIN_ACCESS_REQUIRED')
    }

    if (!postId) {
      throw new Error('POST_ID_REQUIRED')
    }

    isLoading.value = true

    try {
      // Lấy thông tin post trước khi xóa
      const postRef = doc(db, 'posts', postId)
      const postDoc = await getDoc(postRef)
      
      if (!postDoc.exists()) {
        throw new Error('POST_NOT_FOUND')
      }

      const postData = postDoc.data()

      // Collect related documents
      const [commentsSnapshot, likesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'comments'), where('PostID', '==', postId))),
        getDocs(query(collection(db, 'likes'), where('PostID', '==', postId)))
      ])

      // Batch delete
      const batch = writeBatch(db)

      // Delete post
      batch.delete(postRef)

      // Delete comments
      commentsSnapshot.forEach(doc => {
        batch.delete(doc.ref)
      })

      // Delete likes
      likesSnapshot.forEach(doc => {
        batch.delete(doc.ref)
      })

      await batch.commit()

      showSuccess('deletePost')
      
      // Refresh dashboard stats
      await loadDashboardStats()

      return {
        success: true,
        deletedPost: postData.Caption || 'Untitled Post',
        deletedCommentsCount: commentsSnapshot.size,
        deletedLikesCount: likesSnapshot.size
      }

    } catch (error) {
      showError(error, 'admin')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // =============================================================================
  // SEARCH & FILTER
  // =============================================================================

  /**
   * Tìm kiếm users theo email hoặc username
   */
  const searchUsers = async (searchTerm, limitCount = 20) => {
    if (!isAdmin.value) {
      throw new Error('ADMIN_ACCESS_REQUIRED')
    }

    if (!searchTerm?.trim()) {
      return []
    }

    try {
      const usersCollection = collection(db, 'users')
      
      // Search by username
      const usernameQuery = query(
        usersCollection,
        where('UserName', '>=', searchTerm),
        where('UserName', '<=', searchTerm + '\uf8ff'),
        limit(limitCount)
      )
      
      // Search by email
      const emailQuery = query(
        usersCollection,
        where('Email', '>=', searchTerm),
        where('Email', '<=', searchTerm + '\uf8ff'),
        limit(limitCount)
      )

      const [usernameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(usernameQuery),
        getDocs(emailQuery)
      ])

      const users = new Map()

      // Combine results and remove duplicates
      usernameSnapshot.forEach(doc => {
        users.set(doc.id, { id: doc.id, ...doc.data() })
      })
      
      emailSnapshot.forEach(doc => {
        users.set(doc.id, { id: doc.id, ...doc.data() })
      })

      return Array.from(users.values())

    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  /**
   * Tìm kiếm posts theo caption hoặc user
   */
  const searchPosts = async (searchTerm, limitCount = 20) => {
    if (!isAdmin.value) {
      throw new Error('ADMIN_ACCESS_REQUIRED')
    }

    if (!searchTerm?.trim()) {
      return []
    }

    try {
      // Get all posts và filter locally (do Firestore search limitations)
      const postsSnapshot = await getDocs(query(
        collection(db, 'posts'),
        orderBy('Created', 'desc'),
        limit(100)
      ))

      const posts = []
      const searchLower = searchTerm.toLowerCase()

      postsSnapshot.forEach(doc => {
        const data = doc.data()
        const caption = (data.Caption || '').toLowerCase()
        const userName = (data.UserName || '').toLowerCase()
        const content = (data.Content || '').toLowerCase()

        if (caption.includes(searchLower) || 
            userName.includes(searchLower) || 
            content.includes(searchLower)) {
          posts.push({
            id: doc.id,
            ...data
          })
        }
      })

      return posts.slice(0, limitCount)

    } catch (error) {
      console.error('Error searching posts:', error)
      return []
    }
  }

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const totalInteractions = computed(() => {
    return dashboardStats.value.totalLikes + dashboardStats.value.totalComments
  })

  const avgInteractionsPerPost = computed(() => {
    if (dashboardStats.value.totalPosts === 0) return 0
    return Math.round(totalInteractions.value / dashboardStats.value.totalPosts * 100) / 100
  })

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Format date cho admin UI
   */
  const formatAdminDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get user posts count
   */
  const getUserPostsCount = async (userId) => {
    try {
      const postsSnapshot = await getDocs(query(
        collection(db, 'posts'),
        where('UserID', '==', userId)
      ))
      return postsSnapshot.size
    } catch {
      return 0
    }
  }

  /**
   * Get post interactions count
   */
  const getPostInteractionsCount = async (postId) => {
    try {
      const [likesSnapshot, commentsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'likes'), where('PostID', '==', postId))),
        getDocs(query(collection(db, 'comments'), where('PostID', '==', postId)))
      ])
      
      return {
        likes: likesSnapshot.size,
        comments: commentsSnapshot.size
      }
    } catch {
      return { likes: 0, comments: 0 }
    }
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initialize admin module
   */
  const initializeAdmin = async () => {
    await checkAdminStatus()
    
    if (isAdmin.value) {
      await loadDashboardStats()
    }
  }

  return {
    // State
    isAdmin,
    isLoading,
    dashboardStats,
    
    // Computed
    totalInteractions,
    avgInteractionsPerPost,
    
    // Methods
    checkAdminStatus,
    loadDashboardStats,
    deleteUserAccount,
    deletePost,
    searchUsers,
    searchPosts,
    getUserPostsCount,
    getPostInteractionsCount,
    initializeAdmin,
    formatAdminDate
  }
}