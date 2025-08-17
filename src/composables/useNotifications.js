/*
src/composables/useNotifications.js
Hệ thống thông báo đơn giản chỉ dùng Firestore real-time
Logic:
- Tạo và lắng nghe notifications từ Firestore
- Không dùng FCM, chỉ hoạt động khi user online
- Tự động tạo notifications khi có like, comment, friend accept
- Real-time updates với onSnapshot
*/

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { 
  getFirestore, 
  collection, 
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useAuth } from './useAuth'

const db = getFirestore(app, 'social-media-db')

export function useNotifications() {
  const { user } = useAuth()
  
  // Reactive state
  const notifications = ref([])
  const isLoading = ref(false)
  
  // Real-time listener
  let notificationsListener = null

  // Computed properties
  const unreadCount = computed(() => {
    return notifications.value.filter(notif => !notif.isRead).length
  })

  const recentNotifications = computed(() => {
    return notifications.value.slice(0, 10)
  })

  // =============================================================================
  // SETUP REAL-TIME LISTENER
  // =============================================================================

  const setupNotificationsListener = () => {
    if (!user.value) return

    cleanupListeners()

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.value.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    notificationsListener = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList = []
      
      snapshot.forEach(doc => {
        notificationsList.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      notifications.value = notificationsList
    })
  }

  // =============================================================================
  // NOTIFICATION ACTIONS
  // =============================================================================

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!notificationId) return

    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp()
      })
    } catch (error) {
      // Silent fail
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user.value) return

    try {
      const unreadNotifications = notifications.value.filter(notif => !notif.isRead)
      
      const updatePromises = unreadNotifications.map(notif => 
        updateDoc(doc(db, 'notifications', notif.id), {
          isRead: true,
          readAt: serverTimestamp()
        })
      )
      
      await Promise.all(updatePromises)
    } catch (error) {
      // Silent fail
    }
  }

  // =============================================================================
  // CREATE NOTIFICATIONS
  // =============================================================================

  // Tạo notification khi có like
  const createLikeNotification = async (postId, postOwnerId, likerId, likerName) => {
    if (!postOwnerId || !likerId || postOwnerId === likerId) return

    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'like',
        recipientId: postOwnerId,
        senderId: likerId,
        senderName: likerName,
        postId: postId,
        message: `${likerName} đã thích bài viết của bạn`,
        isRead: false,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      // Silent fail
    }
  }

  // Tạo notification khi có comment
  const createCommentNotification = async (postId, postOwnerId, commenterId, commenterName) => {
    if (!postOwnerId || !commenterId || postOwnerId === commenterId) return

    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'comment',
        recipientId: postOwnerId,
        senderId: commenterId,
        senderName: commenterName,
        postId: postId,
        message: `${commenterName} đã bình luận bài viết của bạn`,
        isRead: false,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      // Silent fail
    }
  }

  // Tạo notification khi friend accept
  const createFriendAcceptNotification = async (requesterId, accepterId, accepterName) => {
    if (!requesterId || !accepterId || requesterId === accepterId) return

    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'friend_accept',
        recipientId: requesterId,
        senderId: accepterId,
        senderName: accepterName,
        message: `${accepterName} đã chấp nhận lời mời kết bạn của bạn`,
        isRead: false,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      // Silent fail
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  // Format time
  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInMs = now - date
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return 'Vừa xong'
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
    if (diffInHours < 24) return `${diffInHours} giờ trước`
    if (diffInDays < 7) return `${diffInDays} ngày trước`
    
    return date.toLocaleDateString()
  }

  // Get icon by type
  const getNotificationIcon = (type) => {
    const iconMap = {
      like: '❤️',
      comment: '💬',
      friend_accept: '👥'
    }
    return iconMap[type] || '🔔'
  }

  // Cleanup
  const cleanupListeners = () => {
    if (notificationsListener) {
      notificationsListener()
      notificationsListener = null
    }
  }

  // Initialize khi user login
  const initializeNotifications = () => {
    if (user.value) {
      setupNotificationsListener()
    } else {
      cleanupListeners()
      notifications.value = []
    }
  }

  // Watchers
  watch(user, (newUser) => {
    if (newUser) {
      initializeNotifications()
    } else {
      notifications.value = []
      cleanupListeners()
    }
  }, { immediate: true })

  // Lifecycle
  onMounted(() => {
    if (user.value) {
      initializeNotifications()
    }
  })

  onUnmounted(() => {
    cleanupListeners()
  })

  return {
    // State
    notifications,
    isLoading,
    
    // Computed
    unreadCount,
    recentNotifications,
    
    // Methods
    markAsRead,
    markAllAsRead,
    initializeNotifications,
    
    // Create notifications
    createLikeNotification,
    createCommentNotification,
    createFriendAcceptNotification,
    
    // Utils
    formatNotificationTime,
    getNotificationIcon,
    cleanupListeners
  }
}