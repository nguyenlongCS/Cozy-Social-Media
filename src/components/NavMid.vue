<!--
src/components/NavMid.vue - Updated with Messages & Friends Badges
Component navigation giữa header với unread messages và friend requests badges
Logic: 
- Hiển thị 5 navigation buttons với navigation logic đơn giản
- Thêm unread messages badge trên mess-button
- Thêm friend requests badge trên friends-button
- Sử dụng useMessages và useFriends composables
- Badge hiển thị khi có tin nhắn chưa đọc hoặc lời mời kết bạn (> 0)
- Không thay đổi layout và styling hiện tại
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
    
    <!-- Mess button với unread badge -->
    <div v-if="!isLoginPage" class="mess-button-container">
      <button class="mess-button btn" @click="goToMessages"></button>
      <div v-if="totalUnreadCount > 0" class="unread-badge messages-badge">
        {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}
      </div>
    </div>
    
    <button v-if="!isLoginPage" class="notification-button btn"></button>
  </div>
</template>

<script>
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useMessages } from '@/composables/useMessages'
import { useFriends } from '@/composables/useFriends'

export default {
  name: 'NavMid',
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

    const isLoginPage = computed(() => route.name === 'Login')
    const friendRequestsCount = ref(0)

    // Load friend requests count
    const loadFriendRequestsCount = async () => {
      if (user.value?.uid) {
        try {
          const count = await getFriendRequestsCount(user.value.uid)
          friendRequestsCount.value = count
        } catch (error) {
          console.error('Error loading friend requests count:', error)
          friendRequestsCount.value = 0
        }
      }
    }

    // Setup conversations listener khi user đăng nhập
    const setupUserListeners = async () => {
      if (user.value?.uid) {
        try {
          // Load conversations và setup real-time listener
          await getConversations(user.value.uid)
          setupConversationsListener(user.value.uid)
          
          // Load friend requests count
          await loadFriendRequestsCount()
        } catch (error) {
          console.error('Error setting up user listeners:', error)
        }
      }
    }

    // Watch user changes
    watch(user, (newUser) => {
      if (newUser) {
        setupUserListeners()
      } else {
        cleanupListeners()
        friendRequestsCount.value = 0
      }
    }, { immediate: true })

    // Refresh friend requests count khi navigate đến friends page
    watch(() => route.name, (newRouteName) => {
      if (newRouteName === 'Friends' && user.value) {
        // Delay để đảm bảo Friends page đã xử lý xong
        setTimeout(loadFriendRequestsCount, 1000)
      }
    })

    // Navigation methods
    const goToHome = () => router.push('/')
    const goToProfile = () => router.push('/profile')
    const goToFriends = () => {
      router.push('/friends')
      // Refresh count sau khi navigate
      setTimeout(loadFriendRequestsCount, 500)
    }
    const goToMessages = () => router.push('/messages')

    // Lifecycle
    onMounted(() => {
      if (user.value) {
        setupUserListeners()
      }
    })

    onUnmounted(() => {
      cleanupListeners()
    })

    return {
      isLoginPage,
      totalUnreadCount,
      friendRequestsCount,
      goToHome,
      goToProfile,
      goToFriends,
      goToMessages
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

.home-button, .profile-button, .notification-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.mess-button-container, .friends-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mess-button, .friends-button {
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

.notification-button {
  background: url('@/icons/notification.png') center/1.5rem var(--theme-color);
  background-repeat: no-repeat;
}

.home-button:hover, .profile-button:hover, .mess-button:hover, .friends-button:hover, .notification-button:hover {
  transform: scale(1.15);
  background-color: #2B2D42;
}

/* Unread Badge Styles */
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
  background: rgba(0, 150, 255, 0.9);
  color: white;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
</style>