<!--
src/components/LoginRight.vue - Refactored
Component sidebar bên phải trang login
Logic: Social login buttons với Google và Facebook
-->
<template>
  <div class="social">
    <div class="social-login-container">
      <h3 class="social-title">{{ getText('orSignInWith') }}</h3>
      
      <button class="social-btn google-btn" @click="handleGoogleLogin" :disabled="isLoading">
        <img src="@/icons/google-logo.png" alt="Google" class="social-icon">
        <span>Google</span>
      </button>
      
      <button class="social-btn facebook-btn" @click="handleFacebookLogin" :disabled="isLoading">
        <img src="@/icons/facebook-logo.png" alt="Facebook" class="social-icon">
        <span>Facebook</span>
      </button>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'LoginRight',
  setup() {
    const router = useRouter()
    const { loginWithGoogle, loginWithFacebook, isLoading } = useAuth()
    const { getText } = useLanguage()
    const { showError } = useErrorHandler()

    const handleGoogleLogin = async () => {
      try {
        await loginWithGoogle()
        router.push('/')
      } catch (error) {
        showError(error, 'google')
      }
    }
    
    const handleFacebookLogin = async () => {
      try {
        await loginWithFacebook()
        router.push('/')
      } catch (error) {
        showError(error, 'facebook')
      }
    }

    return {
      isLoading,
      getText,
      handleGoogleLogin,
      handleFacebookLogin
    }
  }
}
</script>

<style scoped>
.social {
  width: 22.13%;
  background: #2B2D42;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 1rem;
  font-weight: 500;
}

.social-login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.social-title {
  color: var(--theme-color);
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  text-align: center;
}

.social-btn {
  width: 12rem;
  height: 2.5rem;
  border: var(--theme-color);
  border-radius: 0.9375rem;
  background: var(--theme-color);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* .social-btn:hover:not(:disabled) {
  transform: scale(1.05);
  background: var(--theme-color);
  color: #000;
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
} */

.social-icon {
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
}

.google-btn:hover:not(:disabled) .social-icon {
  filter: brightness(0);
}

.facebook-btn:hover:not(:disabled) .social-icon {
  filter: brightness(0);
}
</style>