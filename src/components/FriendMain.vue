<!--
src/components/FriendMain.vue - Updated để hiển thị TẤT CẢ users xung quanh
Component chính hiển thị nội dung friends với map support
UPDATED: Nearby section hiển thị tất cả users xung quanh (không chỉ friends)
Logic: Hiển thị friends, suggestions, requests, nearby users dựa vào activeTab
Thêm section "nearby" để hiển thị Mapbox map với TẤT CẢ user locations xung quanh
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

    <!-- Nearby Users Map - UPDATED để hiển thị tất cả users -->
    <div v-else-if="activeTab === 'nearby'" class="content-container nearby-container">
      <!-- Map Controls -->
      <div class="map-controls">
        <h3 class="map-title">{{ getText('nearbyUsers') }} ({{ SEARCH_RADIUS_KM }}km)</h3>
        <div class="control-buttons">
          <button 
            class="location-btn"
            @click="handleGetLocation"
            :disabled="nearbyLoading"
          >
            {{ nearbyLoading ? getText('loading') : getText('getLocation') }}
          </button>
          <button 
            class="refresh-btn"
            @click="handleRefreshNearby"
            :disabled="!hasLocation || nearbyLoading"
          >
            {{ getText('refresh') }}
          </button>
          <button 
            class="list-btn"
            @click="toggleViewMode"
            :disabled="!hasLocation"
          >
            {{ showMapView ? getText('listView') : getText('mapView') }}
          </button>
        </div>
      </div>

      <!-- Location Permission Request -->
      <div v-if="!hasLocation && !nearbyLoading" class="location-request">
        <h4>{{ getText('locationPermissionRequired') }}</h4>
        <p>{{ getText('locationPermissionDescription') }}</p>
        <button class="get-location-btn" @click="handleGetLocation">
          {{ getText('allowLocation') }}
        </button>
      </div>

      <!-- Map Container -->
      <div v-else-if="hasLocation" class="map-section">
        <!-- Map View -->
        <div v-if="showMapView" id="nearby-map" class="mapbox-map"></div>
        
        <!-- List View - UPDATED để hiển thị nearby users -->
        <div v-else class="nearby-list-view">
          <div v-if="nearbyFriends.length === 0" class="no-nearby-list">
            <div class="no-nearby-icon">🔍</div>
            <p>{{ getText('noNearbyUsers') }}</p>
            <small>{{ getText('searchRadius') }}: {{ SEARCH_RADIUS_KM }}km</small>
          </div>
          <div v-else class="nearby-friends-full-list">
            <div 
              v-for="nearbyUser in nearbyFriends" 
              :key="nearbyUser.userId"
              class="nearby-friend-card"
            >
              <div class="nearby-friend-info">
                <div 
                  class="nearby-friend-avatar"
                  :style="{ backgroundImage: nearbyUser.userInfo?.Avatar ? `url(${nearbyUser.userInfo.Avatar})` : '' }"
                ></div>
                <div class="nearby-friend-details">
                  <div class="nearby-friend-name">{{ nearbyUser.userInfo?.UserName || getText('unknownUser') }}</div>
                  <div class="nearby-friend-distance">{{ nearbyUser.distance }}km {{ getText('distanceAway') }}</div>
                </div>
              </div>
              <!-- UPDATED: Thêm action button để kết bạn với nearby users -->
              <div class="nearby-friend-actions">
                <button 
                  class="add-nearby-friend-btn"
                  @click="handleAddNearbyFriend(nearbyUser.userId)"
                  :disabled="actionLoading"
                >
                  {{ getText('addFriend') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="locationError" class="location-error">
        <div class="error-icon">⚠️</div>
        <h4>{{ getText('locationError') }}</h4>
        <p>{{ locationError }}</p>
        <button class="retry-btn" @click="handleGetLocation">{{ getText('retryLocation') }}</button>
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'
import { useFriends } from '@/composables/useFriends'
import { useNearbyFriends } from '@/composables/useNearbyFriends'
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
    const {
      initializeNearbyFriends,
      initializeMap,
      refreshNearbyFriends,
      nearbyFriends, // Tên giữ nguyên cho compatibility, thực tế là nearbyUsers
      hasLocation,
      isLoading: nearbyLoading,
      cleanup: cleanupNearby,
      SEARCH_RADIUS_KM
    } = useNearbyFriends()
    const { getText } = useLanguage()
    const { showError, showSuccess } = useErrorHandler()

    // Reactive state
    const friendsList = ref([])
    const suggestionsList = ref([])
    const requestsList = ref([])
    const actionLoading = ref(false)
    const locationError = ref('')
    const showMapView = ref(true) // Toggle between map and list view

    const currentUserId = computed(() => user.value?.uid)

    // Data loading methods (existing - không thay đổi)
    const loadFriends = async () => {
      if (!currentUserId.value) return

      try {
        const friends = await getFriends(currentUserId.value)
        
        for (const friend of friends) {
          const userInfo = await getUserById(friend.friendId)
          friend.userInfo = userInfo
        }
        
        friendsList.value = friends
      } catch (error) {
        showError(error, 'loadFriends')
      }
    }

    const loadSuggestions = async () => {
      if (!currentUserId.value) return

      try {
        const suggestions = await getFriendSuggestions(currentUserId.value)
        suggestionsList.value = suggestions
      } catch (error) {
        showError(error, 'loadSuggestions')
      }
    }

    const loadRequests = async () => {
      if (!currentUserId.value) return

      try {
        const requests = await getFriendRequests(currentUserId.value)
        
        for (const request of requests) {
          const senderInfo = await getUserById(request.senderId)
          request.senderInfo = senderInfo
        }
        
        requestsList.value = requests
      } catch (error) {
        showError(error, 'loadRequests')
      }
    }

    // Action handlers (existing - không thay đổi)
    const handleUnfriend = async (friend) => {
      if (!confirm(getText('confirmUnfriend'))) return

      actionLoading.value = true
      try {
        await removeFriendship(friend.id)
        showSuccess('unfriend')
        await loadFriends()
        emit('data-updated')
      } catch (error) {
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
        showError(error, 'rejectRequest')
      } finally {
        actionLoading.value = false
      }
    }

    // UPDATED: Handler để kết bạn với nearby users
    const handleAddNearbyFriend = async (receiverId) => {
      if (!currentUserId.value) return

      actionLoading.value = true
      try {
        await sendFriendRequest(currentUserId.value, receiverId)
        showSuccess('friendRequestSent')
        emit('data-updated')
      } catch (error) {
        showError(error, 'sendRequest')
      } finally {
        actionLoading.value = false
      }
    }

    // Nearby Users handlers - UPDATED
    const handleGetLocation = async () => {
      locationError.value = ''
      
      try {
        await initializeNearbyFriends()
        
        // Initialize map sau khi có location và đang ở map view
        await nextTick()
        if (hasLocation.value && showMapView.value) {
          // Delay một chút để DOM render xong
          setTimeout(() => {
            try {
              initializeMap('nearby-map')
            } catch (error) {
              console.warn('Map initialization warning:', error)
            }
          }, 100)
        }
        
      } catch (error) {
        locationError.value = error.message || 'Không thể lấy vị trí'
      }
    }

    const handleRefreshNearby = async () => {
      try {
        await refreshNearbyFriends()
      } catch (error) {
        locationError.value = error.message || 'Không thể làm mới dữ liệu'
      }
    }

    // Toggle between map and list view
    const toggleViewMode = async () => {
      showMapView.value = !showMapView.value
      
      // Initialize map khi switch về map view
      if (showMapView.value && hasLocation.value) {
        await nextTick()
        // Delay để DOM render
        setTimeout(() => {
          try {
            initializeMap('nearby-map')
          } catch (error) {
            console.warn('Map toggle initialization warning:', error)
          }
        }, 100)
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

    // Load data dựa vào active tab
    const loadDataForTab = async (tab) => {
      if (!currentUserId.value) return

      if (tab === 'friends') {
        await loadFriends()
      } else if (tab === 'suggestions') {
        await loadSuggestions()
      } else if (tab === 'requests') {
        await loadRequests()
      }
      // nearby tab không cần load data ở đây
    }

    // Watchers
    watch(() => props.activeTab, async (newTab) => {
      locationError.value = ''
      await loadDataForTab(newTab)
      
      // Initialize map khi switch to nearby tab
      if (newTab === 'nearby' && hasLocation.value && showMapView.value) {
        await nextTick()
        try {
          initializeMap('nearby-map')
        } catch (error) {
          // Map có thể đã được khởi tạo rồi
        }
      }
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

    onUnmounted(() => {
      cleanupNearby()
    })

    return {
      friendsList,
      suggestionsList,
      requestsList,
      nearbyFriends, // Tên giữ nguyên cho compatibility
      isLoading,
      actionLoading,
      nearbyLoading,
      hasLocation,
      locationError,
      showMapView,
      SEARCH_RADIUS_KM,
      getText,
      formatDate,
      handleUnfriend,
      handleSendRequest,
      handleAcceptRequest,
      handleRejectRequest,
      handleAddNearbyFriend, // UPDATED: Thêm handler mới
      handleGetLocation,
      handleRefreshNearby,
      toggleViewMode
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

.friends-list, .suggestions-list, .requests-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.friend-card, .suggestion-card, .request-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.friend-card:hover, .suggestion-card:hover, .request-card:hover {
  background: var(--theme-color-10);
  border-color: var(--theme-color-20);
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

.friend-date, .suggestion-date, .request-date {
  font-size: 0.625rem;
  color: var(--theme-color);
  opacity: 0.5;
}

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
  background: rgba(255, 0, 0, 0.1);
  border-color: rgba(255, 0, 0, 0.3);
  color: rgba(255, 0, 0, 0.9);
}

.unfriend-btn:hover:not(:disabled) {
  background: rgba(255, 0, 0, 0.2);
  transform: scale(1.05);
}

.add-friend-btn, .accept-btn {
  background: var(--theme-color);
  border-color: var(--theme-color);
  color: #2B2D42;
}

.add-friend-btn:hover:not(:disabled), .accept-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0.125rem 0.25rem var(--theme-color-20);
}

.reject-btn {
  background: var(--theme-color-10);
  border-color: var(--theme-color-20);
  color: var(--theme-color);
}

.reject-btn:hover:not(:disabled) {
  background: var(--theme-color-20);
  transform: scale(1.05);
}

.unfriend-btn:disabled, .add-friend-btn:disabled, 
.accept-btn:disabled, .reject-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Nearby Users Styles - UPDATED */
.nearby-container {
  padding: 0;
}

.map-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--theme-color-20);
  background: var(--theme-color-05);
}

.map-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0;
}

.control-buttons {
  display: flex;
  gap: 0.5rem;
}

.location-btn, .refresh-btn, .get-location-btn, .retry-btn, .list-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--theme-color);
  background: var(--theme-color);
  color: #2B2D42;
}

.location-btn:hover:not(:disabled), 
.refresh-btn:hover:not(:disabled),
.get-location-btn:hover,
.retry-btn:hover,
.list-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0.125rem 0.25rem var(--theme-color-20);
}

