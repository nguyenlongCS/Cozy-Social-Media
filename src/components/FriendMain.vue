<!--
src/components/FriendMain.vue - Refactored
Component chính hiển thị danh sách friends
Logic:
- Hiển thị friends, suggestions, requests dựa vào activeTab
- Xử lý các actions: gửi/chấp nhận/từ chối lời mời, hủy kết bạn
- Auto-populate user info cho các items
- Business logic đã được tách ra composables
-->
<template>
  <div class="friend-main">
    <!-- Loading state -->
    <div v-if="isLoading" class="content-container loading-state">
      <div class="loading-text">{{ getText('loading') }}...</div>
    </div>

    <!-- Friends List -->
    <div v-else-if="activeTab === 'friends'" class="content-container">
      <div v-if="friendsList.length === 0" class="empty-state">
        <div class="empty-text">{{ getText('noFriendsYet') }}</div>
      </div>
      <div v-else class="friends-list">
        <div 
          v-for="friend in friendsList" 
          :key="friend.id"
          class="friend-card"
        >
          <div class="friend-info">
            <div 
              class="friend-avatar"
              :style="{ backgroundImage: friend.userInfo?.Avatar ? `url(${friend.userInfo.Avatar})` : '' }"
            ></div>
            <div class="friend-details">
              <div class="friend-name">{{ friend.userInfo?.UserName || getText('unknownUser') }}</div>
              <div class="friend-email">{{ friend.userInfo?.Email || '' }}</div>
              <div class="friend-date">{{ getText('friendsSince') }}: {{ formatDate(friend.updatedAt) }}</div>
            </div>
          </div>
          <div class="friend-actions">
            <button 
              class="unfriend-btn"
              @click="handleUnfriend(friend)"
              :disabled="actionLoading"
            >
              {{ getText('unfriend') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Friend Suggestions -->
    <div v-else-if="activeTab === 'suggestions'" class="content-container">
      <div v-if="suggestionsList.length === 0" class="empty-state">
        <div class="empty-text">{{ getText('noSuggestions') }}</div>
      </div>
      <div v-else class="suggestions-list">
        <div 
          v-for="suggestion in suggestionsList" 
          :key="suggestion.UserID"
          class="suggestion-card"
        >
          <div class="suggestion-info">
            <div 
              class="suggestion-avatar"
              :style="{ backgroundImage: suggestion.Avatar ? `url(${suggestion.Avatar})` : '' }"
            ></div>
            <div class="suggestion-details">
              <div class="suggestion-name">{{ suggestion.UserName || getText('unknownUser') }}</div>
              <div class="suggestion-email">{{ suggestion.Email || '' }}</div>
              <div class="suggestion-date">{{ getText('joinedOn') }}: {{ formatDate(suggestion.Created) }}</div>
            </div>
          </div>
          <div class="suggestion-actions">
            <button 
              class="add-friend-btn"
              @click="handleSendRequest(suggestion.UserID)"
              :disabled="actionLoading"
            >
              {{ getText('addFriend') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Friend Requests -->
    <div v-else-if="activeTab === 'requests'" class="content-container">
      <div v-if="requestsList.length === 0" class="empty-state">
        <div class="empty-text">{{ getText('noFriendRequests') }}</div>
      </div>
      <div v-else class="requests-list">
        <div 
          v-for="request in requestsList" 
          :key="request.id"
          class="request-card"
        >
          <div class="request-info">
            <div 
              class="request-avatar"
              :style="{ backgroundImage: request.senderInfo?.Avatar ? `url(${request.senderInfo.Avatar})` : '' }"
            ></div>
            <div class="request-details">
              <div class="request-name">{{ request.senderInfo?.UserName || getText('unknownUser') }}</div>
              <div class="request-email">{{ request.senderInfo?.Email || '' }}</div>
              <div class="request-date">{{ getText('requestSent') }}: {{ formatDate(request.createdAt) }}</div>
            </div>
          </div>
          <div class="request-actions">
            <button 
              class="accept-btn"
              @click="handleAcceptRequest(request.id)"
              :disabled="actionLoading"
            >
              {{ getText('accept') }}
            </button>
            <button 
              class="reject-btn"
              @click="handleRejectRequest(request.id)"
              :disabled="actionLoading"
            >
              {{ getText('reject') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Default empty state -->
    <div v-else class="content-container">
      <div class="empty-state">
        <div class="empty-text">{{ getText('selectOption') }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'
import { useFriends } from '@/composables/useFriends'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'FriendMain',
  props: {
    activeTab: {
      type: String,
      default: 'friends'
    }
  },
  emits: ['data-updated'],
  setup(props, { emit }) {
    const { user } = useAuth()
    const { getUserById } = useUsers()
    const { 
      getFriends, 
      getFriendRequests, 
      getFriendSuggestions,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriendship,
      isLoading
    } = useFriends()
    const { getText } = useLanguage()
    const { showError, showSuccess } = useErrorHandler()

    // Reactive state
    const friendsList = ref([])
    const suggestionsList = ref([])
    const requestsList = ref([])
    const actionLoading = ref(false)

    // Computed
    const currentUserId = computed(() => user.value?.uid)

    // Data loading methods
    const loadFriends = async () => {
      if (!currentUserId.value) return

      try {
        const friends = await getFriends(currentUserId.value)
        
        // Populate user info for friends
        for (const friend of friends) {
          const userInfo = await getUserById(friend.friendId)
          friend.userInfo = userInfo
        }
        
        friendsList.value = friends
      } catch (error) {
        console.error('Error loading friends:', error)
        showError(error, 'loadFriends')
      }
    }

    const loadSuggestions = async () => {
      if (!currentUserId.value) return

      try {
        const suggestions = await getFriendSuggestions(currentUserId.value)
        suggestionsList.value = suggestions
      } catch (error) {
        console.error('Error loading suggestions:', error)
        showError(error, 'loadSuggestions')
      }
    }

    const loadRequests = async () => {
      if (!currentUserId.value) return

      try {
        const requests = await getFriendRequests(currentUserId.value)
        
        // Populate sender info for requests
        for (const request of requests) {
          const senderInfo = await getUserById(request.senderId)
          request.senderInfo = senderInfo
        }
        
        requestsList.value = requests
      } catch (error) {
        console.error('Error loading friend requests:', error)
        showError(error, 'loadRequests')
      }
    }

    // Action handlers
    const handleUnfriend = async (friend) => {
      if (!confirm(getText('confirmUnfriend'))) return

      actionLoading.value = true
      try {
        await removeFriendship(friend.id)
        showSuccess('unfriend')
        await loadFriends()
        emit('data-updated')
      } catch (error) {
        console.error('Error unfriending:', error)
        showError(error, 'unfriend')
      } finally {
        actionLoading.value = false
      }
    }

    const handleSendRequest = async (receiverId) => {
      if (!currentUserId.value) return

      actionLoading.value = true
      try {
        await sendFriendRequest(currentUserId.value, receiverId)
        showSuccess('friendRequestSent')
        await loadSuggestions()
        emit('data-updated')
      } catch (error) {
        console.error('Error sending friend request:', error)
        showError(error, 'sendRequest')
      } finally {
        actionLoading.value = false
      }
    }

    const handleAcceptRequest = async (requestId) => {
      actionLoading.value = true
      try {
        await acceptFriendRequest(requestId)
        showSuccess('friendRequestAccepted')
        await loadRequests()
        await loadFriends()
        emit('data-updated')
      } catch (error) {
        console.error('Error accepting friend request:', error)
        showError(error, 'acceptRequest')
      } finally {
        actionLoading.value = false
      }
    }

    const handleRejectRequest = async (requestId) => {
      actionLoading.value = true
      try {
        await rejectFriendRequest(requestId)
        showSuccess('friendRequestRejected')
        await loadRequests()
        emit('data-updated')
      } catch (error) {
        console.error('Error rejecting friend request:', error)
        showError(error, 'rejectRequest')
      } finally {
        actionLoading.value = false
      }
    }

    // Format date helper
    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else {
        date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      }
      
      return date.toLocaleDateString()
    }

    // Load data based on active tab
    const loadDataForTab = async (tab) => {
      if (!currentUserId.value) return

      switch (tab) {
        case 'friends':
          await loadFriends()
          break
        case 'suggestions':
          await loadSuggestions()
          break
        case 'requests':
          await loadRequests()
          break
      }
    }

    // Watchers
    watch(() => props.activeTab, (newTab) => {
      loadDataForTab(newTab)
    }, { immediate: true })

    watch(currentUserId, (newUserId) => {
      if (newUserId) {
        loadDataForTab(props.activeTab)
      }
    }, { immediate: true })

    // Lifecycle
    onMounted(() => {
      if (currentUserId.value) {
        loadDataForTab(props.activeTab)
      }
    })

    return {
      friendsList,
      suggestionsList,
      requestsList,
      isLoading,
      actionLoading,
      getText,
      formatDate,
      handleUnfriend,
      handleSendRequest,
      handleAcceptRequest,
      handleRejectRequest
    }
  }
}
</script>

<style scoped>
.friend-main {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.content-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1rem;
}

.loading-state, .empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.loading-text, .empty-text {
  color: var(--theme-color);
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
}

/* Friend Cards */
.friends-list, .suggestions-list, .requests-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.friend-card, .suggestion-card, .request-card {
  background: rgba(255, 235, 124, 0.05);
  border: 1px solid rgba(255, 235, 124, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.friend-card:hover, .suggestion-card:hover, .request-card:hover {
  background: rgba(255, 235, 124, 0.1);
  border-color: rgba(255, 235, 124, 0.4);
}

.friend-info, .suggestion-info, .request-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.friend-avatar, .suggestion-avatar, .request-avatar {
  width: 2.5rem;
  height: 2.5rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.friend-details, .suggestion-details, .request-details {
  flex: 1;
}

.friend-name, .suggestion-name, .request-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 0.125rem;
}

.friend-email, .suggestion-email, .request-email {
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.7);
  margin-bottom: 0.125rem;
}

.friend-date, .suggestion-date, .request-date {
  font-size: 0.625rem;
  color: rgba(255, 235, 124, 0.5);
}

/* Action Buttons */
.friend-actions, .suggestion-actions, .request-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.unfriend-btn, .add-friend-btn, .accept-btn, .reject-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid;
}

.unfriend-btn {
  background: rgba(255, 107, 107, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.unfriend-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.2);
  transform: scale(1.05);
}

.add-friend-btn, .accept-btn {
  background: var(--theme-color);
  border-color: var(--theme-color);
  color: #2B2D42;
}

.add-friend-btn:hover:not(:disabled), .accept-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0.125rem 0.25rem rgba(255, 235, 124, 0.3);
}

.reject-btn {
  background: rgba(255, 235, 124, 0.1);
  border-color: rgba(255, 235, 124, 0.3);
  color: var(--theme-color);
}

.reject-btn:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
  transform: scale(1.05);
}

.unfriend-btn:disabled, .add-friend-btn:disabled, 
.accept-btn:disabled, .reject-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>