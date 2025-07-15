<!--
Component navigation bên phải header - Refactored with theme management
Logic: 
- Sử dụng composables để quản lý auth, language, theme và error handling
- Thay đổi nút login thành nút "Trở về" khi ở trang login
- Nút "Trở về" sẽ chuyển về trang chủ mà không cần đăng nhập
- Theo dõi trạng thái đăng nhập từ Firebase Auth
- Thay đổi nút Login/Logout dựa trên trạng thái user (chỉ ở trang chủ)
- Thêm chức năng đăng xuất khi user đã đăng nhập (chỉ ở trang chủ)
- Thêm theme management với localStorage persistence
-->
<template>
  <div class="nav-right">
    <div class="theme-selector">
      <button class="theme-btn yellow" @click="changeTheme('#ffeb7c')"></button>
      <button class="theme-btn green" @click="changeTheme('#a4f28d')"></button>
      <button class="theme-btn aqua" @click="changeTheme('#7FFFD4')"></button>
    </div>
    <button class="language-btn btn" @click="handleToggleLanguage">
      {{ currentLanguage === 'vi' ? 'VN' : 'EN' }}
    </button>
    <button class="login-button btn" @click="handleAuthAction" :disabled="isLoading">
      {{ isLoading ? '...' : authButtonText }}
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useTheme } from '@/composables/useTheme'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'NavRight',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  },
  emits: ['toggle-language'],
  setup(props, { emit }) {
    const route = useRoute()
    const router = useRouter()
    const { user, logout, isLoading } = useAuth()
    const { getText, setLanguage } = useLanguage()
    const { changeTheme } = useTheme()
    const { showError } = useErrorHandler()

    // Set language từ props
    setLanguage(props.currentLanguage)

    // Computed properties
    const isLoginPage = computed(() => route.name === 'Login')

    const authButtonText = computed(() => {
      if (isLoginPage.value) {
        return getText('back')
      }
      
      if (user.value) {
        return getText('logout')
      } else {
        return getText('login')
      }
    })

    // Methods
    const handleToggleLanguage = () => {
      emit('toggle-language')
    }

    const handleAuthAction = async () => {
      if (isLoginPage.value) {
        goToHome()
        return
      }
      
      if (user.value) {
        await handleLogout()
      } else {
        goToLogin()
      }
    }

    const handleLogout = async () => {
      try {
        await logout()
        console.log('Logout successful')
        // Không hiển thị alert để tránh làm phiền user
        // Trạng thái user sẽ tự động cập nhật qua onAuthStateChanged
      } catch (error) {
        showError(error, 'logout')
      }
    }

    const goToLogin = () => {
      router.push('/login')
    }

    const goToHome = () => {
      router.push('/')
    }

    return {
      isLoading,
      authButtonText,
      changeTheme,
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