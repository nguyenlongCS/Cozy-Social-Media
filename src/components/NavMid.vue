<!--
src/components/NavMid.vue - Loại bỏ disabled buttons
Component navigation giữa header với unread badges và login protection
UPDATED: Loại bỏ disabled state, vẫn giữ 99+ badge và thông báo đăng nhập
Logic: All buttons luôn clickable, hiện thông báo khi chưa đăng nhập, giống như profile button
-->
<template>
  <div class="nav-mid">
    <button v-if="!isLoginPage" class="profile-button btn" @click="goToProfile"></button>
    
    <!-- Friends button với protection -->
    <div v-if="!isLoginPage" class="friends-button-container">
      <button 
        class="friends-button btn" 
        @click="handleFriendsClick"
      ></button>
      <div 
        v-if="user ? friendRequestsCount > 0 : true"
        class="unread-badge friends-badge" 
        :class="{ 'login-required': !user }"
      >
        {{ user ? (friendRequestsCount > 99 ? '99+' : friendRequestsCount) : '99+' }}
      </div>
    </div>
    
    <button v-if="!isLoginPage" class="home-button btn" @click="goToHome"></button>
    
    <button v-if="!isLoginPage" class="news-button btn" @click="goToNews"></button>
    
    <!-- Messages button với protection -->
    <div v-if="!isLoginPage" class="mess-button-container">
      <button 
        class="mess-button btn" 
        @click="handleMessagesClick"
      ></button>
      <div 
        v-if="user ? totalUnreadCount > 0 : true"
        class="unread-badge messages-badge" 
        :class="{ 'login-required': !user }"
      >
        {{ user ? (totalUnreadCount > 99 ? '99+' : totalUnreadCount) : '99+' }}
      </div>
    </div>
    
    <!-- Notification button với protection -->
    <div v-if="!isLoginPage" class="notification-button-container">
      <button 
        class="notification-button btn" 
        @click="handleNotificationClick"
        :class="{ active: showNotificationPanel }"
      ></button>
      <div 
        v-if="user ? notificationUnreadCount > 0 : true"
        class="unread-badge notification-badge" 
        :class="{ 'login-required': !user }"
      >
        {{ user ? (notificationUnreadCount > 99 ? '99+' : notificationUnreadCount) : '99+' }}
      </div>
      
      <!-- Notification Panel - chỉ hiện khi đã login -->
      <NotificationPanel
        v-if="showNotificationPanel && user"
        @close="closeNotificationPanel"
        @notification-clicked="handleNotificationClicked"
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
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'
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
    const { getText } = useLanguage()
    const { showError } = useErrorHandler()
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

    // =============================================================================
    // NAVIGATION HANDLERS WITH LOGIN CHECK
    // =============================================================================

    // Protected navigation functions - UPDATED: Loại bỏ disabled logic
    const handleFriendsClick = () => {
      if (!user.value) {
        showLoginRequiredMessage('friends')
        return
      }
      goToFriends()
    }

    const handleMessagesClick = () => {
      if (!user.value) {
        showLoginRequiredMessage('messages')
        return
      }
      goToMessages()
    }

    const handleNotificationClick = () => {
      if (!user.value) {
        showLoginRequiredMessage('notifications')
        return
      }
      toggleNotificationPanel()
    }

    // Show login required message
    const showLoginRequiredMessage = (feature) => {
      const messages = {
        friends: getText('loginToAccessFriends') || 'Vui lòng đăng nhập để sử dụng tính năng bạn bè',
        messages: getText('loginToAccessMessages') || 'Vui lòng đăng nhập để sử dụng tính năng tin nhắn',
        notifications: getText('loginToAccessNotifications') || 'Vui lòng đăng nhập để xem thông báo'
      }
      
      alert(messages[feature] || 'Vui lòng đăng nhập để sử dụng tính năng này')
    }

    // Standard navigation (không cần login)
    const goToHome = () => router.push('/')
    const goToProfile = () => {
      if (!user.value) {
        showLoginRequiredMessage('profile')
        return
      }
      router.push('/profile')
    }
    const goToNews = () => router.push('/news')

    // Protected navigation (cần login)
    const goToFriends = () => {
      router.push('/friends')
      setTimeout(loadFriendRequestsCount, 500)
    }
    const goToMessages = () => router.push('/messages')

    // =============================================================================
    // NOTIFICATION PANEL HANDLERS
    // =============================================================================

    const toggleNotificationPanel = () => {
      showNotificationPanel.value = !showNotificationPanel.value
    }

    const closeNotificationPanel = () => {
      showNotificationPanel.value = false
    }

    const handleNotificationClicked = (notification) => {
      // Handle navigation dựa trên notification type
      if (notification.type === 'like' || notification.type === 'comment' || notification.type === 'friend_post') {
        router.push('/')
      } else if (notification.type === 'friend_accept') {
        router.push('/friends')
      }
    }

    // =============================================================================
    // DATA LOADING FUNCTIONS
    // =============================================================================

    // Load friend requests count
    const loadFriendRequestsCount = async () => {
      if (user.value?.uid) {
        try {
          const count = await getFriendRequestsCount(user.value.uid)
          friendRequestsCount.value = count
        } catch (error) {
          friendRequestsCount.value = 0
        }
      } else {
        friendRequestsCount.value = 0
      }
    }

    // Setup user listeners khi đã login
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

    // =============================================================================
    // CLICK OUTSIDE HANDLER
    // =============================================================================

    const handleClickOutside = (event) => {
      const notificationContainer = event.target.closest('.notification-button-container')
      if (!notificationContainer && showNotificationPanel.value) {
        closeNotificationPanel()
      }
    }

    // =============================================================================
    // WATCHERS
    // =============================================================================

    watch(user, (newUser) => {
      if (newUser) {
        setupUserListeners()
      } else {
        cleanupListeners()
        friendRequestsCount.value = 0
        showNotificationPanel.value = false
      }
    }, { immediate: true })

    watch(() => route.name, (newRouteName) => {
      if (newRouteName === 'Friends' && user.value) {
        setTimeout(loadFriendRequestsCount, 1000)
      }
    })

    // =============================================================================
    // LIFECYCLE
    // =============================================================================

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
      user,
      totalUnreadCount,
      friendRequestsCount,
      notificationUnreadCount,
      showNotificationPanel,
      goToHome,
      goToProfile,
      goToNews,
      handleFriendsClick,
      handleMessagesClick,
      handleNotificationClick,
      toggleNotificationPanel,
      closeNotificationPanel,
      handleNotificationClicked
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

/* UPDATED: Loại bỏ disabled styles, tất cả buttons đều hover được */
.home-button:hover, .profile-button:hover, .news-button:hover, 
.mess-button:hover, .friends-button:hover, .notification-button:hover {
  transform: scale(1.15);
  background-color: #2B2D42;
}

.notification-button.active {
  background-color: #2B2D42;
  transform: scale(1.15);
}

/* Badge styles - UPDATED: Hiện badge cho tất cả trường hợp */
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
  z-index: 10;
  background: rgba(255, 0, 0, 0.9);
  color: white;
}

/* UPDATED: Badge luôn hiển thị, animation khác nhau cho login required vs authenticated */
.unread-badge.login-required {
  animation: loginPulse 2s infinite;
}

.unread-badge:not(.login-required) {
  animation: pulse 2s infinite;
}

/* Hide badges khi count = 0 và user đã login - Logic được handle trong template */
.unread-badge.login-required,
.friends-badge,
.messages-badge, 
.notification-badge {
  display: block;
}

/* Logic hiển thị badge được handle trong template với v-if */

/* Animations */
@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes loginPulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
</style>