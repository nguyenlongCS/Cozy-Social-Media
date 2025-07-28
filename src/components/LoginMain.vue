<!--
src/components/LoginMain.vue - Refactored
Component form đăng nhập/đăng ký
Logic:
- Toggle giữa tab Login và SignUp
- Form validation và xử lý submit
- Remember me functionality với localStorage
- Password visibility toggle
- Firebase authentication integration
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
        {{ getText('login') }}
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'signup' }"
        @click="activeTab = 'signup'"
      >
        {{ getText('signup') }}
      </button>
    </div>

    <!-- Login Form -->
    <div v-if="activeTab === 'login'" class="form-container">
      <div class="input-group">
        <input 
          type="email" 
          v-model="loginForm.email"
          :placeholder="getText('email')"
          class="form-input"
        >
      </div>
      <div class="input-group">
        <input 
          :type="showLoginPassword ? 'text' : 'password'"
          v-model="loginForm.password"
          :placeholder="getText('password')"
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
      
      <div class="form-options">
        <label class="remember-me">
          <input 
            type="checkbox" 
            v-model="loginForm.rememberMe"
            class="checkbox"
            @change="handleRememberMeChange"
          >
          <span class="checkmark"></span>
          {{ getText('rememberMe') }}
        </label>
        <a href="#" class="forgot-pass" @click.prevent="handleForgotPassword">
          {{ getText('forgotPassword') }}
        </a>
      </div>
      
      <button class="login-btn btn" @click="handleLogin" :disabled="isLoading">
        {{ isLoading ? '...' : getText('login') }}
      </button>
    </div>

    <!-- SignUp Form -->
    <div v-if="activeTab === 'signup'" class="form-container">
      <div class="input-group">
        <input 
          type="email" 
          v-model="signupForm.email"
          :placeholder="getText('email')"
          class="form-input"
        >
      </div>
      <div class="input-group">
        <input 
          :type="showSignupPassword ? 'text' : 'password'"
          v-model="signupForm.password"
          :placeholder="getText('password')"
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
          :placeholder="getText('confirmPassword')"
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
        {{ isLoading ? '...' : getText('signup') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useStorage } from '@/composables/useStorage'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'LoginForm',
  setup() {
    const router = useRouter()
    const { loginWithEmail, signupWithEmail, resetPassword, isLoading } = useAuth()
    const { loadRememberedEmail, saveRememberedEmail } = useStorage()
    const { getText } = useLanguage()
    const { showError, showSuccess } = useErrorHandler()

    // Reactive data
    const activeTab = ref('login')
    const showLoginPassword = ref(false)
    const showSignupPassword = ref(false)
    const showConfirmPassword = ref(false)
    
    const loginForm = ref({
      email: '',
      password: '',
      rememberMe: false
    })
    
    const signupForm = ref({
      email: '',
      password: '',
      confirmPassword: ''
    })

    // Methods
    const handleRememberMeChange = () => {
      saveRememberedEmail(loginForm.value.email, loginForm.value.rememberMe)
    }

    const handleLogin = async () => {
      try {
        saveRememberedEmail(loginForm.value.email, loginForm.value.rememberMe)
        await loginWithEmail(loginForm.value.email, loginForm.value.password)
        console.log('Login successful')
        router.push('/')
      } catch (error) {
        showError(error, 'login')
      }
    }

    const handleForgotPassword = async () => {
      if (!loginForm.value.email) {
        showError({ message: 'MISSING_EMAIL' }, 'reset')
        return
      }

      try {
        await resetPassword(loginForm.value.email)
        showSuccess('reset')
      } catch (error) {
        showError(error, 'reset')
      }
    }

    const handleSignup = async () => {
      try {
        await signupWithEmail(
          signupForm.value.email, 
          signupForm.value.password, 
          signupForm.value.confirmPassword
        )
        
        showSuccess('signup')
        
        // Reset form and switch to login tab
        activeTab.value = 'login'
        signupForm.value = {
          email: '',
          password: '',
          confirmPassword: ''
        }
      } catch (error) {
        showError(error, 'signup')
      }
    }

    // Lifecycle
    onMounted(() => {
      const { email, remember } = loadRememberedEmail()
      if (email && remember) {
        loginForm.value.email = email
        loginForm.value.rememberMe = true
      }
    })

    return {
      activeTab,
      showLoginPassword,
      showSignupPassword,
      showConfirmPassword,
      loginForm,
      signupForm,
      isLoading,
      getText,
      handleLogin,
      handleForgotPassword,
      handleSignup,
      handleRememberMeChange
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

.form-input:-webkit-autofill,
.form-input:-webkit-autofill:hover,
.form-input:-webkit-autofill:focus,
.form-input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #2B2D42 inset !important;
  -webkit-text-fill-color: var(--theme-color) !important;
  background-color: #2B2D42 !important;
  border: 0.125rem solid var(--theme-color) !important;
  transition: background-color 5000s ease-in-out 0s;
}

.form-input:-moz-autofill {
  background-color: #2B2D42 !important;
  color: var(--theme-color) !important;
  border: 0.125rem solid var(--theme-color) !important;
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
  background: url('@/icons/show.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.hide-icon {
  background: url('@/icons/hide.png') center/cover;
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