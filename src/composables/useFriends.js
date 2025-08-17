/*
src/composables/useFriends.js - Tích hợp Notifications
Quản lý hệ thống bạn bè: gửi/nhận lời mời, chấp nhận/từ chối, gợi ý kết bạn với notifications
Logic: CRUD operations cho friends collection với status tracking và notifications
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  limit,
  and,
  or
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useUsers } from './useUsers'
import { useNotifications } from './useNotifications'

const db = getFirestore(app, 'social-media-db')

export function useFriends() {
  const isLoading = ref(false)
  const { getUsers, getUserById } = useUsers()
  const { createFriendAcceptNotification } = useNotifications()

  // Send friend request
  const sendFriendRequest = async (senderId, receiverId) => {
    if (!senderId || !receiverId || senderId === receiverId) {
      throw new Error('INVALID_FRIEND_REQUEST')
    }

    isLoading.value = true
    try {
      const existingRelation = await getFriendshipStatus(senderId, receiverId)
      if (existingRelation) throw new Error('FRIENDSHIP_ALREADY_EXISTS')

      const friendRequestData = {
        senderId,
        receiverId,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'friends'), friendRequestData)
      return { id: docRef.id, ...friendRequestData }
    } finally {
      isLoading.value = false
    }
  }

  // Update request status helper
  const updateRequestStatus = async (requestId, status) => {
    if (!requestId) throw new Error('INVALID_REQUEST_ID')
    
    isLoading.value = true
    try {
      const requestRef = doc(db, 'friends', requestId)
      await updateDoc(requestRef, { status, updatedAt: new Date() })
      return true
    } finally {
      isLoading.value = false
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (requestId) => {
    if (!requestId) throw new Error('INVALID_REQUEST_ID')
    
    isLoading.value = true
    try {
      // Get request info trước khi update
      const requestRef = doc(db, 'friends', requestId)
      const requestDoc = await getDoc(requestRef)
      
      if (!requestDoc.exists()) {
        throw new Error('REQUEST_NOT_FOUND')
      }
      
      const requestData = requestDoc.data()
      
      // Update status
      await updateDoc(requestRef, { 
        status: 'ACCEPTED', 
        updatedAt: new Date() 
      })
      
      // Tạo notification cho sender
      try {
        const accepterInfo = await getUserById(requestData.receiverId)
        await createFriendAcceptNotification(
          requestData.senderId,
          requestData.receiverId,
          accepterInfo?.UserName || 'Unknown User'
        )
      } catch (error) {
        // Silent fail
      }
      
      return true
    } finally {
      isLoading.value = false
    }
  }

  // Reject friend request
  const rejectFriendRequest = async (requestId) => {
    return updateRequestStatus(requestId, 'REJECTED')
  }

  // Remove friendship/request
  const removeFriendship = async (friendshipId) => {
    if (!friendshipId) throw new Error('INVALID_FRIENDSHIP_ID')

    isLoading.value = true
    try {
      await deleteDoc(doc(db, 'friends', friendshipId))
      return true
    } finally {
      isLoading.value = false
    }
  }

  // Get friends query helper
  const getFriendsQuery = (userId, status = 'ACCEPTED', limitCount = 50) => {
    return query(
      collection(db, 'friends'),
      and(
        where('status', '==', status),
        or(
          where('senderId', '==', userId),
          where('receiverId', '==', userId)  
        )
      ),
      limit(limitCount)
    )
  }

  // Get friends list
  const getFriends = async (userId, limitCount = 50) => {
    if (!userId) return []

    isLoading.value = true
    try {
      const q = getFriendsQuery(userId, 'ACCEPTED', limitCount)
      const querySnapshot = await getDocs(q)
      const friends = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        friends.push({
          id: doc.id,
          ...data,
          friendId: data.senderId === userId ? data.receiverId : data.senderId
        })
      })

      // Sort by updatedAt
      friends.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)
        return dateB - dateA
      })

      return friends
    } finally {
      isLoading.value = false
    }
  }

  // Get friend requests
  const getFriendRequests = async (userId, limitCount = 50) => {
    if (!userId) return []

    isLoading.value = true
    try {
      const q = query(
        collection(db, 'friends'),
        where('receiverId', '==', userId),
        where('status', '==', 'PENDING'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      const requests = []

      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() })
      })

      // Sort by createdAt
      requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateB - dateA
      })

      return requests
    } finally {
      isLoading.value = false
    }
  }

  // Get friend suggestions
  const getFriendSuggestions = async (userId, limitCount = 20) => {
    if (!userId) return []

    isLoading.value = true
    try {
      const [allUsers, sentSnapshot, receivedSnapshot] = await Promise.all([
        getUsers(100),
        getDocs(query(collection(db, 'friends'), where('senderId', '==', userId))),
        getDocs(query(collection(db, 'friends'), where('receiverId', '==', userId)))
      ])
      
      const connectedUserIds = new Set([userId])

      sentSnapshot.forEach((doc) => {
        connectedUserIds.add(doc.data().receiverId)
      })
      
      receivedSnapshot.forEach((doc) => {
        connectedUserIds.add(doc.data().senderId)
      })

      const suggestions = allUsers
        .filter(user => !connectedUserIds.has(user.UserID))
        .slice(0, limitCount)

      return suggestions
    } finally {
      isLoading.value = false
    }
  }

  // Get friendship status between two users
  const getFriendshipStatus = async (userId1, userId2) => {
    if (!userId1 || !userId2) return null

    try {
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(query(
          collection(db, 'friends'),
          where('senderId', '==', userId1),
          where('receiverId', '==', userId2)
        )),
        getDocs(query(
          collection(db, 'friends'),
          where('senderId', '==', userId2),
          where('receiverId', '==', userId1)
        ))
      ])
      
      if (!snapshot1.empty) {
        const doc = snapshot1.docs[0]
        return { id: doc.id, ...doc.data() }
      }
      
      if (!snapshot2.empty) {
        const doc = snapshot2.docs[0]
        return { id: doc.id, ...doc.data() }
      }

      return null
    } catch {
      return null
    }
  }

  // Get counts helpers
  const getFriendsCount = async (userId) => {
    if (!userId) return 0
    try {
      const friends = await getFriends(userId, 1000)
      return friends.length
    } catch {
      return 0
    }
  }

  const getFriendRequestsCount = async (userId) => {
    if (!userId) return 0
    try {
      const requests = await getFriendRequests(userId, 1000)
      return requests.length
    } catch {
      return 0
    }
  }

  return {
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    getFriends,
    getFriendRequests,
    getFriendSuggestions,
    getFriendshipStatus,
    getFriendsCount,
    getFriendRequestsCount
  }
}