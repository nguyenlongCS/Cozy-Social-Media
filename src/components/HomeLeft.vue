<!--
src/components/HomeLeft.vue - Updated with Discover Button
Component sidebar bên trái trang chủ với danh sách bạn bè
Logic: 
- Menu buttons với authentication check
- Hiển thị 5 bạn bè đầu tiên với avatar và tên
- Button "Toàn bộ bạn bè" chuyển đến trang /friends
- Added: Button "Khám phá" chuyển đến trang /discover
-->
<template>
  <div class="menu">
    <button class="btn" @click="handleCreatePost">
      {{ getText('createPost') }}
    </button>
    <button class="btn" @click="goToDiscover">
      {{ getText('explore') }}
    </button>
    <button class="btn">
      {{ getText('settings') }}
    </button>

    <!-- Friends Section -->
    <div v-if="user" class="separator"></div>
    <div v-if="user" class="friends-section">
      <h3 class="friends-title">{{ getText('friends') }}</h3>
      
      <div v-if="isLoading" class="friends-loading">
        {{ getText('loading') }}...
      </div>
      
      <div v-else-if="friendsList.length === 0" class="no-friends">
        {{ getText('noFriendsYet') }}
      </div>
      
      <div v-else class="friends-list">
        <div 
          v-for="friend in friendsList" 
          :key="friend.id"
          class="friend-item"
        >
          <div 
            class="friend-avatar"
            :style="{ backgroundImage: friend.userInfo?.Avatar ? `url(${friend.userInfo.Avatar})` : '' }"
          ></div>
          <span class="friend-name">{{ friend.userInfo?.UserName || getText('unknownUser') }}</span>
        </div>
      </div>

      <button 
        v-if="friendsList.length >= 5"
        class="view-all-btn" 
        @click="goToFriends"
      >
        {{ getText('viewAllFriends') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'
import { useFriends } from '@/composables/useFriends'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'HomeLeft',
  setup() {
    const router = useRouter()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const { getUserById } = useUsers()
    const { getFriends, isLoading } = useFriends()
    const { showError } = useErrorHandler()

    const friendsList = ref([])

    const handleCreatePost = () => {
      if (!user.value) {
        showError({ message: 'NOT_AUTHENTICATED' }, 'post')
        return
      }
      router.push('/createpost')
    }

    const goToFriends = () => router.push('/friends')
    
    // Navigate to discover page
    const goToDiscover = () => router.push('/discover')

    const loadFriendsList = async () => {
      if (!user.value) {
        friendsList.value = []
        return
      }

      try {
        const friends = await getFriends(user.value.uid, 5)
        
        for (const friend of friends) {
          const userInfo = await getUserById(friend.friendId)
          friend.userInfo = userInfo
        }
        
        friendsList.value = friends
      } catch (error) {
        friendsList.value = []
      }
    }

    watch(user, (newUser) => {
      if (newUser) {
        loadFriendsList()
      } else {
        friendsList.value = []
      }
    }, { immediate: true })

    onMounted(() => {
      if (user.value) loadFriendsList()
    })

    return {
      user,
      friendsList,
      isLoading,
      getText,
      handleCreatePost,
      goToFriends,
      goToDiscover
    }
  }
}
</script>

<style scoped>
.menu {
  width: 22.13%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2.5rem;
  gap: 1.25rem;
}

.menu .btn {
  width: 11.25rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.3125rem;
  font-size: 0.875rem;
}

.separator {
  width: 11.25rem;
  height: 1px;
  background: var(--theme-color);
  margin: 0.5rem 0;
}

.friends-section {
  width: 11.25rem;
  padding: 0.75rem;
  background: #2B2D42;
  border: 1px solid var(--theme-color);
  border-radius: 0.5rem;
}

.friends-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 0.75rem 0;
  text-align: center;
}

.friends-loading, .no-friends {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
  text-align: center;
  padding: 0.5rem 0;
}

.friends-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background 0.2s ease;
}

.friend-item:hover {
  background: rgba(255, 235, 124, 0.1);
}

.friend-avatar {
  width: 1.5rem;
  height: 1.5rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.friend-name {
  font-size: 0.75rem;
  color: var(--theme-color);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.view-all-btn {
  width: 100%;
  height: 1.875rem;
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 0.375rem;
  color: var(--theme-color);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-all-btn:hover {
  background: rgba(255, 235, 124, 0.2);
  border-color: rgba(255, 235, 124, 0.5);
  transform: scale(1.02);
}
</style>