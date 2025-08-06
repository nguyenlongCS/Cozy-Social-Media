/*
src/composables/useFriends.js - Refactored
Friends system management: requests, accept/reject, unfriend, suggestions
Logic: CRUD operations cho friends collection với status tracking
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

  // Send friend request
  const sendFriendRequest = async (senderId, receiverId) => {
    if (!senderId || !receiverId || senderId === receiverId) {
      throw new Error('INVALID_FRIEND_REQUEST')
    }

    isLoading.value = true
    error.value = null

    try {
      // Check existing relationship
      const existingRelation = await getFriendshipStatus(senderId, receiverId)
      if (existingRelation) {
        throw new Error('FRIENDSHIP_ALREADY_EXISTS')
      }

      // Create friend request
      const friendsCollection = collection(db, 'friends')
      const friendRequestData = {
        senderId: senderId,
        receiverId: receiverId,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(friendsCollection, friendRequestData)
      
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

  // Accept friend request
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

      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Reject friend request
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

      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Remove friendship/request
  const removeFriendship = async (friendshipId) => {
    if (!friendshipId) {
      throw new Error('INVALID_FRIENDSHIP_ID')
    }

    isLoading.value = true
    error.value = null

    try {
      const friendshipRef = doc(db, 'friends', friendshipId)
      await deleteDoc(friendshipRef)
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get friends list (ACCEPTED status)
  const getFriends = async (userId, limitCount = 50) => {
    if (!userId) return []

    isLoading.value = true
    error.value = null

    try {
      const friendsCollection = collection(db, 'friends')
      
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
          friendId: data.senderId === userId ? data.receiverId : data.senderId
        })
      })

      // Sort by updatedAt in memory
      friends.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)
        return dateB - dateA
      })

      return friends
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get friend requests (PENDING received)
  const getFriendRequests = async (userId, limitCount = 50) => {
    if (!userId) return []

    isLoading.value = true
    error.value = null

    try {
      const friendsCollection = collection(db, 'friends')
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
        return dateB - dateA
      })

      return requests
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get friend suggestions (users not connected)
  const getFriendSuggestions = async (userId, limitCount = 20) => {
    if (!userId) return []

    isLoading.value = true
    error.value = null

    try {
      // Get all users
      const allUsers = await getUsers(100)
      
      // Get all relationships
      const friendsCollection = collection(db, 'friends')
      
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(query(friendsCollection, where('senderId', '==', userId))),
        getDocs(query(friendsCollection, where('receiverId', '==', userId)))
      ])
      
      const connectedUserIds = new Set([userId])

      sentSnapshot.forEach((doc) => {
        connectedUserIds.add(doc.data().receiverId)
      })
      
      receivedSnapshot.forEach((doc) => {
        connectedUserIds.add(doc.data().senderId)
      })

      // Filter unconnected users
      const suggestions = allUsers
        .filter(user => !connectedUserIds.has(user.UserID))
        .slice(0, limitCount)

      return suggestions
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get friendship status between two users
  const getFriendshipStatus = async (userId1, userId2) => {
    if (!userId1 || !userId2) return null

    try {
      const friendsCollection = collection(db, 'friends')
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(query(
          friendsCollection,
          where('senderId', '==', userId1),
          where('receiverId', '==', userId2)
        )),
        getDocs(query(
          friendsCollection,
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
    } catch (err) {
      return null
    }
  }

  // Count friends
  const getFriendsCount = async (userId) => {
    if (!userId) return 0
    try {
      const friends = await getFriends(userId, 1000)
      return friends.length
    } catch (err) {
      return 0
    }
  }

  // Count friend requests
  const getFriendRequestsCount = async (userId) => {
    if (!userId) return 0
    try {
      const requests = await getFriendRequests(userId, 1000)
      return requests.length
    } catch (err) {
      return 0
    }
  }

  return {
    isLoading,
    error,
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