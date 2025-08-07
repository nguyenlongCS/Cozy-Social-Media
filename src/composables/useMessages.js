/*
src/composables/useMessages.js - Real-time Fixed
Messages system với proper real-time updates và message loading
Logic: Fix real-time listeners và message display issues
*/
import { ref, computed } from 'vue'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  limit,
  and,
  doc,
  updateDoc
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useUsers } from './useUsers'

const db = getFirestore(app, 'social-media-db')

export function useMessages() {
  const isLoading = ref(false)
  const error = ref(null)
  const conversations = ref([])
  const currentMessages = ref([])
  const activeConversationId = ref(null)
  const { getUserById } = useUsers()
  
  // Realtime listeners
  let conversationsUnsubscribe = null
  let messagesUnsubscribe = null

  // Send message
  const sendMessage = async (senderId, receiverId, content) => {
    if (!senderId || !receiverId || !content?.trim()) {
      throw new Error('MISSING_MESSAGE_DATA')
    }

    if (senderId === receiverId) {
      throw new Error('CANNOT_MESSAGE_YOURSELF')
    }

    isLoading.value = true
    error.value = null

    try {
      // Get sender info
      const senderInfo = await getUserById(senderId)
      const receiverInfo = await getUserById(receiverId)
      
      if (!senderInfo || !receiverInfo) {
        throw new Error('USER_NOT_FOUND')
      }

      // Create message
      const messagesCollection = collection(db, 'messages')
      const messageData = {
        senderId: senderId,
        receiverId: receiverId,
        senderName: senderInfo.UserName || 'Unknown',
        senderAvatar: senderInfo.Avatar || null,
        receiverName: receiverInfo.UserName || 'Unknown',
        receiverAvatar: receiverInfo.Avatar || null,
        content: content.trim(),
        createdAt: new Date(),
        isRead: false
      }

      const docRef = await addDoc(messagesCollection, messageData)
      
      console.log('Message sent successfully:', docRef.id)
      return {
        id: docRef.id,
        ...messageData
      }
    } catch (err) {
      error.value = err
      console.error('Error sending message:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get conversations for current user
  const getConversations = async (userId) => {
    if (!userId) return []

    console.log('Loading conversations for user:', userId)
    isLoading.value = true
    error.value = null

    try {
      const messagesCollection = collection(db, 'messages')
      
      // Get sent messages
      const sentQuery = query(
        messagesCollection,
        where('senderId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(200)
      )

      // Get received messages  
      const receivedQuery = query(
        messagesCollection,
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(200)
      )

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ])

      console.log('Sent messages:', sentSnapshot.size)
      console.log('Received messages:', receivedSnapshot.size)

      const messagesMap = new Map()

      // Process sent messages
      sentSnapshot.forEach((doc) => {
        const message = { id: doc.id, ...doc.data() }
        const partnerId = message.receiverId
        const partnerName = message.receiverName
        const partnerAvatar = message.receiverAvatar

        if (!messagesMap.has(partnerId)) {
          messagesMap.set(partnerId, {
            partnerId,
            partnerName,
            partnerAvatar,
            lastMessage: message,
            unreadCount: 0,
            messages: []
          })
        }

        const conversation = messagesMap.get(partnerId)
        conversation.messages.push(message)

        if (message.createdAt > conversation.lastMessage.createdAt) {
          conversation.lastMessage = message
        }
      })

      // Process received messages
      receivedSnapshot.forEach((doc) => {
        const message = { id: doc.id, ...doc.data() }
        const partnerId = message.senderId
        const partnerName = message.senderName
        const partnerAvatar = message.senderAvatar

        if (!messagesMap.has(partnerId)) {
          messagesMap.set(partnerId, {
            partnerId,
            partnerName,
            partnerAvatar,
            lastMessage: message,
            unreadCount: 0,
            messages: []
          })
        }

        const conversation = messagesMap.get(partnerId)
        conversation.messages.push(message)

        // Count unread messages (received by current user)
        if (!message.isRead) {
          conversation.unreadCount++
        }

        if (message.createdAt > conversation.lastMessage.createdAt) {
          conversation.lastMessage = message
        }
      })

      // Convert to array and sort by last message time
      const conversationsList = Array.from(messagesMap.values())
        .sort((a, b) => {
          const dateA = a.lastMessage.createdAt?.toDate ? a.lastMessage.createdAt.toDate() : new Date(a.lastMessage.createdAt)
          const dateB = b.lastMessage.createdAt?.toDate ? b.lastMessage.createdAt.toDate() : new Date(b.lastMessage.createdAt)
          return dateB - dateA
        })

      console.log('Processed conversations:', conversationsList.length)
      conversations.value = conversationsList
      return conversationsList
    } catch (err) {
      error.value = err
      console.error('Error loading conversations:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get messages for specific conversation
  const getConversationMessages = async (userId, partnerId) => {
    if (!userId || !partnerId) {
      console.log('Missing userId or partnerId')
      return []
    }

    console.log('Loading messages between:', userId, 'and', partnerId)
    isLoading.value = true
    error.value = null

    try {
      const messagesCollection = collection(db, 'messages')
      
      // Get sent messages
      const sentQuery = query(
        messagesCollection,
        and(where('senderId', '==', userId), where('receiverId', '==', partnerId)),
        orderBy('createdAt', 'asc'),
        limit(200)
      )

      // Get received messages
      const receivedQuery = query(
        messagesCollection,
        and(where('senderId', '==', partnerId), where('receiverId', '==', userId)),
        orderBy('createdAt', 'asc'),
        limit(200)
      )

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ])

      console.log('Messages sent:', sentSnapshot.size)
      console.log('Messages received:', receivedSnapshot.size)

      const messages = []

      sentSnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        })
      })

      receivedSnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        })
      })

      // Sort by createdAt
      messages.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateA - dateB
      })

      console.log('Total conversation messages:', messages.length)
      currentMessages.value = messages
      activeConversationId.value = partnerId
      
      return messages
    } catch (err) {
      error.value = err
      console.error('Error loading conversation messages:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Mark messages as read
  const markMessagesAsRead = async (userId, partnerId) => {
    if (!userId || !partnerId) return

    try {
      const messagesCollection = collection(db, 'messages')
      
      const q = query(
        messagesCollection,
        and(
          where('senderId', '==', partnerId),
          where('receiverId', '==', userId),
          where('isRead', '==', false)
        ),
        limit(100)
      )

      const querySnapshot = await getDocs(q)
      
      const promises = []
      querySnapshot.forEach((docSnap) => {
        const messageRef = doc(db, 'messages', docSnap.id)
        promises.push(updateDoc(messageRef, { isRead: true }))
      })

      if (promises.length > 0) {
        await Promise.all(promises)
        console.log('Marked', promises.length, 'messages as read')
      }
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  // Search users for messaging với multiple strategies
  const searchUsersForMessaging = async (searchTerm, currentUserId, limitCount = 10) => {
    if (!searchTerm?.trim() || !currentUserId) return []

    console.log('Searching for users with term:', searchTerm)

    try {
      const usersCollection = collection(db, 'users')
      const searchQuery = searchTerm.trim()
      const users = []

      // Strategy 1: Exact UserName search (case-sensitive)
      try {
        const exactQuery = query(
          usersCollection,
          where('UserName', '>=', searchQuery),
          where('UserName', '<=', searchQuery + '\uf8ff'),
          limit(limitCount)
        )
        
        const exactSnapshot = await getDocs(exactQuery)
        exactSnapshot.forEach((doc) => {
          const userData = doc.data()
          if (userData.UserID !== currentUserId) {
            users.push({
              id: doc.id,
              ...userData
            })
          }
        })
        
        console.log('Exact search results:', users.length)
      } catch (error) {
        console.log('Exact search failed:', error.message)
      }

      // Strategy 2: If no results, try case-insensitive search
      if (users.length === 0) {
        try {
          const allUsersQuery = query(usersCollection, limit(100))
          const allUsersSnapshot = await getDocs(allUsersQuery)
          
          const searchLower = searchQuery.toLowerCase()
          
          allUsersSnapshot.forEach((doc) => {
            const userData = doc.data()
            const userName = (userData.UserName || '').toLowerCase()
            const email = (userData.Email || '').toLowerCase()
            
            if (userData.UserID !== currentUserId && 
                (userName.includes(searchLower) || email.includes(searchLower))) {
              users.push({
                id: doc.id,
                ...userData
              })
            }
          })
          
          console.log('Case-insensitive search results:', users.length)
        } catch (error) {
          console.log('Case-insensitive search failed:', error.message)
        }
      }

      // Remove duplicates and limit results
      const uniqueUsers = users.filter((user, index, self) => 
        index === self.findIndex(u => u.UserID === user.UserID)
      ).slice(0, limitCount)

      console.log('Final search results:', uniqueUsers)
      return uniqueUsers

    } catch (err) {
      console.error('Error searching users:', err)
      return []
    }
  }

  // Setup real-time conversations listener (FIXED)
  const setupConversationsListener = (userId) => {
    if (!userId) return

    console.log('Setting up conversations listener for:', userId)

    // Clean up existing listener
    if (conversationsUnsubscribe) {
      conversationsUnsubscribe()
    }

    const messagesCollection = collection(db, 'messages')

    // Listen to sent messages
    const sentQuery = query(
      messagesCollection,
      where('senderId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    // Listen to received messages
    const receivedQuery = query(
      messagesCollection,
      where('receiverId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    let sentUnsubscribe = null
    let receivedUnsubscribe = null

    // Setup listeners
    sentUnsubscribe = onSnapshot(sentQuery, (snapshot) => {
      console.log('Sent messages updated, count:', snapshot.size)
      refreshConversationsFromSnapshot(userId)
    }, (error) => {
      console.error('Error in sent conversations listener:', error)
    })

    receivedUnsubscribe = onSnapshot(receivedQuery, (snapshot) => {
      console.log('Received messages updated, count:', snapshot.size)
      refreshConversationsFromSnapshot(userId)
    }, (error) => {
      console.error('Error in received conversations listener:', error)
    })

    // Combined unsubscribe function
    conversationsUnsubscribe = () => {
      if (sentUnsubscribe) sentUnsubscribe()
      if (receivedUnsubscribe) receivedUnsubscribe()
      console.log('Conversations listeners cleaned up')
    }

    // Initial load
    getConversations(userId)
  }

  // Setup real-time messages listener for active conversation (FIXED)
  const setupMessagesListener = (userId, partnerId) => {
    if (!userId || !partnerId) return

    console.log('Setting up messages listener between:', userId, 'and', partnerId)

    // Clean up existing listener
    if (messagesUnsubscribe) {
      messagesUnsubscribe()
    }

    const messagesCollection = collection(db, 'messages')
    
    // Listen to sent messages
    const sentQuery = query(
      messagesCollection,
      and(where('senderId', '==', userId), where('receiverId', '==', partnerId)),
      orderBy('createdAt', 'asc'),
      limit(200)
    )

    // Listen to received messages
    const receivedQuery = query(
      messagesCollection,
      and(where('senderId', '==', partnerId), where('receiverId', '==', userId)),
      orderBy('createdAt', 'asc'),
      limit(200)
    )

    let sentUnsubscribe = null
    let receivedUnsubscribe = null

    sentUnsubscribe = onSnapshot(sentQuery, (snapshot) => {
      console.log('Sent messages in conversation updated, count:', snapshot.size)
      refreshMessagesFromSnapshot(userId, partnerId)
    }, (error) => {
      console.error('Error in sent messages listener:', error)
    })

    receivedUnsubscribe = onSnapshot(receivedQuery, (snapshot) => {
      console.log('Received messages in conversation updated, count:', snapshot.size)
      refreshMessagesFromSnapshot(userId, partnerId)
    }, (error) => {
      console.error('Error in received messages listener:', error)
    })

    messagesUnsubscribe = () => {
      if (sentUnsubscribe) sentUnsubscribe()
      if (receivedUnsubscribe) receivedUnsubscribe()
      console.log('Messages listeners cleaned up')
    }

    // Initial load
    getConversationMessages(userId, partnerId)
  }

  // Helper function to refresh conversations from snapshots
  const refreshConversationsFromSnapshot = async (userId) => {
    try {
      await getConversations(userId)
    } catch (error) {
      console.error('Error refreshing conversations:', error)
    }
  }

  // Helper function to refresh messages from snapshots
  const refreshMessagesFromSnapshot = async (userId, partnerId) => {
    try {
      await getConversationMessages(userId, partnerId)
    } catch (error) {
      console.error('Error refreshing messages:', error)
    }
  }

  // Cleanup listeners
  const cleanupListeners = () => {
    console.log('Cleaning up all listeners')
    if (conversationsUnsubscribe) {
      conversationsUnsubscribe()
      conversationsUnsubscribe = null
    }
    if (messagesUnsubscribe) {
      messagesUnsubscribe()
      messagesUnsubscribe = null
    }
  }

  // Debug: Get all users
  const getAllUsers = async () => {
    try {
      const usersCollection = collection(db, 'users')
      const allUsersQuery = query(usersCollection, limit(20))
      const snapshot = await getDocs(allUsersQuery)
      
      const users = []
      snapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      console.log('All users in database:', users)
      return users
    } catch (error) {
      console.error('Error getting all users:', error)
      return []
    }
  }

  // Computed properties
  const totalUnreadCount = computed(() => {
    return conversations.value.reduce((total, conv) => total + conv.unreadCount, 0)
  })

  const hasActiveConversation = computed(() => {
    return !!activeConversationId.value
  })

  return {
    isLoading,
    error,
    conversations,
    currentMessages,
    activeConversationId,
    totalUnreadCount,
    hasActiveConversation,
    sendMessage,
    getConversations,
    getConversationMessages,
    markMessagesAsRead,
    searchUsersForMessaging,
    getAllUsers,
    setupConversationsListener,
    setupMessagesListener,
    cleanupListeners
  }
}