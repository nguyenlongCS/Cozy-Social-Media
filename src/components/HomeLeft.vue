<!--
Component sidebar bên trái
Logic:
- Kiểm tra authentication khi click "Tạo Bài Đăng"
- Hiển thị thông báo yêu cầu đăng nhập nếu chưa login
- Navigate đến CreatePost nếu đã đăng nhập
-->
<template>
  <div class="menu">
    <button class="btn" @click="handleCreatePost">
      {{ getText('createPost') }}
    </button>
    <button class="btn">
      {{ getText('explore') }}
    </button>
    <button class="btn">
      {{ getText('settings') }}
    </button>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'Menu',
  setup() {
    const router = useRouter()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const { showError } = useErrorHandler()

    // Handle create post navigation
    const handleCreatePost = () => {
      if (!user.value) {
        // Hiển thị thông báo yêu cầu đăng nhập
        showError({ message: 'NOT_AUTHENTICATED' }, 'post')
        return
      }
      
      // Navigate to create post page nếu đã đăng nhập
      router.push('/createpost')
    }

    return {
      getText,
      handleCreatePost
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
</style>