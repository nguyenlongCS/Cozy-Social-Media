<!--
Component navigation bên phải header
Chứa theme selector, language button, login button
Logic: Thêm chức năng chuyển trang khi nhấn login button
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
    <button class="login-button btn" @click="goToLogin">
      {{ loginText }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'NavRight',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  },
  computed: {
    loginText() {
      return this.currentLanguage === 'vi' ? 'Đăng nhập' : 'Login'
    }
  },
  methods: {
    changeTheme(color) {
      document.documentElement.style.setProperty('--theme-color', color)
    },
    toggleLanguage() {
      this.$emit('toggle-language')
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
</style>