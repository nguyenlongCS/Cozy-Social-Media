<!--
src/components/Footer.vue - Updated with Circle Messages
Component footer với post counter, scroll warning và circle messages
Logic: 
- Hiển thị hướng dẫn cuộn với opacity fade
- Post counter ở góc phải
- Scroll warning animation
- Circle messages ở góc trái hiển thị 3 conversations mới nhất
- Mỗi circle-mess hiển thị avatar và unread badge
- Click vào circle-mess chuyển đến /messages
-->
<template>
  <div class="footer">
    <!-- Circle Messages Section (góc trái) -->
    <div class="circle-messages" v-if="!isLoginPage && user">
      <div 
        v-for="conversation in topConversations" 
        :key="conversation.partnerId"
        class="circle-mess"
        @click="goToMessages"
        :title="conversation.partnerName"
      >
        <div 
          class="circle-avatar"
          :style="{ backgroundImage: conversation.partnerAvatar ? `url(${conversation.partnerAvatar})` : '' }"
        ></div>
        <div v-if="conversation.unreadCount > 0" class="circle-unread-badge">
          {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
        </div>
      </div>
    </div>

    <!-- Footer Content (center) -->
    <div class="footer-content">
      {{ getText('scrollToNext') }}
    </div>
    
    <!-- Scroll Warning -->
    <div v-if="scrollTooFast" class="scroll-warning">
      {{ getText('scrollTooFast') }}
    </div>
    
    <!-- Post Counter (góc phải) -->
    <div v-if="totalPosts > 0" class="post-counter">
      {{ currentPostIndex + 1 }}/{{ totalPosts }}
    </div>
  </div>
</template>

<script>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useMessages } from '@/composables/useMessages'

export default {
  name: 'AppFooter',
  props: {
    scrollTooFast: {
      type: Boolean,
      default: false
    },
    currentPostIndex: {
      type: Number,
      default: 0
    },
    totalPosts: {
      type: Number,
      default: 0
    }
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const {
      conversations,
      getConversations,
      setupConversationsListener,
      cleanupListeners
    } = useMessages()

    const isLoginPage = computed(() => route.name === 'Login')

    // Get top 3 conversations mới nhất với unread messages
    const topConversations = computed(() => {
      if (!conversations.value || conversations.value.length === 0) return []
      
      // Sort by: unread first, then by last message time
      const sortedConversations = [...conversations.value].sort((a, b) => {
        // Prioritize conversations with unread messages
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1
        
        // Then sort by last message timestamp
        const timeA = a.lastMessage?.timestamp || 0
        const timeB = b.lastMessage?.timestamp || 0
        return timeB - timeA
      })
      
      return sortedConversations.slice(0, 5)
    })

    // Setup conversations cho circle messages
    const setupCircleMessages = async () => {
      if (user.value?.uid && !isLoginPage.value) {
        try {
          await getConversations(user.value.uid)
          setupConversationsListener(user.value.uid)
        } catch (error) {
          console.error('Error setting up circle messages:', error)
        }
      }
    }

    // Navigate to messages
    const goToMessages = () => {
      router.push('/messages')
    }

    // Watch user changes
    watch(user, (newUser) => {
      if (newUser && !isLoginPage.value) {
        setupCircleMessages()
      } else {
        cleanupListeners()
      }
    }, { immediate: true })

    // Watch route changes
    watch(() => route.name, (newRouteName) => {
      if (newRouteName !== 'Login' && user.value) {
        setupCircleMessages()
      }
    })

    // Lifecycle
    onMounted(() => {
      if (user.value && !isLoginPage.value) {
        setupCircleMessages()
      }
    })

    onUnmounted(() => {
      cleanupListeners()
    })

    return { 
      getText,
      isLoginPage,
      user,
      topConversations,
      goToMessages
    }
  }
}
</script>

/* Footer.vue styles - Updated with Circle Messages */
<style scoped>
.footer {
  width: 100%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 -0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  color: #000;
  font-size: 0.875rem;
  font-weight: 500;
  position: relative;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.footer:hover {
  opacity: 1;
}

/* Circle Messages Section (góc trái) */
.circle-messages {
  position: absolute;
  left: 1rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.circle-mess {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 50%;
  overflow: hidden;
}

.circle-mess:hover {
  transform: scale(1.1);
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);
}

.circle-avatar {
  width: 100%;
  height: 100%;
  background: url('@/icons/user.png') center/cover #2B2D42;
  border: 0.125rem solid #2B2D42;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  transition: border-color 0.3s ease;
}

.circle-mess:hover .circle-avatar {
  border-color: #000;
}

.circle-unread-badge {
  position: absolute;
  top: 0.125rem;
  right: 0.125rem;
  background: rgba(255, 0, 0, 0.9);
  color: white;
  font-size: 0.5rem;
  font-weight: 600;
  padding: 0.125rem 0.25rem;
  border-radius: 0.5rem;
  min-width: 0.75rem;
  text-align: center;
  line-height: 1;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
  z-index: 10;
}

/* Footer Content (center) */
.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-warning {
  position: absolute;
  bottom: 0.3125rem;
  font-size: 0.75rem;
  color: rgba(255, 0, 0, 0.9);
  font-weight: 600;
  animation: fadeInOut 2s ease-in-out;
}

/* Post Counter (góc phải) */
.post-counter {
  position: absolute;
  bottom: 0.5rem;
  right: 1rem;
  font-size: 0.75rem;
  color: #000;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  backdrop-filter: blur(2px);
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(0.625rem); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-0.625rem); }
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
</style>