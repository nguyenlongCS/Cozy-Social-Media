<!--
src/components/NavLeft.vue - Refactored
Component navigation bên trái header với user avatar
Logic: 
- Hiển thị avatar của user hiện tại
- Load user profile để lấy avatar từ Firestore
- Fallback về icon mặc định nếu không có avatar
-->
<template>
  <div class="nav-left">
    <div 
      v-if="!isLoginPage && user" 
      class="user-avatar"
      :style="{ backgroundImage: userAvatar ? `url(${userAvatar})` : '' }"
    ></div>
    <div v-else-if="!isLoginPage" class="icon-user"></div>
    <input 
      v-if="!isLoginPage"
      type="text" 
      class="search" 
      :placeholder="getText('search')"
    >
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'

export default {
  name: 'NavLeft',
  setup() {
    const route = useRoute()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const { getUserById } = useUsers()

    const userAvatar = ref('')
    const isLoginPage = computed(() => route.name === 'Login')

    const loadUserAvatar = async () => {
      if (!user.value) {
        userAvatar.value = ''
        return
      }

      try {
        const userProfile = await getUserById(user.value.uid)
        userAvatar.value = userProfile?.Avatar || user.value.photoURL || ''
      } catch (error) {
        userAvatar.value = user.value.photoURL || ''
      }
    }

    watch(user, (newUser) => {
      if (newUser) {
        loadUserAvatar()
      } else {
        userAvatar.value = ''
      }
    }, { immediate: true })

    onMounted(() => {
      if (user.value) loadUserAvatar()
    })

    return {
      isLoginPage,
      user,
      userAvatar,
      getText
    }
  }
}
</script>

<style scoped>
.nav-left {
  width: 22.13%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.625rem;
  padding-left: 0.625rem;
  border-radius: 0 0.9375rem 0.9375rem 0;
}

.user-avatar {
  width: 1.875rem;
  height: 1.875rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid #000;
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  background-size: cover;
  background-position: center;
  transition: transform 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
}

.icon-user {
  width: 1.875rem;
  height: 1.875rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid #000;
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
}

.search {
  width: 11.25rem;
  height: 1.875rem;
  background: var(--theme-color) url('@/icons/search.png') 0.3125rem center/1.25rem no-repeat;
  border: 0.125rem solid #000;
  border-radius: 0.9375rem;
  padding: 0 0.625rem 0 1.875rem;
  font-size: 0.875rem;
  color: #000;
  outline: none;
  transition: box-shadow 0.3s ease;
}

.search:focus {
  box-shadow: 0 0 0.5rem rgba(127, 255, 212, 0.6);
}
</style>