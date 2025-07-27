/*
src/composables/useLanguage.js - Updated
Composable quản lý ngôn ngữ
Centralize logic chuyển đổi ngôn ngữ và provide text translations
Added: Comments and Likes related text
*/
import { ref } from 'vue'

// Global state để sync giữa các components
const globalLanguage = ref('vi')

// Load language từ localStorage khi khởi tạo module
const loadLanguageFromStorage = () => {
  try {
    const savedLanguage = localStorage.getItem('appLanguage')
    if (savedLanguage === 'vi' || savedLanguage === 'en') {
      globalLanguage.value = savedLanguage
    }
  } catch (error) {
    console.error('Error loading language from localStorage:', error)
  }
}

// Save language vào localStorage
const saveLanguageToStorage = (language) => {
  try {
    localStorage.setItem('appLanguage', language)
  } catch (error) {
    console.error('Error saving language to localStorage:', error)
  }
}

// Initialize language từ storage
loadLanguageFromStorage()

// Text translations
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
    
    // Create Post
    writeCaption: 'Viết chú thích...',
    addMedia: 'Thêm ảnh/video',
    cancel: 'Hủy',
    post: 'Đăng',
    guest: 'Khách',
    user: 'Người dùng',
    
    // Feed states
    loading: 'Đang tải...',
    noPosts: 'Chưa có bài viết nào',
    textPost: 'Bài viết văn bản',
    
    // Post details - HomeRight
    caption: 'Chú thích',
    noCaption: 'Không có chú thích',
    likes: 'lượt thích',
    comments: 'Bình luận',
    noComments: 'Chưa có bình luận nào',
    writeComment: 'Viết bình luận...',
    loginToComment: 'Đăng nhập để bình luận',
    selectPost: 'Chọn bài viết để xem chi tiết',
    
    // Time formats
    justNow: 'Vừa xong',
    minutesAgo: ' phút trước',
    hoursAgo: ' giờ trước',
    daysAgo: ' ngày trước',
    
    // Footer messages
    scrollToNext: 'Cuộn để xem bài viết tiếp theo',
    scrollTooFast: 'Thao tác cuộn quá nhanh',
    
    // Success Messages
    loginSuccess: 'Đăng nhập thành công!',
    signupSuccess: 'Đăng ký thành công!',
    logoutSuccess: 'Đăng xuất thành công!',
    resetEmailSent: 'Email đặt lại mật khẩu đã được gửi!',
    postSuccess: 'Đăng bài thành công!',
    
    // Error Messages - Authentication
    fillAllFields: 'Vui lòng nhập đầy đủ thông tin!',
    passwordMismatch: 'Mật khẩu không khớp!',
    weakPassword: 'Mật khẩu phải có ít nhất 6 ký tự!',
    enterEmail: 'Vui lòng nhập email!',
    emailNotFound: 'Email không tồn tại!',
    wrongPassword: 'Mật khẩu không đúng!',
    invalidEmail: 'Email không hợp lệ!',
    emailInUse: 'Email đã được sử dụng!',
    loginFailed: 'Đăng nhập thất bại!',
    signupFailed: 'Đăng ký thất bại!',
    logoutFailed: 'Đăng xuất thất bại!',
    resetEmailFailed: 'Gửi email thất bại!',
    
    // Error Messages - Social Login
    googleLoginFailed: 'Đăng nhập Google thất bại!',
    facebookLoginFailed: 'Đăng nhập Facebook thất bại!',
    loginCancelled: 'Đăng nhập bị hủy!',
    popupBlocked: 'Popup bị chặn! Vui lòng cho phép popup.',
    accountExistsWithDifferentCredential: 'Email đã được sử dụng với phương thức đăng nhập khác!',
    authDomainConfigRequired: 'Cấu hình domain chưa đúng!',
    operationNotAllowed: 'Đăng nhập Facebook chưa được kích hoạt!',
    
    // Error Messages - Create Post
    postFailed: 'Đăng bài thất bại!',
    fileTooLarge: 'File quá lớn! Tối đa 10MB.',
    invalidFileType: 'Loại file không hợp lệ! Chỉ chấp nhận ảnh/video.',
    missingCaption: 'Vui lòng nhập chú thích!',
    notAuthenticated: 'Vui lòng đăng nhập!',
    
    // Error Messages - Comments and Likes
    likeFailed: 'Thích bài viết thất bại!',
    commentFailed: 'Thêm bình luận thất bại!',
    loadCommentsFailed: 'Tải bình luận thất bại!',
    
    // Error Messages - Load Posts
    loadPostsFailed: 'Tải bài viết thất bại!',
    
    // Default Error
    defaultError: 'Có lỗi xảy ra!'
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
    
    // Create Post
    writeCaption: 'Write a caption...',
    addMedia: 'Add photo/video',
    cancel: 'Cancel',
    post: 'Post',
    guest: 'Guest',
    user: 'User',
    
    // Feed states
    loading: 'Loading...',
    noPosts: 'No posts yet',
    textPost: 'Text post',
    
    // Post details - HomeRight
    caption: 'Caption',
    noCaption: 'No caption',
    likes: 'likes',
    comments: 'Comments',
    noComments: 'No comments yet',
    writeComment: 'Write a comment...',
    loginToComment: 'Login to comment',
    selectPost: 'Select a post to view details',
    
    // Time formats
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    
    // Footer messages
    scrollToNext: 'Scroll to see next post',
    scrollTooFast: 'Scrolling too fast',
    
    // Success Messages
    loginSuccess: 'Login successful!',
    signupSuccess: 'Registration successful!',
    logoutSuccess: 'Logout successful!',
    resetEmailSent: 'Password reset email sent!',
    postSuccess: 'Post created successfully!',
    
    // Error Messages - Authentication
    fillAllFields: 'Please fill in all fields!',
    passwordMismatch: 'Passwords do not match!',
    weakPassword: 'Password must be at least 6 characters!',
    enterEmail: 'Please enter your email!',
    emailNotFound: 'Email not found!',
    wrongPassword: 'Wrong password!',
    invalidEmail: 'Invalid email!',
    emailInUse: 'Email already in use!',
    loginFailed: 'Login failed!',
    signupFailed: 'Registration failed!',
    logoutFailed: 'Logout failed!',
    resetEmailFailed: 'Failed to send email!',
    
    // Error Messages - Social Login
    googleLoginFailed: 'Google login failed!',
    facebookLoginFailed: 'Facebook login failed!',
    loginCancelled: 'Login cancelled!',
    popupBlocked: 'Popup blocked! Please allow popups.',
    accountExistsWithDifferentCredential: 'Email already used with different sign-in method!',
    authDomainConfigRequired: 'Auth domain configuration required!',
    operationNotAllowed: 'Facebook sign-in not enabled!',
    
    // Error Messages - Create Post
    postFailed: 'Failed to create post!',
    fileTooLarge: 'File too large! Maximum 10MB.',
    invalidFileType: 'Invalid file type! Only images/videos allowed.',
    missingCaption: 'Please enter a caption!',
    notAuthenticated: 'Please login first!',
    
    // Error Messages - Comments and Likes
    likeFailed: 'Failed to like post!',
    commentFailed: 'Failed to add comment!',
    loadCommentsFailed: 'Failed to load comments!',
    
    // Error Messages - Load Posts
    loadPostsFailed: 'Failed to load posts!',
    
    // Default Error
    defaultError: 'An error occurred!'
  }
}

export function useLanguage() {
  // Toggle ngôn ngữ
  const toggleLanguage = () => {
    const newLanguage = globalLanguage.value === 'vi' ? 'en' : 'vi'
    setLanguage(newLanguage)
  }

  // Set ngôn ngữ cụ thể
  const setLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      globalLanguage.value = lang
      saveLanguageToStorage(lang)
    }
  }

  // Get text by key
  const getText = (key) => {
    const currentTexts = translations[globalLanguage.value]
    return currentTexts[key] || key
  }

  return {
    currentLanguage: globalLanguage,
    toggleLanguage,
    setLanguage,
    getText
  }
}