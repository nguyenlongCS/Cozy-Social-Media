<!--
Component navigation bên phải header
Chứa theme selector, language button, login/logout button
Logic: 
- Theo dõi trạng thái đăng nhập từ Firebase Auth
- Thay đổi nút Login/Logout dựa trên trạng thái user
- Thêm chức năng đăng xuất khi user đã đăng nhập
- Thêm chức năng chuyển trang khi nhấn login button
-->
<template>
  <div class="nav-right">
    <div class="theme-selector">
      <button class="theme-btn yellow" @click="changeTheme('#ffeb7c')"></button>
      <button class="theme-btn green" @click="changeTheme('#a4f28d')"></button>
      <button class="theme-btn aqua" @click="changeTheme('#7FFFD4')"></button>
    </div>
    <button class="language-btn btn" @click="toggleLanguage">
      {{ currentLanguage === 'vi' ? 'VN' : 'EN' }}
    </button>
    <button class="login-button btn" @click="handleAuthAction" :disabled="isLoading">
      {{ isLoading ? '...' : authButtonText }}
    </button>
  </div>
</template>

<script>
// Import Firebase Auth functions để theo dõi trạng thái đăng nhập và đăng xuất
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/config'

export default {
  name: 'NavRight',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  },
  data() {
    return {
      user: null,
      isLoading: false
    }
  },
  computed: {
    authButtonText() {
      if (this.user) {
        return this.currentLanguage === 'vi' ? 'Đăng xuất' : 'Logout'
      } else {
        return this.currentLanguage === 'vi' ? 'Đăng nhập' : 'Login'
      }
    }
  },
  mounted() {
    // Theo dõi trạng thái đăng nhập
    this.unsubscribe = onAuthStateChanged(auth, (user) => {
      this.user = user
      console.log('Auth state changed:', user ? 'Logged in' : 'Logged out')
    })
  },
  beforeUnmount() {
    // Cleanup listener khi component bị destroy
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  },
  methods: {
    changeTheme(color) {
      document.documentElement.style.setProperty('--theme-color', color)
    },
    toggleLanguage() {
      this.$emit('toggle-language')
    },
    async handleAuthAction() {
      if (this.user) {
        // Nếu đã đăng nhập thì đăng xuất
        await this.handleLogout()
      } else {
        // Nếu chưa đăng nhập thì chuyển tới trang login
        this.goToLogin()
      }
    },
    async handleLogout() {
      this.isLoading = true
      try {
        await signOut(auth)
        console.log('Logout successful')
        
        const message = this.currentLanguage === 'vi' 
          ? 'Đăng xuất thành công!' 
          : 'Logout successful!'
        
        // Hiển thị thông báo ngắn gọn (có thể comment lại nếu không muốn)
        // alert(message)
        
        // Vẫn ở lại trang hiện tại (home)
        // Trạng thái user sẽ tự động cập nhật qua onAuthStateChanged
        
      } catch (error) {
        console.error('Logout error:', error)
        const message = this.currentLanguage === 'vi' 
          ? 'Đăng xuất thất bại!' 
          : 'Logout failed!'
        alert(message)
      } finally {
        this.isLoading = false
      }
    },
    goToLogin() {
      this.$router.push('/login')
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