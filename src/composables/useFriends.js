/*
src/composables/useFriends.js
Composable quản lý hệ thống kết bạn
Logic:
- Gửi lời mời kết bạn (PENDING status)
- Chấp nhận/từ chối lời mời kết bạn
- Hủy lời mời đã gửi
- Hủy kết bạn
- Lấy danh sách bạn bè (ACCEPTED)
- Lấy lời mời đã nhận (PENDING với receiverId = currentUser)
- Lấy gợi ý kết bạn (users chưa kết bạn)
- Collection: friends với cấu trúc đơn giản
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  and,
  or
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useUsers } from './useUsers'

const db = getFirestore(app, 'social-media-db')

export function useFriends() {
  const isLoading = ref(false)
  const error = ref(null)
  const { getUsers } = useUsers()

  // =============================================================================
  // FRIEND REQUEST FUNCTIONS
  // =============================================================================

  // Gửi lời mời kết bạn
  const sendFriendRequest = async (senderId, receiverId) => {
    if (!senderId || !receiverId || senderId === receiverId) {
      throw new Error('INVALID_FRIEND_REQUEST')
    }

    isLoading.value = true
    error.value = null

    try {
      // Kiểm tra xem đã có mối quan hệ nào chưa
      const existingRelation = await getFriendshipStatus(senderId, receiverId)
      if (existingRelation) {
        throw new Error('FRIENDSHIP_ALREADY_EXISTS')
      }

      // Tạo friend request mới
      const friendsCollection = collection(db, 'friends')
      const friendRequestData = {
        senderId: senderId,
        receiverId: receiverId,
        status: 'PENDING', // PENDING, ACCEPTED, REJECTED
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(friendsCollection, friendRequestData)
      console.log('Friend request sent:', docRef.id)
      
      return {
        id: docRef.id,
        ...friendRequestData
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Chấp nhận lời mời kết bạn
  const acceptFriendRequest = async (requestId) => {
    if (!requestId) {
      throw new Error('INVALID_REQUEST_ID')
    }

    isLoading.value = true
    error.value = null

    try {
      const requestRef = doc(db, 'friends', requestId)
      await updateDoc(requestRef, {
        status: 'ACCEPTED',
        updatedAt: new Date()
      })

      console.log('Friend request accepted:', requestId)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Từ chối lời mời kết bạn
  const rejectFriendRequest = async (requestId) => {
    if (!requestId) {
      throw new Error('INVALID_REQUEST_ID')
    }

    isLoading.value = true
    error.value = null

    try {
      const requestRef = doc(db, 'friends', requestId)
      await updateDoc(requestRef, {
        status: 'REJECTED',
        updatedAt: new Date()
      })

      console.log('Friend request rejected:', requestId)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Hủy lời mời đã gửi hoặc hủy kết bạn
  const removeFriendship = async (friendshipId) => {
    if (!friendshipId) {
      throw new Error('INVALID_FRIENDSHIP_ID')
    }

    isLoading.value = true
    error.value = null

    try {
      const friendshipRef = doc(db, 'friends', friendshipId)
      await deleteDoc(friendshipRef)

      console.log('Friendship removed:', friendshipId)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // =============================================================================
  // QUERY FUNCTIONS
  // =============================================================================

  // Lấy danh sách bạn bè (status = ACCEPTED)
  const getFriends = async (userId, limitCount = 50) => {
    if (!userId) {
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const friendsCollection = collection(db, 'friends')
      
      // Fix: Use and() to wrap composite filters properly
      const q = query(
        friendsCollection,
        and(
          where('status', '==', 'ACCEPTED'),
          or(
            where('senderId', '==', userId),
            where('receiverId', '==', userId)  
          )
        ),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      const friends = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        friends.push({
          id: doc.id,
          ...data,
          // Xác định friendId (user kia)
          friendId: data.senderId === userId ? data.receiverId : data.senderId
        })
      })

      // Sort by updatedAt in memory since we can't use orderBy with or()
      friends.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)
        return dateB - dateA // Descending order
      })

      console.log('Friends loaded:', friends.length)
      return friends
    } catch (err) {
      error.value = err
      console.error('Error getting friends:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Lấy lời mời kết bạn đã nhận (PENDING với receiverId = currentUser)
  const getFriendRequests = async (userId, limitCount = 50) => {
    if (!userId) {
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const friendsCollection = collection(db, 'friends')
      // Simplified query - remove orderBy to avoid index issues
      const q = query(
        friendsCollection,
        where('receiverId', '==', userId),
        where('status', '==', 'PENDING'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      const requests = []

      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        })
      })

      // Sort by createdAt in memory
      requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateB - dateA // Descending order (newest first)
      })

      console.log('Friend requests loaded:', requests.length)
      return requests
    } catch (err) {
      error.value = err
      console.error('Error getting friend requests:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Lấy gợi ý kết bạn (tất cả users trừ bạn bè và người đã gửi/nhận request)
  const getFriendSuggestions = async (userId, limitCount = 20) => {
    if (!userId) {
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      // Lấy tất cả users
      const allUsers = await getUsers(100) // Lấy nhiều để filter
      
      // Lấy tất cả relationships của user hiện tại
      const friendsCollection = collection(db, 'friends')
      
      // Fix: Use separate queries instead of complex or() query
      const sentRequestsQuery = query(
        friendsCollection,
        where('senderId', '==', userId)
      )
      
      const receivedRequestsQuery = query(
        friendsCollection,
        where('receiverId', '==', userId)
      )

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentRequestsQuery),
        getDocs(receivedRequestsQuery)
      ])
      
      const connectedUserIds = new Set([userId]) // Bao gồm chính mình

      sentSnapshot.forEach((doc) => {
        const data = doc.data()
        connectedUserIds.add(data.receiverId)
      })
      
      receivedSnapshot.forEach((doc) => {
        const data = doc.data()
        connectedUserIds.add(data.senderId)
      })

      // Filter users chưa có mối quan hệ
      const suggestions = allUsers
        .filter(user => !connectedUserIds.has(user.UserID))
        .slice(0, limitCount)

      console.log('Friend suggestions loaded:', suggestions.length)
      return suggestions
    } catch (err) {
      error.value = err
      console.error('Error getting friend suggestions:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  // Kiểm tra trạng thái kết bạn giữa 2 users
  const getFriendshipStatus = async (userId1, userId2) => {
    if (!userId1 || !userId2) {
      return null
    }

    try {
      const friendsCollection = collection(db, 'friends')
      
      // Fix: Use separate queries instead of complex or() with and()
      const query1 = query(
        friendsCollection,
        where('senderId', '==', userId1),
        where('receiverId', '==', userId2)
      )
      
      const query2 = query(
        friendsCollection,
        where('senderId', '==', userId2),
        where('receiverId', '==', userId1)
      )

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(query1),
        getDocs(query2)
      ])
      
      if (!snapshot1.empty) {
        const doc = snapshot1.docs[0]
        return {
          id: doc.id,
          ...doc.data()
        }
      }
      
      if (!snapshot2.empty) {
        const doc = snapshot2.docs[0]
        return {
          id: doc.id,
          ...doc.data()
        }
      }

      return null
    } catch (err) {
      console.error('Error checking friendship status:', err)
      return null
    }
  }

  // Kiểm tra có phải bạn bè không
  const areFriends = async (userId1, userId2) => {
    const friendship = await getFriendshipStatus(userId1, userId2)
    return friendship && friendship.status === 'ACCEPTED'
  }

  // Kiểm tra có pending request không
  const hasPendingRequest = async (userId1, userId2) => {
    const friendship = await getFriendshipStatus(userId1, userId2)
    return friendship && friendship.status === 'PENDING'
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================

  // Đếm số lượng bạn bè
  const getFriendsCount = async (userId) => {
    if (!userId) return 0

    try {
      const friends = await getFriends(userId, 1000) // Lấy nhiều để đếm
      return friends.length
    } catch (err) {
      console.error('Error counting friends:', err)
      return 0
    }
  }

  // Đếm số lượng friend requests
  const getFriendRequestsCount = async (userId) => {
    if (!userId) return 0

    try {
      const requests = await getFriendRequests(userId, 1000)
      return requests.length
    } catch (err) {
      console.error('Error counting friend requests:', err)
      return 0
    }
  }

  return {
    isLoading,
    error,
    
    // Friend request actions
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    
    // Query functions
    getFriends,
    getFriendRequests,
    getFriendSuggestions,
    
    // Helper functions
    getFriendshipStatus,
    areFriends,
    hasPendingRequest,
    
    // Statistics
    getFriendsCount,
    getFriendRequestsCount
  }
}