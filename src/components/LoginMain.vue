<!--
Component form đăng nhập/đăng ký
Logic: 
- Toggle giữa tab Login và SignUp
- Form Login: email, password với nút ẹn/hiện mật khẩu, kết nối Firebase Auth
- Form SignUp: email, password, confirm password với nút ẩn/hiện mật khẩu, kết nối Firebase Auth
- Validate confirm password khớp với password
- Hỗ trợ chuyển đổi ngôn ngữ (vi/en)
- Firebase authentication cho email/password login và registration
- Chức năng Remember Me: lưu email vào localStorage khi được chọn
- Tự động load email đã lưu khi component được mount
- Xóa email khỏi localStorage khi không chọn Remember Me
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
          <div 
            class="password-icon"
            :class="showLoginPassword ? 'hide-icon' : 'show-icon'"
          ></div>
        </button>
      </div>
      
      <!-- Remember me and Forgot password -->
      <div class="form-options">
        <label class="remember-me">
          <input 
            type="checkbox" 
            v-model="loginForm.rememberMe"
            class="checkbox"
            @change="handleRememberMeChange"
          >
          <span class="checkmark"></span>
          {{ currentLanguage === 'vi' ? 'Ghi nhớ đăng nhập' : 'Remember me' }}
        </label>
        <a href="#" class="forgot-pass" @click.prevent="handleForgotPassword">
          {{ currentLanguage === 'vi' ? 'Quên mật khẩu?' : 'Forgot Password?' }}
        </a>
      </div>
      
      <button class="login-btn btn" @click="handleLogin" :disabled="isLoading">
        {{ isLoading ? '...' : (currentLanguage === 'vi' ? 'Đăng nhập' : 'Login') }}
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
          <div 
            class="password-icon"
            :class="showSignupPassword ? 'hide-icon' : 'show-icon'"
          ></div>
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
          <div 
            class="password-icon"
            :class="showConfirmPassword ? 'hide-icon' : 'show-icon'"
          ></div>
        </button>
      </div>
      <button class="signup-btn btn" @click="handleSignup" :disabled="isLoading">
        {{ isLoading ? '...' : (currentLanguage === 'vi' ? 'Đăng ký' : 'Sign Up') }}
      </button>
    </div>
  </div>
</template>

