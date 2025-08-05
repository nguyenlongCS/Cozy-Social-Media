/*
src/composables/useLanguage.js - Updated with Friends Feature Text
Composable quản lý ngôn ngữ với text cho chức năng kết bạn
Added: Translations cho friends, suggestions, friend requests, actions
Complete translation system cho toàn bộ ứng dụng bao gồm friends feature
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

// Complete text translations with Friends feature
const translations = {
  vi: {
    // ===== AUTHENTICATION =====
    login: 'Đăng nhập',
    signup: 'Đăng ký',
    email: 'Email',
    password: 'Mật khẩu',
    confirmPassword: 'Xác nhận mật khẩu',
    rememberMe: 'Ghi nhớ đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    logout: 'Đăng xuất',
    back: 'Trở về',
    orSignInWith: 'Hoặc đăng nhập bằng',
    
    // ===== NAVIGATION & MENU =====
    createPost: 'Tạo Bài Đăng',
    explore: 'Khám Phá',
    settings: 'Cài Đặt',
    search: 'Tìm kiếm...',
    home: 'Trang chủ',
    profile: 'Hồ sơ',
    
    // ===== FRIENDS FEATURE =====
    friends: 'Bạn bè',
    suggestions: 'Gợi ý kết bạn',
    friendRequests: 'Lời mời kết bạn',
    noFriendsYet: 'Chưa có bạn bè nào',
    noSuggestions: 'Không có gợi ý nào',
    noFriendRequests: 'Không có lời mời nào',
    selectOption: 'Chọn một tùy chọn',
    friendsSince: 'Bạn bè từ',
    requestSent: 'Gửi lời mời',
    addFriend: 'Kết bạn',
    unfriend: 'Hủy kết bạn',
    accept: 'Chấp nhận',
    reject: 'Từ chối',
    confirmUnfriend: 'Bạn có chắc muốn hủy kết bạn?',
    unknownUser: 'Người dùng không xác định',
    
    // ===== CREATE POST =====
    writeCaption: 'Viết chú thích...',
    addMedia: 'Thêm ảnh/video',
    cancel: 'Hủy',
    post: 'Đăng',
    remove: 'Xóa',
    
    // ===== USER STATES & SYNC =====
    guest: 'Khách',
    user: 'Người dùng',
    loading: 'Đang tải...',
    saving: 'Đang lưu...',
    syncing: 'Đang đồng bộ...',
    syncingData: 'Đồng bộ dữ liệu',
    
    // ===== FEED & POSTS =====
    noPosts: 'Chưa có bài viết nào',
    textPost: 'Bài viết văn bản',
    selectPost: 'Chọn bài viết để xem chi tiết',
    
    // ===== POST DETAILS =====
    caption: 'Chú thích',
    noCaption: 'Không có chú thích',
    likes: 'lượt thích',
    comments: 'Bình luận',
    noComments: 'Chưa có bình luận nào',
    writeComment: 'Viết bình luận...',
    loginToComment: 'Đăng nhập để bình luận',
    
    // ===== PROFILE PAGE =====
    clickToUpload: 'Click để tải ảnh',
    noName: 'Chưa có tên',
    signedInWith: 'Đăng nhập bằng',
    joinedOn: 'Tham gia vào',
    userName: 'Tên người dùng',
    enterUserName: 'Nhập tên người dùng...',
    bio: 'Tiểu sử',
    enterBio: 'Nhập tiểu sử...',
    gender: 'Giới tính',
    selectGender: 'Chọn giới tính',
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    saveChanges: 'Lưu thay đổi',
    errorLoadingProfile: 'Lỗi tải thông tin',
    retry: 'Thử lại',
    loginRequired: 'Yêu cầu đăng nhập',
    loginToViewProfile: 'Đăng nhập để xem thông tin cá nhân',
    
    // ===== TIME FORMATS =====
    justNow: 'Vừa xong',
    minutesAgo: ' phút trước',
    hoursAgo: ' giờ trước',
    daysAgo: ' ngày trước',
    
    // ===== FOOTER & INTERACTION =====
    scrollToNext: 'Cuộn để xem bài viết tiếp theo',
    scrollTooFast: 'Thao tác cuộn quá nhanh',

    // ===== MULTI-MEDIA SUPPORT =====
    multiMediaHint: 'Chọn nhiều ảnh/video (tối đa 10)',
    mediaLimit: 'Tối đa 10 media',
    tooManyFiles: 'Quá nhiều files! Tối đa 10 media.',
    
    // ===== SUCCESS MESSAGES =====
    loginSuccess: 'Đăng nhập thành công!',
    signupSuccess: 'Đăng ký thành công!',
    logoutSuccess: 'Đăng xuất thành công!',
    resetEmailSent: 'Email đặt lại mật khẩu đã được gửi!',
    postSuccess: 'Đăng bài thành công!',
    profileSuccess: 'Cập nhật thông tin thành công!',
    syncSuccess: 'Đồng bộ dữ liệu thành công!',
    friendRequestSent: 'Đã gửi lời mời kết bạn!',
    friendRequestAccepted: 'Đã chấp nhận lời mời kết bạn!',
    friendRequestRejected: 'Đã từ chối lời mời kết bạn!',
    unfriend: 'Đã hủy kết bạn!',
    
    // ===== ERROR MESSAGES - AUTHENTICATION =====
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

    // ===== PROFILE HOME RIGHT =====
    interests: 'Nội dung quan tâm',
    noInterestsSelected: 'Chưa chọn nội dung quan tâm nào',
    selectInterests: 'Chọn nội dung quan tâm',
    posts: 'Danh sách bài viết',
    postsComingSoon: 'Tính năng sắp ra mắt',
    friendsComingSoon: 'Tính năng sắp ra mắt',
    save: 'Lưu',
    
    // ===== ERROR MESSAGES - SOCIAL LOGIN =====
    googleLoginFailed: 'Đăng nhập Google thất bại!',
    facebookLoginFailed: 'Đăng nhập Facebook thất bại!',
    loginCancelled: 'Đăng nhập bị hủy!',
    popupBlocked: 'Popup bị chặn! Vui lòng cho phép popup.',
    accountExistsWithDifferentCredential: 'Email đã được sử dụng với phương thức đăng nhập khác!',
    authDomainConfigRequired: 'Cấu hình domain chưa đúng!',
    operationNotAllowed: 'Đăng nhập Facebook chưa được kích hoạt!',
    
    // ===== ERROR MESSAGES - POSTS & MEDIA =====
    postFailed: 'Đăng bài thất bại!',
    fileTooLarge: 'File quá lớn! Tối đa 10MB.',
    invalidFileType: 'Loại file không hợp lệ! Chỉ chấp nhận ảnh/video.',
    missingCaption: 'Vui lòng nhập chú thích!',
    missingMedia: 'Vui lòng chọn ảnh hoặc video!',
    notAuthenticated: 'Vui lòng đăng nhập!',
    loadPostsFailed: 'Tải bài viết thất bại!',
    
    // ===== ERROR MESSAGES - PROFILE =====
    avatarTooLarge: 'Ảnh đại diện quá lớn! Tối đa 5MB.',
    invalidAvatarType: 'Loại file không hợp lệ! Chỉ chấp nhận ảnh.',
    profileUpdateFailed: 'Cập nhật thông tin thất bại!',
    
    // ===== ERROR MESSAGES - INTERACTIONS =====
    likeFailed: 'Thích bài viết thất bại!',
    commentFailed: 'Thêm bình luận thất bại!',
    loadCommentsFailed: 'Tải bình luận thất bại!',
    alreadyLikedPost: 'Bạn đã thích bài viết này!',
    
    // ===== ERROR MESSAGES - FRIENDS =====
    loadFriends: 'Tải danh sách bạn bè thất bại!',
    loadSuggestions: 'Tải gợi ý kết bạn thất bại!',
    loadRequests: 'Tải lời mời kết bạn thất bại!',
    sendRequest: 'Gửi lời mời kết bạn thất bại!',
    acceptRequest: 'Chấp nhận lời mời thất bại!',
    rejectRequest: 'Từ chối lời mời thất bại!',
    
    // ===== ERROR MESSAGES - SYNC =====
    syncFailed: 'Đồng bộ dữ liệu thất bại!',
    
    // ===== DEFAULT & FALLBACK =====
    defaultError: 'Có lỗi xảy ra!',
    unknownError: 'Lỗi không xác định!'
  },
  
  en: {
    // ===== AUTHENTICATION =====
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password?',
    logout: 'Logout',
    back: 'Back',
    orSignInWith: 'Or sign in with',
    
    // ===== NAVIGATION & MENU =====
    createPost: 'Create Post',
    explore: 'Explore',
    settings: 'Settings',
    search: 'Search...',
    home: 'Home',
    profile: 'Profile',
    
    // ===== FRIENDS FEATURE =====
    friends: 'Friends',
    suggestions: 'Friend Suggestions',
    friendRequests: 'Friend Requests',
    noFriendsYet: 'No friends yet',
    noSuggestions: 'No suggestions available',
    noFriendRequests: 'No friend requests',
    selectOption: 'Select an option',
    friendsSince: 'Friends since',
    requestSent: 'Request sent',
    addFriend: 'Add Friend',
    unfriend: 'Unfriend',
    accept: 'Accept',
    reject: 'Reject',
    confirmUnfriend: 'Are you sure you want to unfriend?',
    unknownUser: 'Unknown User',
    
    // ===== CREATE POST =====
    writeCaption: 'Write a caption...',
    addMedia: 'Add photo/video',
    cancel: 'Cancel',
    post: 'Post',
    remove: 'Remove',
    
    // ===== USER STATES & SYNC =====
    guest: 'Guest',
    user: 'User',
    loading: 'Loading...',
    saving: 'Saving...',
    syncing: 'Syncing...',
    syncingData: 'Syncing data',
    
    // ===== FEED & POSTS =====
    noPosts: 'No posts yet',
    textPost: 'Text post',
    selectPost: 'Select a post to view details',
    
    // ===== POST DETAILS =====
    caption: 'Caption',
    noCaption: 'No caption',
    likes: 'likes',
    comments: 'Comments',
    noComments: 'No comments yet',
    writeComment: 'Write a comment...',
    loginToComment: 'Login to comment',
    
    // ===== PROFILE PAGE =====
    clickToUpload: 'Click to upload',
    noName: 'No Name',
    signedInWith: 'Signed in with',
    joinedOn: 'Joined on',
    userName: 'Username',
    enterUserName: 'Enter username...',
    bio: 'Bio',
    enterBio: 'Enter bio...',
    gender: 'Gender',
    selectGender: 'Select gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    saveChanges: 'Save Changes',
    errorLoadingProfile: 'Error loading profile',
    retry: 'Retry',
    loginRequired: 'Login Required',
    loginToViewProfile: 'Login to view your profile',
    
    // ===== TIME FORMATS =====
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    
    // ===== FOOTER & INTERACTION =====
    scrollToNext: 'Scroll to see next post',
    scrollTooFast: 'Scrolling too fast',
    
    // ===== PROFILE HOME RIGHT =====
    interests: 'Interests',
    noInterestsSelected: 'No interests selected',
    selectInterests: 'Select Interests',
    posts: 'Posts',
    postsComingSoon: 'Coming Soon',
    friendsComingSoon: 'Coming Soon',
    save: 'Save',

    // ===== MULTI-MEDIA SUPPORT =====
    multiMediaHint: 'Select multiple photos/videos (max 10)',
    mediaLimit: 'Max 10 media',
    tooManyFiles: 'Too many files! Maximum 10 media allowed.',
    
    // ===== SUCCESS MESSAGES =====
    loginSuccess: 'Login successful!',
    signupSuccess: 'Registration successful!',
    logoutSuccess: 'Logout successful!',
    resetEmailSent: 'Password reset email sent!',
    postSuccess: 'Post created successfully!',
    profileSuccess: 'Profile updated successfully!',
    syncSuccess: 'Data sync completed!',
    friendRequestSent: 'Friend request sent!',
    friendRequestAccepted: 'Friend request accepted!',
    friendRequestRejected: 'Friend request rejected!',
    unfriend: 'Unfriended successfully!',
    
    // ===== ERROR MESSAGES - AUTHENTICATION =====
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
    
    // ===== ERROR MESSAGES - SOCIAL LOGIN =====
    googleLoginFailed: 'Google login failed!',
    facebookLoginFailed: 'Facebook login failed!',
    loginCancelled: 'Login cancelled!',
    popupBlocked: 'Popup blocked! Please allow popups.',
    accountExistsWithDifferentCredential: 'Email already used with different sign-in method!',
    authDomainConfigRequired: 'Auth domain configuration required!',
    operationNotAllowed: 'Facebook sign-in not enabled!',
    
    // ===== ERROR MESSAGES - POSTS & MEDIA =====
    postFailed: 'Failed to create post!',
    fileTooLarge: 'File too large! Maximum 10MB.',
    invalidFileType: 'Invalid file type! Only images/videos allowed.',
    missingCaption: 'Please enter a caption!',
    missingMedia: 'Please select a photo or video!',
    notAuthenticated: 'Please login first!',
    loadPostsFailed: 'Failed to load posts!',
    
    // ===== ERROR MESSAGES - PROFILE =====
    avatarTooLarge: 'Avatar too large! Maximum 5MB.',
    invalidAvatarType: 'Invalid file type! Only images allowed.',
    profileUpdateFailed: 'Failed to update profile!',
    
    // ===== ERROR MESSAGES - INTERACTIONS =====
    likeFailed: 'Failed to like post!',
    commentFailed: 'Failed to add comment!',
    loadCommentsFailed: 'Failed to load comments!',
    alreadyLikedPost: 'You already liked this post!',
    
    // ===== ERROR MESSAGES - FRIENDS =====
    loadFriends: 'Failed to load friends!',
    loadSuggestions: 'Failed to load suggestions!',
    loadRequests: 'Failed to load friend requests!',
    sendRequest: 'Failed to send friend request!',
    acceptRequest: 'Failed to accept request!',
    rejectRequest: 'Failed to reject request!',
    
    // ===== ERROR MESSAGES - SYNC =====
    syncFailed: 'Data sync failed!',
    
    // ===== DEFAULT & FALLBACK =====
    defaultError: 'An error occurred!',
    unknownError: 'Unknown error!'
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
      console.log('Language changed to:', lang)
    }
  }

  // Get text by key với fallback mechanism
  const getText = (key) => {
    const currentTexts = translations[globalLanguage.value]
    const fallbackTexts = translations['en'] // English as fallback
    
    // Trả về text từ ngôn ngữ hiện tại, nếu không có thì dùng English, cuối cùng là key
    return currentTexts[key] || fallbackTexts[key] || key
  }

  // Get available languages
  const getAvailableLanguages = () => {
    return Object.keys(translations)
  }

  // Check if language is supported
  const isLanguageSupported = (lang) => {
    return translations.hasOwnProperty(lang)
  }

  // Get language display name
  const getLanguageDisplayName = (lang = globalLanguage.value) => {
    const displayNames = {
      'vi': 'Tiếng Việt',
      'en': 'English'
    }
    return displayNames[lang] || lang
  }

  return {
    currentLanguage: globalLanguage,
    toggleLanguage,
    setLanguage,
    getText,
    getAvailableLanguages,
    isLanguageSupported,
    getLanguageDisplayName
  }
}