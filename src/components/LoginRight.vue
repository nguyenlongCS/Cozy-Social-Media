<!--
Component sidebar bên phải trang login
Logic: Thêm Google và Facebook login với popup authentication
Kết nối Firebase Auth cho đăng nhập social media
-->
<template>
  <div class="social">
    <div class="social-login-container">
      <h3 class="social-title">{{ currentLanguage === 'vi' ? 'Hoặc đăng nhập bằng' : 'Or sign in with' }}</h3>
      
      <button class="social-btn google-btn" @click="signInWithGoogle">
        <img src="@/icons/google-logo.png" alt="Google" class="social-icon">
        <span>Google</span>
      </button>
      
      <button class="social-btn facebook-btn" @click="signInWithFacebook">
        <img src="@/icons/facebook-logo.png" alt="Facebook" class="social-icon">
        <span>Facebook</span>
      </button>
    </div>
  </div>
</template>

<script>
// Import Firebase Auth functions
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider 
} from 'firebase/auth'
import { auth } from '@/firebase/config'

export default {
  name: 'Social',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  },
  methods: {
    async signInWithGoogle() {
      try {
        const provider = new GoogleAuthProvider()
        provider.addScope('email')
        provider.addScope('profile')
        
        const result = await signInWithPopup(auth, provider)
        const user = result.user
        
        console.log('Google login successful:', user)
        // Chuyển hướng về trang chủ sau khi đăng nhập thành công
        this.$router.push('/')
        
      } catch (error) {
        console.error('Google login error:', error)
        const message = this.currentLanguage === 'vi' 
          ? 'Đăng nhập Google thất bại!' 
          : 'Google login failed!'
        alert(message)
      }
    },
    
    async signInWithFacebook() {
      try {
        const provider = new FacebookAuthProvider()
        provider.addScope('email')
        provider.addScope('public_profile')
        
        // Thêm custom parameters cho Facebook
        provider.setCustomParameters({
          'display': 'popup'
        })
        
        const result = await signInWithPopup(auth, provider)
        const user = result.user
        
        console.log('Facebook login successful:', user)
        
        // Lấy thông tin credential nếu cần
        const credential = FacebookAuthProvider.credentialFromResult(result)
        const accessToken = credential.accessToken
        console.log('Facebook access token:', accessToken)
        
        // Chuyển hướng về trang chủ sau khi đăng nhập thành công
        this.$router.push('/')
        
      } catch (error) {
        console.error('Facebook login error:', error)
        
        let message = this.currentLanguage === 'vi' 
          ? 'Đăng nhập Facebook thất bại!' 
          : 'Facebook login failed!'
          
        // Xử lý các lỗi cụ thể
        if (error.code === 'auth/popup-closed-by-user') {
          message = this.currentLanguage === 'vi' 
            ? 'Đăng nhập bị hủy!' 
            : 'Login cancelled!'
        } else if (error.code === 'auth/popup-blocked') {
          message = this.currentLanguage === 'vi' 
            ? 'Popup bị chặn! Vui lòng cho phép popup.' 
            : 'Popup blocked! Please allow popups.'
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          message = this.currentLanguage === 'vi' 
            ? 'Email đã được sử dụng với phương thức đăng nhập khác!' 
            : 'Email already used with different sign-in method!'
        } else if (error.code === 'auth/auth-domain-config-required') {
          message = this.currentLanguage === 'vi' 
            ? 'Cấu hình domain chưa đúng!' 
            : 'Auth domain configuration required!'
        } else if (error.code === 'auth/operation-not-allowed') {
          message = this.currentLanguage === 'vi' 
            ? 'Đăng nhập Facebook chưa được kích hoạt!' 
            : 'Facebook sign-in not enabled!'
        }
        
        alert(message)
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          customData: error.customData
        })
      }
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
  border: 0.125rem solid var(--theme-color);
  border-radius: 0.9375rem;
  background: #2B2D42;
  color: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.social-btn:hover {
  transform: scale(1.05);
  background: var(--theme-color);
  color: #000;
}

.social-icon {
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
}

.google-btn:hover .social-icon {
  filter: brightness(0);
}

.facebook-btn:hover .social-icon {
  filter: brightness(0);
}
</style>