<script>
// Import Firebase Auth functions
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '@/firebase/config'

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
      isLoading: false,
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
  mounted() {
    // Load remembered email when component mounts
    this.loadRememberedEmail()
  },
  methods: {
    loadRememberedEmail() {
      try {
        const rememberedEmail = localStorage.getItem('rememberedEmail')
        const rememberMe = localStorage.getItem('rememberMe') === 'true'
        
        if (rememberedEmail && rememberMe) {
          this.loginForm.email = rememberedEmail
          this.loginForm.rememberMe = true
        }
      } catch (error) {
        console.error('Error loading remembered email:', error)
      }
    },
    
    handleRememberMeChange() {
      try {
        if (this.loginForm.rememberMe) {
          // Save email to localStorage when remember me is checked
          if (this.loginForm.email) {
            localStorage.setItem('rememberedEmail', this.loginForm.email)
            localStorage.setItem('rememberMe', 'true')
          }
        } else {
          // Remove email from localStorage when remember me is unchecked
          localStorage.removeItem('rememberedEmail')
          localStorage.removeItem('rememberMe')
        }
      } catch (error) {
        console.error('Error handling remember me:', error)
      }
    },
    
    async handleLogin() {
      if (!this.loginForm.email || !this.loginForm.password) {
        const message = this.currentLanguage === 'vi' 
          ? 'Vui lòng nhập đầy đủ thông tin!' 
          : 'Please fill in all fields!'
        alert(message)
        return
      }

      // Handle remember me functionality before login
      try {
        if (this.loginForm.rememberMe) {
          localStorage.setItem('rememberedEmail', this.loginForm.email)
          localStorage.setItem('rememberMe', 'true')
        } else {
          localStorage.removeItem('rememberedEmail')
          localStorage.removeItem('rememberMe')
        }
      } catch (error) {
        console.error('Error saving remember me:', error)
      }

      this.isLoading = true
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          this.loginForm.email, 
          this.loginForm.password
        )
        const user = userCredential.user
        
        console.log('Login successful:', user)
        
        // Chuyển hướng về trang chủ sau khi đăng nhập thành công
        this.$router.push('/')
        
      } catch (error) {
        console.error('Login error:', error)
        let message = this.currentLanguage === 'vi' 
          ? 'Đăng nhập thất bại!' 
          : 'Login failed!'
          
        // Customize error messages based on error code
        if (error.code === 'auth/user-not-found') {
          message = this.currentLanguage === 'vi' 
            ? 'Email không tồn tại!' 
            : 'Email not found!'
        } else if (error.code === 'auth/wrong-password') {
          message = this.currentLanguage === 'vi' 
            ? 'Mật khẩu không đúng!' 
            : 'Wrong password!'
        } else if (error.code === 'auth/invalid-email') {
          message = this.currentLanguage === 'vi' 
            ? 'Email không hợp lệ!' 
            : 'Invalid email!'
        }
        
        alert(message)
      } finally {
        this.isLoading = false
      }
    },
    
    async handleForgotPassword() {
      if (!this.loginForm.email) {
        const message = this.currentLanguage === 'vi' 
          ? 'Vui lòng nhập email!' 
          : 'Please enter your email!'
        alert(message)
        return
      }

      try {
        await sendPasswordResetEmail(auth, this.loginForm.email)
        const message = this.currentLanguage === 'vi' 
          ? 'Email đặt lại mật khẩu đã được gửi!' 
          : 'Password reset email sent!'
        alert(message)
      } catch (error) {
        console.error('Password reset error:', error)
        const message = this.currentLanguage === 'vi' 
          ? 'Gửi email thất bại!' 
          : 'Failed to send email!'
        alert(message)
      }
    },
    
    async handleSignup() {
      // Validate inputs
      if (!this.signupForm.email || !this.signupForm.password || !this.signupForm.confirmPassword) {
        const message = this.currentLanguage === 'vi' 
          ? 'Vui lòng nhập đầy đủ thông tin!' 
          : 'Please fill in all fields!'
        alert(message)
        return
      }

      if (this.signupForm.password !== this.signupForm.confirmPassword) {
        const message = this.currentLanguage === 'vi' 
          ? 'Mật khẩu không khớp!' 
          : 'Passwords do not match!'
        alert(message)
        return
      }

      if (this.signupForm.password.length < 6) {
        const message = this.currentLanguage === 'vi' 
          ? 'Mật khẩu phải có ít nhất 6 ký tự!' 
          : 'Password must be at least 6 characters!'
        alert(message)
        return
      }

      this.isLoading = true
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          this.signupForm.email, 
          this.signupForm.password
        )
        const user = userCredential.user
        
        console.log('Signup successful:', user)
        
        const message = this.currentLanguage === 'vi' 
          ? 'Đăng ký thành công!' 
          : 'Registration successful!'
        alert(message)
        
        // Chuyển về tab login sau khi đăng ký thành công
        this.activeTab = 'login'
        this.signupForm = {
          email: '',
          password: '',
          confirmPassword: ''
        }
        
      } catch (error) {
        console.error('Signup error:', error)
        let message = this.currentLanguage === 'vi' 
          ? 'Đăng ký thất bại!' 
          : 'Registration failed!'
          
        // Customize error messages based on error code
        if (error.code === 'auth/email-already-in-use') {
          message = this.currentLanguage === 'vi' 
            ? 'Email đã được sử dụng!' 
            : 'Email already in use!'
        } else if (error.code === 'auth/invalid-email') {
          message = this.currentLanguage === 'vi' 
            ? 'Email không hợp lệ!' 
            : 'Invalid email!'
        } else if (error.code === 'auth/weak-password') {
          message = this.currentLanguage === 'vi' 
            ? 'Mật khẩu quá yếu!' 
            : 'Password too weak!'
        }
        
        alert(message)
      } finally {
        this.isLoading = false
      }
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

.password-icon {
  width: 1rem;
  height: 1rem;
}

.show-icon {
  background: url('src/icons/show.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.hide-icon {
  background: url('src/icons/hide.png') center/cover;
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

.login-btn:disabled, .signup-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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