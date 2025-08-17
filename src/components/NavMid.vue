<!--
src/components/NavMid.vue - Tích hợp Notifications
Component navigation giữa header với unread messages, friend requests và notifications badges
Logic: 5 navigation buttons với unread badges và notification panel dropdown
-->
<template>
  <div class="nav-mid">
    <button v-if="!isLoginPage" class="profile-button btn" @click="goToProfile"></button>
    
    <!-- Friends button với friend requests badge -->
    <div v-if="!isLoginPage" class="friends-button-container">
      <button class="friends-button btn" @click="goToFriends"></button>
      <div v-if="friendRequestsCount > 0" class="unread-badge friends-badge">
        {{ friendRequestsCount > 99 ? '99+' : friendRequestsCount }}
      </div>
    </div>
    
    <button v-if="!isLoginPage" class="home-button btn" @click="goToHome"></button>
    
    <button v-if="!isLoginPage" class="news-button btn" @click="goToNews"></button>
    
    <!-- Mess button với unread badge -->
    <div v-if="!isLoginPage" class="mess-button-container">
      <button class="mess-button btn" @click="goToMessages"></button>
      <div v-if="totalUnreadCount > 0" class="unread-badge messages-badge">
        {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}
      </div>
    </div>
    
    <!-- Notification button với dropdown panel -->
    <div v-if="!isLoginPage" class="notification-button-container">
      <button 
        class="notification-button btn" 
        @click="toggleNotificationPanel"
        :class="{ active: showNotificationPanel }"
      ></button>
      <div v-if="notificationUnreadCount > 0" class="unread-badge notification-badge">
        {{ notificationUnreadCount > 99 ? '99+' : notificationUnreadCount }}
      </div>
      
      <!-- Notification Panel -->
      <NotificationPanel
        v-if="showNotificationPanel"
        @close="closeNotificationPanel"
        @notification-clicked="handleNotificationClick"
      />
    </div>
  </div>
</template>

<script>
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useMessages } from '@/composables/useMessages'
import { useFriends } from '@/composables/useFriends'
import { useNotifications } from '@/composables/useNotifications'
import NotificationPanel from './NotificationPanel.vue'

export default {
  name: 'NavMid',
  components: {
    NotificationPanel
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { user } = useAuth()
    const { 
      totalUnreadCount,
      getConversations,
      setupConversationsListener,
      cleanupListeners
    } = useMessages()
    const { getFriendRequestsCount } = useFriends()
    const { 
      unreadCount: notificationUnreadCount,
      initializeNotifications
    } = useNotifications()

    const isLoginPage = computed(() => route.name === 'Login')
    const friendRequestsCount = ref(0)
    const showNotificationPanel = ref(false)

    // Load friend requests count
    const loadFriendRequestsCount = async () => {
      if (user.value?.uid) {
        try {
          const count = await getFriendRequestsCount(user.value.uid)
          friendRequestsCount.value = count
        } catch (error) {
          friendRequestsCount.value = 0
        }
      }
    }

    // Setup user listeners
    const setupUserListeners = async () => {
      if (user.value?.uid) {
        try {
          await getConversations(user.value.uid)
          setupConversationsListener(user.value.uid)
          await loadFriendRequestsCount()
          await initializeNotifications()
        } catch (error) {
          // Silent fail
        }
      }
    }

    // Navigation methods
    const goToHome = () => router.push('/')
    const goToProfile = () => router.push('/profile')
    const goToFriends = () => {
      router.push('/friends')
      setTimeout(loadFriendRequestsCount, 500)
    }
    const goToMessages = () => router.push('/messages')
    const goToNews = () => router.push('/news')

    // Notification panel methods
    const toggleNotificationPanel = () => {
      showNotificationPanel.value = !showNotificationPanel.value
    }

    const closeNotificationPanel = () => {
      showNotificationPanel.value = false
    }

    const handleNotificationClick = (notification) => {
      // Handle navigation based on notification type
      if (notification.type === 'like' || notification.type === 'comment' || notification.type === 'friend_post') {
        // Navigate to home and scroll to specific post if possible
        router.push('/')
      } else if (notification.type === 'friend_accept') {
        // Navigate to friends page
        router.push('/friends')
      }
    }

    // Click outside handler
    const handleClickOutside = (event) => {
      const notificationContainer = event.target.closest('.notification-button-container')
      if (!notificationContainer && showNotificationPanel.value) {
        closeNotificationPanel()
      }
    }

    // Watchers
    watch(user, (newUser) => {
      if (newUser) {
        setupUserListeners()
      } else {
        cleanupListeners()
        friendRequestsCount.value = 0
      }
    }, { immediate: true })

    watch(() => route.name, (newRouteName) => {
      if (newRouteName === 'Friends' && user.value) {
        setTimeout(loadFriendRequestsCount, 1000)
      }
    })

    // Lifecycle
    onMounted(() => {
      if (user.value) {
        setupUserListeners()
      }
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      cleanupListeners()
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      isLoginPage,
      totalUnreadCount,
      friendRequestsCount,
      notificationUnreadCount,
      showNotificationPanel,
      goToHome,
      goToProfile,
      goToFriends,
      goToMessages,
      goToNews,
      toggleNotificationPanel,
      closeNotificationPanel,
      handleNotificationClick
    }
  }
}
</script>

<style scoped>
.nav-mid {
  width: 39.53%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  border-radius: 0.9375rem;
}

.home-button, .profile-button, .news-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.mess-button-container, .friends-button-container, .notification-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mess-button, .friends-button, .notification-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.home-button {
  background: url('@/icons/home.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.friends-button {
  background: url('@/icons/friends.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.profile-button {
  background: url('@/icons/profile.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.mess-button {
  background: url('@/icons/mess.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.news-button {
  background: url('@/icons/news.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.notification-button {
  background: url('@/icons/notification.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.home-button:hover, .profile-button:hover, .news-button:hover, .mess-button:hover, .friends-button:hover, .notification-button:hover {
  transform: scale(1.15);
  background-color: #2B2D42;
}

.notification-button.active {
  background-color: #2B2D42;
  transform: scale(1.15);
}

.unread-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  min-width: 1rem;
  text-align: center;
  line-height: 1;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
  z-index: 10;
}

.messages-badge {
  background: rgba(255, 0, 0, 0.9);
  color: white;
}

.friends-badge {
  background: rgba(255, 0, 0, 0.9);
  color: white;
}

.notification-badge {
  background: rgba(255, 0, 0, 0.9);
  color: white;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
</style>