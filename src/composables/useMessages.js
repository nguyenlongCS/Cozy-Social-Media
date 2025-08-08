/*
src/composables/useMessages.js
Messages system với Firebase Realtime Database cho realtime updates
Logic: CRUD operations và real-time listeners với RTDB structure
*/

import { ref, computed } from 'vue'
import { 
  ref as dbRef, 
  push, 
  set,
  get,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  onValue,
  off,
  serverTimestamp,
  update
} from 'firebase/database'
import { 
  getFirestore, 
  collection, 
  query as firestoreQuery,
  where,
  limit,
  getDocs
} from 'firebase/firestore'
import { rtdb } from '@/firebase/config'
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
  let conversationsListeners = []
  let messagesListener = null

  // Send message với Realtime Database
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
      // Get user info
      const senderInfo = await getUserById(senderId)
      const receiverInfo = await getUserById(receiverId)
      
      if (!senderInfo || !receiverInfo) {
        throw new Error('USER_NOT_FOUND')
      }

      // Create conversation ID (consistent ordering)
      const conversationId = [senderId, receiverId].sort().join('_')
      
      // Create message data with current timestamp
      const currentTimestamp = Date.now()
      const messageData = {
        senderId: senderId,
        receiverId: receiverId,
        senderName: senderInfo.UserName || 'Unknown',
        senderAvatar: senderInfo.Avatar || null,
        receiverName: receiverInfo.UserName || 'Unknown',
        receiverAvatar: receiverInfo.Avatar || null,
        content: content.trim(),
        timestamp: currentTimestamp,
        isRead: false
      }

      // Save to messages node
      const messagesRef = dbRef(rtdb, 'messages')
      const newMessageRef = push(messagesRef)
      await set(newMessageRef, messageData)

      // Get current unread count for receiver
      const receiverConvRef = dbRef(rtdb, `conversations/${receiverId}/${senderId}`)
      const receiverConvSnapshot = await get(receiverConvRef)
      const currentUnreadCount = receiverConvSnapshot.exists() ? 
        (receiverConvSnapshot.val().unreadCount || 0) : 0

      // Update conversations for both users with current timestamp
      const updates = {}
      updates[`conversations/${senderId}/${receiverId}`] = {
        partnerId: receiverId,
        partnerName: receiverInfo.UserName || 'Unknown',
        partnerAvatar: receiverInfo.Avatar || null,
        lastMessage: {
          content: content.trim(),
          timestamp: currentTimestamp,
          senderId: senderId
        },
        unreadCount: 0, // Sender doesn't have unread
        updatedAt: currentTimestamp
      }

      updates[`conversations/${receiverId}/${senderId}`] = {
        partnerId: senderId,
        partnerName: senderInfo.UserName || 'Unknown',
        partnerAvatar: senderInfo.Avatar || null,
        lastMessage: {
          content: content.trim(),
          timestamp: currentTimestamp,
          senderId: senderId
        },
        unreadCount: currentUnreadCount + 1,
        updatedAt: currentTimestamp
      }

      return {
        id: newMessageRef.key,
        ...messageData
      }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get conversations từ Realtime Database
  const getConversations = async (userId) => {
    if (!userId) return []

    isLoading.value = true
    error.value = null

    try {
      const userConversationsRef = dbRef(rtdb, `conversations/${userId}`)
      const snapshot = await get(userConversationsRef)

      if (!snapshot.exists()) {
        conversations.value = []
        return []
      }

      const conversationsData = snapshot.val()
      const conversationsList = Object.entries(conversationsData).map(([partnerId, data]) => ({
        partnerId,
        partnerName: data.partnerName,
        partnerAvatar: data.partnerAvatar,
        lastMessage: data.lastMessage || { content: '', timestamp: Date.now() },
        unreadCount: data.unreadCount || 0,
        updatedAt: data.updatedAt
      }))

      // Sort by last message timestamp
      conversationsList.sort((a, b) => {
        const timeA = a.lastMessage.timestamp || 0
        const timeB = b.lastMessage.timestamp || 0
        return timeB - timeA
      })

      conversations.value = conversationsList
      return conversationsList
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get messages cho conversation cụ thể
  const getConversationMessages = async (userId, partnerId) => {
    if (!userId || !partnerId) return []

    isLoading.value = true
    error.value = null

    try {
      const messagesRef = dbRef(rtdb, 'messages')
      
      // Query messages between two users
      const sentQuery = query(
        messagesRef,
        orderByChild('senderId'),
        equalTo(userId)
      )
      
      const receivedQuery = query(
        messagesRef,
        orderByChild('senderId'), 
        equalTo(partnerId)
      )

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        get(sentQuery),
        get(receivedQuery)
      ])

      const messages = []

      // Process sent messages
      if (sentSnapshot.exists()) {
        Object.entries(sentSnapshot.val()).forEach(([key, data]) => {
          if (data.receiverId === partnerId) {
            messages.push({
              id: key,
              ...data
            })
          }
        })
      }

      // Process received messages
      if (receivedSnapshot.exists()) {
        Object.entries(receivedSnapshot.val()).forEach(([key, data]) => {
          if (data.receiverId === userId) {
            messages.push({
              id: key,
              ...data
            })
          }
        })
      }

      // Sort by timestamp
      messages.sort((a, b) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        return timeA - timeB
      })

      currentMessages.value = messages
      activeConversationId.value = partnerId
      
      return messages
    } catch (err) {
      error.value = err
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Mark messages as read và update conversation
  const markMessagesAsRead = async (userId, partnerId) => {
    if (!userId || !partnerId) return

    try {
      // Get all messages in conversation
      const messagesRef = dbRef(rtdb, 'messages')
      const snapshot = await get(messagesRef)
      
      if (snapshot.exists()) {
        const updates = {}
        let hasUnreadMessages = false
        
        Object.entries(snapshot.val()).forEach(([messageId, messageData]) => {
          // Mark messages sent by partner to current user as read
          if (messageData.senderId === partnerId && 
              messageData.receiverId === userId && 
              !messageData.isRead) {
            updates[`messages/${messageId}/isRead`] = true
            hasUnreadMessages = true
          }
        })

        // Update messages if there are unread ones
        if (Object.keys(updates).length > 0) {
          await update(dbRef(rtdb), updates)
        }

        // Reset unread count in user's conversation
        if (hasUnreadMessages) {
          const conversationRef = dbRef(rtdb, `conversations/${userId}/${partnerId}`)
          const conversationSnapshot = await get(conversationRef)
          
          if (conversationSnapshot.exists()) {
            const conversationData = conversationSnapshot.val()
            await update(conversationRef, {
              ...conversationData,
              unreadCount: 0
            })
          }
        }
      }
    } catch (err) {
      // Silent fail để không break flow
      console.error('Error marking messages as read:', err)
    }
  }

  // Mark single message as read khi gửi thành công
  const markMessageAsDelivered = async (messageId) => {
    if (!messageId) return

    try {
      const messageRef = dbRef(rtdb, `messages/${messageId}`)
      await update(messageRef, {
        isDelivered: true,
        deliveredAt: Date.now()
      })
    } catch (err) {
      // Silent fail
      console.error('Error marking message as delivered:', err)
    }
  }

  // Search users cho messaging với optimization
  const searchUsersForMessaging = async (searchTerm, currentUserId, limitCount = 10) => {
    if (!searchTerm?.trim() || !currentUserId) return []

    try {
      const usersCollection = collection(db, 'users')
      const searchQuery = searchTerm.trim().toLowerCase()
      const users = []

      // Strategy 1: Exact UserName search (case-insensitive)
      try {
        // Search by UserName starting with search term
        const exactQuery = firestoreQuery(
          usersCollection,
          where('UserName', '>=', searchTerm),
          where('UserName', '<=', searchTerm + '\uf8ff'),
          limit(limitCount)
        )
        
        const exactSnapshot = await getDocs(exactQuery)
        exactSnapshot.forEach((doc) => {
          const userData = doc.data()
          if (userData.UserID !== currentUserId && userData.UserName) {
            users.push({
              id: doc.id,
              UserID: userData.UserID,
              UserName: userData.UserName,
              Avatar: userData.Avatar || null
              // Không include Email để ẩn thông tin cá nhân
            })
          }
        })
      } catch (error) {
        console.log('Exact search failed, trying fallback')
      }

      // Strategy 2: Fallback - case-insensitive contains search
      if (users.length === 0) {
        try {
          const allUsersQuery = firestoreQuery(usersCollection, limit(50))
          const allUsersSnapshot = await getDocs(allUsersQuery)
          
          allUsersSnapshot.forEach((doc) => {
            const userData = doc.data()
            const userName = (userData.UserName || '').toLowerCase()
            
            // Chỉ search theo UserName, không search email để bảo mật
            if (userData.UserID !== currentUserId && 
                userData.UserName && 
                userName.includes(searchQuery)) {
              users.push({
                id: doc.id,
                UserID: userData.UserID,
                UserName: userData.UserName,
                Avatar: userData.Avatar || null
              })
            }
          })
        } catch (error) {
          console.error('Fallback search failed:', error)
        }
      }

      // Remove duplicates và sort theo relevance
      const uniqueUsers = users.filter((user, index, self) => 
        index === self.findIndex(u => u.UserID === user.UserID)
      )

      // Sort by relevance: exact match first, then contains
      uniqueUsers.sort((a, b) => {
        const aName = a.UserName.toLowerCase()
        const bName = b.UserName.toLowerCase()
        
        // Exact match gets priority
        const aExact = aName === searchQuery ? 0 : 1
        const bExact = bName === searchQuery ? 0 : 1
        
        if (aExact !== bExact) return aExact - bExact
        
        // Then by starts with
        const aStarts = aName.startsWith(searchQuery) ? 0 : 1
        const bStarts = bName.startsWith(searchQuery) ? 0 : 1
        
        if (aStarts !== bStarts) return aStarts - bStarts
        
        // Finally alphabetical
        return aName.localeCompare(bName)
      })

      return uniqueUsers.slice(0, limitCount)

    } catch (err) {
      console.error('Search error:', err)
      return []
    }
  }

  // Setup real-time conversations listener
  const setupConversationsListener = (userId) => {
    if (!userId) return

    cleanupConversationsListeners()

    const userConversationsRef = dbRef(rtdb, `conversations/${userId}`)
    
    const conversationUnsubscribe = onValue(userConversationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const conversationsData = snapshot.val()
        const conversationsList = Object.entries(conversationsData).map(([partnerId, data]) => ({
          partnerId,
          partnerName: data.partnerName,
          partnerAvatar: data.partnerAvatar,
          lastMessage: data.lastMessage || { content: '', timestamp: Date.now() },
          unreadCount: data.unreadCount || 0,
          updatedAt: data.updatedAt
        }))

        // Sort by last message timestamp
        conversationsList.sort((a, b) => {
          const timeA = a.lastMessage.timestamp || 0
          const timeB = b.lastMessage.timestamp || 0
          return timeB - timeA
        })

        conversations.value = conversationsList
      } else {
        conversations.value = []
      }
    }, (error) => {
      console.error('Error in conversations listener:', error)
    })

    // Also listen to all messages để update conversations real-time khi có tin nhắn mới
    const messagesRef = dbRef(rtdb, 'messages')
    const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        // Force refresh conversations khi có message mới
        refreshConversationsFromMessages(userId, snapshot.val())
      }
    }, (error) => {
      console.error('Error in messages listener:', error)
    })

    conversationsListeners.push(conversationUnsubscribe)
    conversationsListeners.push(messagesUnsubscribe)
  }

  // Helper function để refresh conversations từ messages
  const refreshConversationsFromMessages = async (userId, allMessages) => {
    try {
      const conversationsMap = new Map()
      
      // Process all messages to build conversations
      Object.entries(allMessages).forEach(([messageId, messageData]) => {
        let partnerId = null
        let isIncoming = false
        
        // Determine partner và direction
        if (messageData.senderId === userId) {
          partnerId = messageData.receiverId
          isIncoming = false
        } else if (messageData.receiverId === userId) {
          partnerId = messageData.senderId
          isIncoming = true
        }
        
        if (!partnerId) return
        
        // Get or create conversation
        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            partnerId,
            partnerName: isIncoming ? messageData.senderName : messageData.receiverName,
            partnerAvatar: isIncoming ? messageData.senderAvatar : messageData.receiverAvatar,
            lastMessage: messageData,
            unreadCount: 0,
            messages: []
          })
        }
        
        const conversation = conversationsMap.get(partnerId)
        conversation.messages.push(messageData)
        
        // Update last message if this is newer
        if (messageData.timestamp > conversation.lastMessage.timestamp) {
          conversation.lastMessage = {
            content: messageData.content,
            timestamp: messageData.timestamp,
            senderId: messageData.senderId
          }
        }
        
        // Count unread messages (messages sent to current user that are unread)
        if (isIncoming && !messageData.isRead) {
          conversation.unreadCount++
        }
      })
      
      // Convert to array and sort
      const conversationsList = Array.from(conversationsMap.values())
        .sort((a, b) => {
          const timeA = a.lastMessage.timestamp || 0
          const timeB = b.lastMessage.timestamp || 0
          return timeB - timeA
        })
      
      conversations.value = conversationsList
    } catch (error) {
      console.error('Error refreshing conversations from messages:', error)
    }
  }

  // Setup real-time messages listener
  const setupMessagesListener = (userId, partnerId) => {
    if (!userId || !partnerId) return

    cleanupMessagesListener()

    const messagesRef = dbRef(rtdb, 'messages')
    
    messagesListener = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const allMessages = snapshot.val()
        const conversationMessages = []

        Object.entries(allMessages).forEach(([messageId, messageData]) => {
          // Check if message belongs to this conversation
          if ((messageData.senderId === userId && messageData.receiverId === partnerId) ||
              (messageData.senderId === partnerId && messageData.receiverId === userId)) {
            conversationMessages.push({
              id: messageId,
              ...messageData
            })
          }
        })

        // Sort by timestamp
        conversationMessages.sort((a, b) => {
          const timeA = a.timestamp || 0
          const timeB = b.timestamp || 0
          return timeA - timeB
        })

        currentMessages.value = conversationMessages
        activeConversationId.value = partnerId
      }
    })
  }

  // Cleanup functions
  const cleanupConversationsListeners = () => {
    conversationsListeners.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe()
    })
    conversationsListeners = []
  }

  const cleanupMessagesListener = () => {
    if (messagesListener) {
      messagesListener()
      messagesListener = null
    }
  }

  const cleanupListeners = () => {
    cleanupConversationsListeners()
    cleanupMessagesListener()
  }

  // Debug function
  const getAllUsers = async () => {
    try {
      const usersCollection = collection(db, 'users')
      const allUsersQuery = firestoreQuery(usersCollection, limit(20))
      const snapshot = await getDocs(allUsersQuery)
      
      const users = []
      snapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      return users
    } catch (error) {
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
    markMessageAsDelivered,
    searchUsersForMessaging,
    getAllUsers,
    setupConversationsListener,
    setupMessagesListener,
    cleanupListeners
  }
}