.location-btn:disabled, .refresh-btn:disabled, .list-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.location-request, .location-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
  gap: 1rem;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.location-request h4, .location-error h4 {
  color: var(--theme-color);
  font-size: 1rem;
  margin: 0;
}

.location-request p, .location-error p {
  color: var(--theme-color);
  opacity: 0.8;
  font-size: 0.875rem;
  margin: 0;
}

.map-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mapbox-map {
  flex: 1;
  min-height: 12rem;
  border-radius: 0;
  position: relative;
  width: 100%;
}

/* Ensure mapbox controls work properly */
.mapbox-map :deep(.mapboxgl-canvas-container) {
  cursor: grab;
}

.mapbox-map :deep(.mapboxgl-canvas-container:active) {
  cursor: grabbing;
}

.mapbox-map :deep(.mapboxgl-canvas) {
  outline: none;
}

.mapbox-map :deep(.mapboxgl-ctrl-group) {
  background: rgba(43, 45, 66, 0.8);
  border-radius: 0.25rem;
}

.mapbox-map :deep(.mapboxgl-ctrl-group button) {
  background: transparent;
  color: var(--theme-color);
  border: none;
}

.mapbox-map :deep(.mapboxgl-ctrl-group button:hover) {
  background: rgba(255, 235, 124, 0.1);
}

/* List View Styles - UPDATED cho nearby users */
.nearby-list-view {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.no-nearby-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--theme-color);
  opacity: 0.6;
}

.no-nearby-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.no-nearby-list p {
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.no-nearby-list small {
  font-size: 0.75rem;
  opacity: 0.8;
}

.nearby-friends-full-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.nearby-friend-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.nearby-friend-card:hover {
  background: var(--theme-color-10);
  border-color: var(--theme-color-20);
  transform: translateX(0.125rem);
}

.nearby-friend-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.nearby-friend-avatar {
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

.nearby-friend-details {
  flex: 1;
}

.nearby-friend-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 0.125rem;
}

.nearby-friend-distance {
  font-size: 0.625rem;
  color: var(--theme-color);
  opacity: 0.7;
}

/* UPDATED: Styles cho nearby friend actions */
.nearby-friend-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.add-nearby-friend-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--theme-color);
  background: var(--theme-color);
  color: #2B2D42;
}

.add-nearby-friend-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0.125rem 0.25rem var(--theme-color-20);
}

.add-nearby-friend-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>