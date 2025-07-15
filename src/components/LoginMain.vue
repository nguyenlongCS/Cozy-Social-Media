<!--
Component form đăng nhập/đăng ký
Logic: 
- Toggle giữa tab Login và SignUp
- Form Login: email, password với nút ẩn/hiện mật khẩu
- Form SignUp: email, password, confirm password với nút ẩn/hiện mật khẩu
- Validate confirm password khớp với password
- Hỗ trợ chuyển đổi ngôn ngữ (vi/en)
-->
<template>
  <div class="loginform">
    <!-- Tab buttons -->
    <div class="tab-container">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'login' }"
        @click="activeTab = 'login'"
      >
        {{ currentLanguage === 'vi' ? 'Đăng nhập' : 'Login' }}
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'signup' }"
        @click="activeTab = 'signup'"
      >
        {{ currentLanguage === 'vi' ? 'Đăng ký' : 'Sign Up' }}
      </button>
    </div>

    <!-- Login Form -->
    <div v-if="activeTab === 'login'" class="form-container">
      <div class="input-group">
        <input 
          type="email" 
          v-model="loginForm.email"
          :placeholder="currentLanguage === 'vi' ? 'Email' : 'Email'"
          class="form-input"
        >
      </div>
      <div class="input-group">
        <input 
          :type="showLoginPassword ? 'text' : 'password'"
          v-model="loginForm.password"
          :placeholder="currentLanguage === 'vi' ? 'Mật khẩu' : 'Password'"
          class="form-input"
        >
        <button 
          type="button"
          class="toggle-password"
          @click="showLoginPassword = !showLoginPassword"
        >
          <img 
            :src="showLoginPassword ? 'src/icons/hide.png' : 'src/icons/show.png'"
            alt="Toggle password"
          >
        </button>
      </div>
      
      <!-- Remember me and Forgot password -->
      <div class="form-options">
        <label class="remember-me">
          <input 
            type="checkbox" 
            v-model="loginForm.rememberMe"
            class="checkbox"
          >
          <span class="checkmark"></span>
          {{ currentLanguage === 'vi' ? 'Ghi nhớ đăng nhập' : 'Remember me' }}
        </label>
        <a href="#" class="forgot-pass" @click.prevent="handleForgotPassword">
          {{ currentLanguage === 'vi' ? 'Quên mật khẩu?' : 'Forgot Password?' }}
        </a>
      </div>
      
      <button class="login-btn btn" @click="handleLogin">
        {{ currentLanguage === 'vi' ? 'Đăng nhập' : 'Login' }}
      </button>
    </div>

    <!-- SignUp Form -->
    <div v-if="activeTab === 'signup'" class="form-container">
      <div class="input-group">
        <input 
          type="email" 
          v-model="signupForm.email"
          :placeholder="currentLanguage === 'vi' ? 'Email' : 'Email'"
          class="form-input"
        >
      </div>
      <div class="input-group">
        <input 
          :type="showSignupPassword ? 'text' : 'password'"
          v-model="signupForm.password"
          :placeholder="currentLanguage === 'vi' ? 'Mật khẩu' : 'Password'"
          class="form-input"
        >
        <button 
          type="button"
          class="toggle-password"
          @click="showSignupPassword = !showSignupPassword"
        >
          <img 
            :src="showSignupPassword ? 'src/icons/hide.png' : 'src/icons/show.png'"
            alt="Toggle password"
          >
        </button>
      </div>
      <div class="input-group">
        <input 
          :type="showConfirmPassword ? 'text' : 'password'"
          v-model="signupForm.confirmPassword"
          :placeholder="currentLanguage === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password'"
          class="form-input"
        >
        <button 
          type="button"
          class="toggle-password"
          @click="showConfirmPassword = !showConfirmPassword"
        >
          <img 
            :src="showConfirmPassword ? 'src/icons/hide.png' : 'src/icons/show.png'"
            alt="Toggle password"
          >
        </button>
      </div>
      <button class="signup-btn btn" @click="handleSignup">
        {{ currentLanguage === 'vi' ? 'Đăng ký' : 'Sign Up' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Loginform',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  },
  data() {
    return {
      activeTab: 'login',
      showLoginPassword: false,
      showSignupPassword: false,
      showConfirmPassword: false,
      loginForm: {
        email: '',
        password: '',
        rememberMe: false
      },
      signupForm: {
        email: '',
        password: '',
        confirmPassword: ''
      }
    }
  },
  methods: {
    handleLogin() {
      // Logic đăng nhập sẽ được thêm sau
      console.log('Login:', this.loginForm)
    },
    handleForgotPassword() {
      // Logic quên mật khẩu sẽ được thêm sau
      console.log('Forgot Password clicked')
    },
    handleSignup() {
      // Logic đăng ký sẽ được thêm sau
      if (this.signupForm.password !== this.signupForm.confirmPassword) {
        const message = this.currentLanguage === 'vi' ? 'Mật khẩu không khớp!' : 'Passwords do not match!'
        alert(message)
        return
      }
      console.log('Signup:', this.signupForm)
    }
  }
}
</script>

<style scoped>
.loginform {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
  padding: 2rem;
}

.tab-container {
  display: flex;
  gap: 0.625rem;
  margin-bottom: 2rem;
}

.tab-btn {
  width: 7.5rem;
  height: 2.5rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  color: var(--theme-color);
  border-radius: 0.9375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  transform: scale(1.05);
}

.tab-btn.active {
  background: var(--theme-color);
  color: #000;
}

.form-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.input-group {
  position: relative;
  width: 100%;
  max-width: 18.75rem;
}

.form-input {
  width: 100%;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 0.125rem solid var(--theme-color);
  border-radius: 0.9375rem;
  background: #2B2D42;
  color: var(--theme-color);
  font-size: 0.875rem;
  outline: none;
  transition: box-shadow 0.3s ease;
}

.form-input:focus {
  box-shadow: 0 0 0.5rem rgba(255, 235, 124, 0.4);
}

.form-input::placeholder {
  color: rgba(255, 235, 124, 0.6);
}

.toggle-password {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-password img {
  width: 1rem;
  height: 1rem;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.login-btn, .signup-btn {
  width: 12.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.9375rem;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 1rem;
}

.form-options {
  width: 100%;
  max-width: 18.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.remember-me {
  display: flex;
  align-items: center;
  color: var(--theme-color);
  font-size: 0.75rem;
  cursor: pointer;
}

.checkbox {
  display: none;
}

.checkmark {
  width: 1rem;
  height: 1rem;
  border: 0.125rem solid var(--theme-color);
  border-radius: 0.1875rem;
  margin-right: 0.5rem;
  position: relative;
  transition: all 0.3s ease;
}

.checkbox:checked + .checkmark {
  background: var(--theme-color);
}

.checkbox:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 0.1875rem;
  top: 0.0625rem;
  width: 0.3125rem;
  height: 0.625rem;
  border: solid #000;
  border-width: 0 0.125rem 0.125rem 0;
  transform: rotate(45deg);
}

.forgot-pass {
  color: var(--theme-color);
  font-size: 0.75rem;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.forgot-pass:hover {
  opacity: 0.7;
  text-decoration: underline;
}
</style>