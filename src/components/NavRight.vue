<!--
src/components/NavRight.vue - Refactored
Component navigation bên phải header
Logic: Theme selector, language toggle, và auth button
-->
<template>
  <div class="nav-right">
    <div class="theme-selector">
      <button class="theme-btn yellow" @click="changeTheme('#ffeb7c')"></button>
      <button class="theme-btn green" @click="changeTheme('#6495ED')"></button>
      <button class="theme-btn aqua" @click="changeTheme('#7FFFD4')"></button>
    </div>
    <button class="language-btn btn" @click="handleToggleLanguage">
      {{ currentLanguage === 'vi' ? 'VN' : 'EN' }}
    </button>
    <button class="login-button btn" @click="handleAuthAction" :disabled="isLoading">
      {{ getAuthButtonText() }}
    </button>
  </div>
</template>

<script>
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useTheme } from '@/composables/useTheme'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'NavRight',
  emits: ['toggle-language'],
  setup(props, { emit }) {
    const route = useRoute()
    const router = useRouter()
    const { user, logout, isLoading } = useAuth()
    const { currentLanguage, getText } = useLanguage()
    const { changeTheme } = useTheme()
    const { showError } = useErrorHandler()

    const getAuthButtonText = () => {
      if (isLoading.value) return '...'
      if (route.name === 'Login') return getText('back')
      if (user.value) return getText('logout')
      return getText('login')
    }

    const handleToggleLanguage = () => emit('toggle-language')

    const handleAuthAction = async () => {
      if (route.name === 'Login') {
        router.push('/')
        return
      }
      
      if (user.value) {
        try {
          await logout()
        } catch (error) {
          showError(error, 'logout')
        }
      } else {
        router.push('/login')
      }
    }

    return {
      isLoading,
      currentLanguage,
      changeTheme,
      getAuthButtonText,
      handleToggleLanguage,
      handleAuthAction
    }
  }
}
</script>

<style scoped>
.nav-right {
  width: 22.13%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  border-radius: 0.9375rem 0 0 0.9375rem;
}

.theme-selector {
  display: flex;
  gap: 0.3125rem;
}

.language-btn, .login-button {
  height: 1.875rem;
  border-radius: 0.9375rem;
  font-size: 0.875rem;
}

.language-btn {
  width: 2.5rem;
  font-size: 0.75rem;
}

.login-button {
  width: 6.25rem;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>