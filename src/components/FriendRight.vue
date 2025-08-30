<!--
src/components/FriendRight.vue - Updated để hiển thị "Tìm người xung quanh"
Component sidebar bên phải cho trang Friends
UPDATED: Thay đổi text từ "Tìm bạn bè xung quanh" thành "Tìm người xung quanh"
Logic: 4 buttons với counter cho mỗi section, tìm TẤT CẢ users xung quanh
Emit activeTab để FriendMain biết hiển thị gì
-->
<template>
  <div class="friend-right">
    <!-- Friends Section -->
    <div class="section">
      <button 
        class="section-btn"
        :class="{ active: activeTab === 'friends' }"
        @click="setActiveTab('friends')"
      >
        <div class="section-header">
          <div class="section-icon friends-icon"></div>
          <h3 class="section-title">{{ getText('friends') }}</h3>
        </div>
        <div class="section-counter">{{ friendsCount }}</div>
      </button>
    </div>

    <!-- Friend Suggestions Section -->
    <div class="section">
      <button 
        class="section-btn"
        :class="{ active: activeTab === 'suggestions' }"
        @click="setActiveTab('suggestions')"
      >
        <div class="section-header">
          <div class="section-icon suggestions-icon"></div>
          <h3 class="section-title">{{ getText('suggestions') }}</h3>
        </div>
        <div class="section-counter">{{ suggestionsCount }}</div>
      </button>
    </div>

    <!-- Friend Requests Section -->
    <div class="section">
      <button 
        class="section-btn"
        :class="{ active: activeTab === 'requests' }"
        @click="setActiveTab('requests')"
      >
        <div class="section-header">
          <div class="section-icon requests-icon"></div>
          <h3 class="section-title">{{ getText('friendRequests') }}</h3>
        </div>
        <div class="section-counter" :class="{ highlight: requestsCount > 0 }">
          {{ requestsCount }}
        </div>
      </button>
    </div>

    <!-- Nearby Users Section - UPDATED text -->
    <div class="section">
      <button 
        class="section-btn"
        :class="{ active: activeTab === 'nearby' }"
        @click="setActiveTab('nearby')"
      >
        <div class="section-header">
          <div class="section-icon nearby-icon"></div>
          <h3 class="section-title">{{ getText('nearbyUsers') }}</h3>
        </div>
      </button>
    </div>

    <div v-if="isLoading" class="loading-section">
      <div class="loading-text">{{ getText('loading') }}...</div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useFriends } from '@/composables/useFriends'
import { useNearbyFriends } from '@/composables/useNearbyFriends'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'FriendRight',
  emits: ['tab-changed'],
  setup(props, { emit }) {
    const { user } = useAuth()
    const { 
      getFriendsCount,
      getFriendRequestsCount,
      getFriendSuggestions,
      isLoading
    } = useFriends()
    const { getText } = useLanguage()

    const activeTab = ref('friends')
    const friendsCount = ref(0)
    const suggestionsCount = ref(0)
    const requestsCount = ref(0)

    const setActiveTab = (tab) => {
      activeTab.value = tab
      emit('tab-changed', tab)
    }

    const loadCounts = async () => {
      if (!user.value?.uid) return

      try {
        const [friendsResult, requestsResult, suggestions] = await Promise.all([
          getFriendsCount(user.value.uid),
          getFriendRequestsCount(user.value.uid),
          getFriendSuggestions(user.value.uid, 100)
        ])

        friendsCount.value = friendsResult
        requestsCount.value = requestsResult
        suggestionsCount.value = suggestions.length
      } catch (error) {
        // Silent fail
      }
    }

    const updateCounts = () => {
      loadCounts()
    }

    // Watchers
    watch(user, (newUser) => {
      if (newUser) {
        loadCounts()
      } else {
        friendsCount.value = 0
        suggestionsCount.value = 0
        requestsCount.value = 0
      }
    }, { immediate: true })

    // Lifecycle
    onMounted(() => {
      if (user.value) loadCounts()
      emit('tab-changed', activeTab.value)
    })

    return {
      activeTab,
      friendsCount,
      suggestionsCount,
      requestsCount,
      isLoading,
      getText,
      setActiveTab,
      updateCounts
    }
  }
}
</script>

<style scoped>
.friend-right {
  width: 22.13%;
  height: 100%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  color: var(--theme-color);
  font-size: 0.875rem;
  overflow: hidden;
  padding: 1rem 0;
}

.section {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
}

.section:last-child {
  border-bottom: none;
}

.section-btn {
  width: 100%;
  background: transparent;
  border: none;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.section-btn:hover {
  background: rgba(255, 235, 124, 0.05);
}

.section-btn.active {
  background: rgba(255, 235, 124, 0.1);
  border-left: 3px solid var(--theme-color);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.friends-icon {
  background-image: url('@/icons/friends.png');
}

.suggestions-icon {
  background-image: url('@/icons/user.png');
}

.requests-icon {
  background-image: url('@/icons/notification.png');
}

/* Nearby users icon */
.nearby-icon {
  background-image: url('@/icons/location.png');
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0;
}

.section-counter {
  background: rgba(255, 235, 124, 0.2);
  color: var(--theme-color);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.section-counter.highlight {
  background: rgba(255, 0, 0, 0.9);
  color: #2B2D42;
  animation: pulse 2s infinite;
}

.loading-section {
  padding: 1rem;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
  font-style: italic;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
</style>