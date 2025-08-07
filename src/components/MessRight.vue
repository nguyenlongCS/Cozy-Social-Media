<!--
src/components/MessRight.vue
Component sidebar bên phải trang messages
Logic:
- Hiển thị danh sách conversations với avatar, tên, tin nhắn mới nhất
- Trạng thái unread count cho từng conversation
- Thanh tìm kiếm users để bắt đầu conversation mới
- Real-time updates với conversation list
- Emit selected conversation to parent
-->
<template>
  <div class="mess-right">
    <!-- Search section -->
    <div class="search-section">
      <h3 class="section-title">{{ getText('messages') }}</h3>
      
      <div class="search-container">
        <input
          v-model="searchTerm"
          type="text"
          class="search-input"
          :placeholder="getText('searchUsers')"
          @input="handleSearch"
        >
        <div class="search-icon"></div>
      </div>

      <!-- Search results -->
      <div v-if="showSearchResults" class="search-results">
        <div v-if="isSearching" class="search-loading">
          {{ getText('searching') }}...
        </div>
        <div v-else-if="searchResults.length === 0 && searchTerm.trim()" class="no-search-results">
          {{ getText('noUsersFound') }}
        </div>
        <div v-else class="search-users-list">
          <div
            v-for="searchUser in searchResults"
            :key="searchUser.UserID"
            class="search-user-item"
            @click="startConversationWithUser(searchUser)"
          >
            <div
              class="search-user-avatar"
              :style="{ backgroundImage: searchUser.Avatar ? `url(${searchUser.Avatar})` : '' }"
            ></div>
            <div class="search-user-info">
              <div class="search-user-name">{{ searchUser.UserName || getText('unknownUser') }}</div>
              <div class="search-user-email">{{ searchUser.Email }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Conversations list -->
    <div class="conversations-section">
      <div v-if="isLoadingConversations" class="conversations-loading">
        {{ getText('loading') }}...
      </div>

      <div v-else-if="conversations.length === 0" class="no-conversations">
        <div class="no-conversations-icon"></div>
        <p class="no-conversations-text">{{ getText('noConversationsYet') }}</p>
        <p class="no-conversations-hint">{{ getText('searchUsersToStart') }}</p>
      </div>

      <div v-else class="conversations-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.partnerId"
          class="conversation-item"
          :class="{ 
            active: selectedPartnerId === conversation.partnerId,
            unread: conversation.unreadCount > 0
          }"
          @click="selectConversation(conversation)"
        >
          <div class="conversation-avatar">
            <div
              class="avatar-image"
              :style="{ backgroundImage: conversation.partnerAvatar ? `url(${conversation.partnerAvatar})` : '' }"
            ></div>
            <div v-if="conversation.unreadCount > 0" class="unread-badge">
              {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
            </div>
          </div>

          <div class="conversation-content">
            <div class="conversation-header">
              <div class="partner-name">{{ conversation.partnerName || getText('unknownUser') }}</div>
              <div class="last-message-time">{{ formatConversationTime(conversation.lastMessage.createdAt) }}</div>
            </div>
            
            <div class="last-message">
              <span class="message-preview">
                <span v-if="conversation.lastMessage.senderId === currentUserId" class="you-prefix">
                  {{ getText('you') }}:
                </span>
                {{ getMessagePreview(conversation.lastMessage.content) }}
              </span>
              <div v-if="conversation.unreadCount > 0" class="unread-indicator"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useMessages } from '@/composables/useMessages'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'MessRight',
  emits: ['conversation-selected'],
  setup(props, { emit }) {
    const { user } = useAuth()
    const {
      conversations,
      isLoading: isLoadingConversations,
      getConversations,
      searchUsersForMessaging,
      getAllUsers, // Debug function
      setupConversationsListener,
      cleanupListeners
    } = useMessages()
    const { getText } = useLanguage()
    const { showError } = useErrorHandler()

    // Reactive state
    const selectedPartnerId = ref(null)
    const searchTerm = ref('')
    const searchResults = ref([])
    const isSearching = ref(false)
    const searchTimeout = ref(null)

    // Computed properties
    const currentUserId = computed(() => user.value?.uid)

    const showSearchResults = computed(() => {
      return searchTerm.value.trim().length > 0
    })

    // Search handling với debug logging
    const handleSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
      }

      searchTimeout.value = setTimeout(async () => {
        const query = searchTerm.value.trim()
        if (!query || !currentUserId.value) {
          searchResults.value = []
          return
        }

        console.log('Starting search for:', query)
        isSearching.value = true
        
        try {
          // Debug: Log current user info
          console.log('Current user ID:', currentUserId.value)
          
          // Try search
          const results = await searchUsersForMessaging(query, currentUserId.value)
          console.log('Search results received:', results)
          searchResults.value = results
          
          // Debug: If no results, try getting all users to see if there are any
          if (results.length === 0) {
            console.log('No search results, checking all users...')
            const allUsers = await getAllUsers()
            console.log('Total users in database:', allUsers.length)
            
            // Show some users as fallback if search returns nothing
            const fallbackUsers = allUsers
              .filter(user => user.UserID !== currentUserId.value)
              .slice(0, 5)
            
            if (fallbackUsers.length > 0) {
              console.log('Showing fallback users:', fallbackUsers)
              searchResults.value = fallbackUsers
            }
          }
        } catch (error) {
          console.error('Search error:', error)
          searchResults.value = []
          showError(error, 'search')
        } finally {
          isSearching.value = false
        }
      }, 300)
    }

    // Start conversation with searched user
    const startConversationWithUser = (searchUser) => {
      // Check if conversation already exists
      const existingConversation = conversations.value.find(
        conv => conv.partnerId === searchUser.UserID
      )

      if (existingConversation) {
        selectConversation(existingConversation)
      } else {
        // Create new conversation object
        const newConversation = {
          partnerId: searchUser.UserID,
          partnerName: searchUser.UserName,
          partnerAvatar: searchUser.Avatar,
          lastMessage: { content: '', createdAt: new Date() },
          unreadCount: 0
        }
        selectConversation(newConversation)
      }
      
      // Clear search
      searchTerm.value = ''
      searchResults.value = []
    }

    // Select conversation
    const selectConversation = (conversation) => {
      selectedPartnerId.value = conversation.partnerId
      
      emit('conversation-selected', {
        partnerId: conversation.partnerId,
        partnerName: conversation.partnerName,
        partnerAvatar: conversation.partnerAvatar
      })
    }

    // Format time for conversation list
    const formatConversationTime = (timestamp) => {
      if (!timestamp) return ''
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else {
        date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      }
      
      const now = new Date()
      const diffInMs = now - date
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

      if (diffInMinutes < 1) {
        return getText('justNow')
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}${getText('minutesAgo')}`
      } else if (diffInHours < 24) {
        return `${diffInHours}${getText('hoursAgo')}`
      } else if (diffInDays < 7) {
        return `${diffInDays}${getText('daysAgo')}`
      } else {
        return date.toLocaleDateString()
      }
    }

    // Get message preview (truncated)
    const getMessagePreview = (content) => {
      if (!content) return getText('noMessage')
      return content.length > 30 ? content.substring(0, 30) + '...' : content
    }

    // Load conversations
    const loadConversations = async () => {
      if (!currentUserId.value) return

      try {
        await getConversations(currentUserId.value)
      } catch (error) {
        showError(error, 'loadConversations')
      }
    }

    // Setup real-time listener
    const setupRealtimeListener = () => {
      if (currentUserId.value) {
        setupConversationsListener(currentUserId.value)
      }
    }

    // Watchers
    watch(currentUserId, (newUserId) => {
      console.log('MessRight: User changed to:', newUserId)
      if (newUserId) {
        loadConversations()
        setupRealtimeListener()
      } else {
        selectedPartnerId.value = null
        conversations.value = []
        cleanupListeners()
      }
    }, { immediate: true })

    // Lifecycle
    onMounted(() => {
      console.log('MessRight: Component mounted')
      if (currentUserId.value) {
        loadConversations()
        setupRealtimeListener()
      }
    })

    onUnmounted(() => {
      console.log('MessRight: Component unmounted, cleaning up')
      cleanupListeners()
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
      }
    })

    return {
      conversations,
      isLoadingConversations,
      selectedPartnerId,
      searchTerm,
      searchResults,
      isSearching,
      showSearchResults,
      currentUserId,
      getText,
      handleSearch,
      startConversationWithUser,
      selectConversation,
      formatConversationTime,
      getMessagePreview
    }
  }
}
</script>

<style scoped>
.mess-right {
  width: 22.13%;
  height: 100%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  color: var(--theme-color);
  font-size: 0.875rem;
  overflow: hidden;
}

/* Search section */
.search-section {
  flex-shrink: 0;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
}

.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0 0 0.75rem 0;
}

.search-container {
  position: relative;
  margin-bottom: 0.75rem;
}

.search-input {
  width: 100%;
  height: 2rem;
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 1rem;
  padding: 0 2rem 0 0.75rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.search-input:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0.25rem rgba(255, 235, 124, 0.3);
}

.search-input::placeholder {
  color: rgba(255, 235, 124, 0.6);
}

.search-icon {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  background: url('@/icons/search.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
  opacity: 0.6;
}

/* Search results */
.search-results {
  position: relative;
  max-height: 12rem;
  overflow-y: auto;
  background: rgba(255, 235, 124, 0.05);
  border: 1px solid rgba(255, 235, 124, 0.2);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-loading, .no-search-results {
  padding: 1rem;
  text-align: center;
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
}

.search-users-list {
  padding: 0.25rem;
}

.search-user-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-user-item:hover {
  background: rgba(255, 235, 124, 0.1);
}

.search-user-avatar {
  width: 2rem;
  height: 2rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid rgba(255, 235, 124, 0.3);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.search-user-info {
  flex: 1;
  min-width: 0;
}

.search-user-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 0.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-user-email {
  font-size: 0.625rem;
  color: rgba(255, 235, 124, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Conversations section */
.conversations-section {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  min-height: 0;
}

.conversations-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
}

.no-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem 1rem;
  gap: 0.5rem;
}

.no-conversations-icon {
  width: 2.5rem;
  height: 2.5rem;
  background: url('@/icons/mess.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
  opacity: 0.4;
}

.no-conversations-text, .no-conversations-hint {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
  margin: 0;
}

.no-conversations-hint {
  font-size: 0.625rem !important;
  opacity: 0.8;
}

/* Conversations list */
.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.conversation-item:hover {
  background: rgba(255, 235, 124, 0.05);
  border-color: rgba(255, 235, 124, 0.2);
}

.conversation-item.active {
  background: rgba(255, 235, 124, 0.1);
  border-color: var(--theme-color);
}

.conversation-item.unread {
  background: rgba(255, 235, 124, 0.08);
}

.conversation-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-image {
  width: 2.5rem;
  height: 2.5rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid rgba(255, 235, 124, 0.3);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
}

.unread-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: #ff4757;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  min-width: 1rem;
  text-align: center;
  line-height: 1;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.2);
}

.conversation-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.conversation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.partner-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.last-message-time {
  font-size: 0.625rem;
  color: rgba(255, 235, 124, 0.6);
  flex-shrink: 0;
}

.last-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.message-preview {
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.you-prefix {
  font-weight: 500;
  color: var(--theme-color);
}

.unread-indicator {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--theme-color);
  border-radius: 50%;
  flex-shrink: 0;
}

/* Scrollbar styling */
.conversations-section::-webkit-scrollbar,
.search-results::-webkit-scrollbar {
  width: 0.25rem;
}

.conversations-section::-webkit-scrollbar-track,
.search-results::-webkit-scrollbar-track {
  background: rgba(255, 235, 124, 0.1);
}

.conversations-section::-webkit-scrollbar-thumb,
.search-results::-webkit-scrollbar-thumb {
  background: rgba(255, 235, 124, 0.3);
  border-radius: 0.125rem;
}

.conversations-section::-webkit-scrollbar-thumb:hover,
.search-results::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 235, 124, 0.5);
}
</style>