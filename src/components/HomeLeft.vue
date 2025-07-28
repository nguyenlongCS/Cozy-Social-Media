<!--
src/components/HomeLeft.vue - Refactored
Component sidebar bên trái trang chủ
Logic: Menu buttons với authentication check cho Create Post
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
  name: 'HomeLeft',
  setup() {
    const router = useRouter()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const { showError } = useErrorHandler()

    const handleCreatePost = () => {
      if (!user.value) {
        showError({ message: 'NOT_AUTHENTICATED' }, 'post')
        return
      }
      
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