/*
Composable quản lý ngôn ngữ
Centralize logic chuyển đổi ngôn ngữ và provide text translations
*/
import { ref, computed, watch } from 'vue'

// Global state để sync giữa các components
const globalLanguage = ref('vi')

export function useLanguage(initialLanguage = null) {
  // Sử dụng global state
  const currentLanguage = globalLanguage

  // Sync với initial language nếu có
  if (initialLanguage && (initialLanguage === 'vi' || initialLanguage === 'en')) {
    currentLanguage.value = initialLanguage
  }

  // Toggle ngôn ngữ
  const toggleLanguage = () => {
    currentLanguage.value = currentLanguage.value === 'vi' ? 'en' : 'vi'
  }

  // Set ngôn ngữ cụ thể
  const setLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      currentLanguage.value = lang
    }
  }

  // Sync với external prop changes
  const syncWithProp = (propLanguage) => {
    if (propLanguage && propLanguage !== currentLanguage.value) {
      setLanguage(propLanguage)
    }
  }

  // Text translations
  const texts = computed(() => {
    const translations = {
      vi: {
        // Authentication
        login: 'Đăng nhập',
        signup: 'Đăng ký',
        email: 'Email',
        password: 'Mật khẩu',
        confirmPassword: 'Xác nhận mật khẩu',
        rememberMe: 'Ghi nhớ đăng nhập',
        forgotPassword: 'Quên mật khẩu?',
        logout: 'Đăng xuất',
        back: 'Trở về',
        
        // Navigation
        createPost: 'Tạo Bài Đăng',
        explore: 'Khám Phá',
        settings: 'Cài Đặt',
        search: 'Tìm kiếm...',
        
        // Social login
        orSignInWith: 'Hoặc đăng nhập bằng',
        
        // Messages
        fillAllFields: 'Vui lòng nhập đầy đủ thông tin!',
        passwordMismatch: 'Mật khẩu không khớp!',
        weakPassword: 'Mật khẩu phải có ít nhất 6 ký tự!',
        loginFailed: 'Đăng nhập thất bại!',
        signupFailed: 'Đăng ký thất bại!',
        loginSuccess: 'Đăng nhập thành công!',
        signupSuccess: 'Đăng ký thành công!',
        logoutSuccess: 'Đăng xuất thành công!',
        logoutFailed: 'Đăng xuất thất bại!',
        resetEmailSent: 'Email đặt lại mật khẩu đã được gửi!',
        resetEmailFailed: 'Gửi email thất bại!',
        enterEmail: 'Vui lòng nhập email!',
        emailNotFound: 'Email không tồn tại!',
        wrongPassword: 'Mật khẩu không đúng!',
        invalidEmail: 'Email không hợp lệ!',
        emailInUse: 'Email đã được sử dụng!',
        googleLoginFailed: 'Đăng nhập Google thất bại!',
        facebookLoginFailed: 'Đăng nhập Facebook thất bại!',
        loginCancelled: 'Đăng nhập bị hủy!',
        popupBlocked: 'Popup bị chặn! Vui lòng cho phép popup.',
        accountExistsWithDifferentCredential: 'Email đã được sử dụng với phương thức đăng nhập khác!',
        authDomainConfigRequired: 'Cấu hình domain chưa đúng!',
        operationNotAllowed: 'Đăng nhập Facebook chưa được kích hoạt!'
      },
      en: {
        // Authentication
        login: 'Login',
        signup: 'Sign Up',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot Password?',
        logout: 'Logout',
        back: 'Back',
        
        // Navigation
        createPost: 'Create Post',
        explore: 'Explore',
        settings: 'Settings',
        search: 'Search...',
        
        // Social login
        orSignInWith: 'Or sign in with',
        
        // Messages
        fillAllFields: 'Please fill in all fields!',
        passwordMismatch: 'Passwords do not match!',
        weakPassword: 'Password must be at least 6 characters!',
        loginFailed: 'Login failed!',
        signupFailed: 'Registration failed!',
        loginSuccess: 'Login successful!',
        signupSuccess: 'Registration successful!',
        logoutSuccess: 'Logout successful!',
        logoutFailed: 'Logout failed!',
        resetEmailSent: 'Password reset email sent!',
        resetEmailFailed: 'Failed to send email!',
        enterEmail: 'Please enter your email!',
        emailNotFound: 'Email not found!',
        wrongPassword: 'Wrong password!',
        invalidEmail: 'Invalid email!',
        emailInUse: 'Email already in use!',
        googleLoginFailed: 'Google login failed!',
        facebookLoginFailed: 'Facebook login failed!',
        loginCancelled: 'Login cancelled!',
        popupBlocked: 'Popup blocked! Please allow popups.',
        accountExistsWithDifferentCredential: 'Email already used with different sign-in method!',
        authDomainConfigRequired: 'Auth domain configuration required!',
        operationNotAllowed: 'Facebook sign-in not enabled!'
      }
    }
    
    return translations[currentLanguage.value]
  })

  // Get text by key
  const getText = (key) => {
    return texts.value[key] || key
  }

  return {
    currentLanguage,
    toggleLanguage,
    setLanguage,
    syncWithProp,
    texts,
    getText
  }
}