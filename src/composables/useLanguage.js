/*
src/composables/useLanguage.js - Refactored
Language management với complete translations cho toàn bộ app
Logic: Global language state với localStorage persistence và fallback mechanism
*/
import { ref } from 'vue'

const globalLanguage = ref('vi')

// Load language from localStorage
const loadLanguageFromStorage = () => {
  try {
    const savedLanguage = localStorage.getItem('appLanguage')
    if (savedLanguage === 'vi' || savedLanguage === 'en') {
      globalLanguage.value = savedLanguage
    }
  } catch (error) {
    // Silent fail
  }
}

// Save language to localStorage
const saveLanguageToStorage = (language) => {
  try {
    localStorage.setItem('appLanguage', language)
  } catch (error) {
    // Silent fail
  }
}

// Initialize language
loadLanguageFromStorage()

// Complete translations
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
    orSignInWith: 'Hoặc đăng nhập bằng',
    
    // Navigation & Menu
    createPost: 'Tạo Bài Đăng',
    explore: 'Khám Phá',
    settings: 'Cài Đặt',
    search: 'Tìm kiếm...',
    home: 'Trang chủ',
    profile: 'Hồ sơ',
    
    // Friends Feature
    friends: 'Bạn bè',
    suggestions: 'Gợi ý kết bạn',
    friendRequests: 'Lời mời kết bạn',
    noFriendsYet: 'Chưa có bạn bè nào',
    noSuggestions: 'Không có gợi ý nào',
    noFriendRequests: 'Không có lời mời nào',
    friendsSince: 'Bạn bè từ',
    requestSent: 'Gửi lời mời',
    addFriend: 'Kết bạn',
    unfriend: 'Hủy kết bạn',
    accept: 'Chấp nhận',
    reject: 'Từ chối',
    confirmUnfriend: 'Bạn có chắc muốn hủy kết bạn?',
    unknownUser: 'Người dùng không xác định',
    viewAllFriends: 'Toàn bộ bạn bè',
    
    // Create Post
    writeCaption: 'Viết chú thích...',
    addMedia: 'Thêm ảnh/video',
    cancel: 'Hủy',
    post: 'Đăng',
    remove: 'Xóa',
    multiMediaHint: 'Chọn nhiều ảnh/video (tối đa 10)',
    mediaLimit: 'Tối đa 10 media',
    
    // User States
    guest: 'Khách',
    user: 'Người dùng',
    loading: 'Đang tải...',
    saving: 'Đang lưu...',
    syncing: 'Đang đồng bộ...',
    syncingData: 'Đồng bộ dữ liệu',
    
    // Feed & Posts
    noPosts: 'Chưa có bài viết nào',
    textPost: 'Bài viết văn bản',
    selectPost: 'Chọn bài viết để xem chi tiết',
    
    // Post Details
    caption: 'Chú thích',
    noCaption: 'Không có chú thích',
    likes: 'lượt thích',
    comments: 'Bình luận',
    noComments: 'Chưa có bình luận nào',
    writeComment: 'Viết bình luận...',
    loginToComment: 'Đăng nhập để bình luận',
    
    // Profile
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
    interests: 'Nội dung quan tâm',
    noInterestsSelected: 'Chưa chọn nội dung quan tâm nào',
    selectInterests: 'Chọn nội dung quan tâm',
    save: 'Lưu',
    posts: 'Danh sách bài viết',
    postsComingSoon: 'Tính năng sắp ra mắt',
    friendsComingSoon: 'Tính năng sắp ra mắt',
    
    // Time formats
    justNow: 'Vừa xong',
    minutesAgo: ' phút trước',
    hoursAgo: ' giờ trước',
    daysAgo: ' ngày trước',
    
    // Footer & Interaction
    scrollToNext: 'Cuộn để xem bài viết tiếp theo',
    scrollTooFast: 'Thao tác cuộn quá nhanh',
    
    // Success Messages
    loginSuccess: 'Đăng nhập thành công!',
    signupSuccess: 'Đăng ký thành công!',
    logoutSuccess: 'Đăng xuất thành công!',
    resetEmailSent: 'Email đặt lại mật khẩu đã được gửi!',
    postSuccess: 'Đăng bài thành công!',
    profileSuccess: 'Cập nhật thông tin thành công!',
    deletePostSuccess: 'Đã xóa bài viết!',
    hidePostSuccess: 'Đã ẩn bài viết!',
    downloadMediaSuccess: 'Tải xuống thành công!',
    friendRequestSent: 'Đã gửi lời mời kết bạn!',
    friendRequestAccepted: 'Đã chấp nhận lời mời kết bạn!',
    friendRequestRejected: 'Đã từ chối lời mời kết bạn!',
    
    // Error Messages
    fillAllFields: 'Vui lòng nhập đầy đủ thông tin!',
    passwordMismatch: 'Mật khẩu không khớp!',
    weakPassword: 'Mật khẩu phải có ít nhất 6 ký tự!',
    enterEmail: 'Vui lòng nhập email!',
    emailNotFound: 'Email không tồn tại!',
    wrongPassword: 'Mật khẩu không đúng!',
    invalidEmail: 'Email không hợp lệ!',
    emailInUse: 'Email đã được sử dụng!',
    loginCancelled: 'Đăng nhập bị hủy!',
    popupBlocked: 'Popup bị chặn! Vui lòng cho phép popup.',
    
    fileTooLarge: 'File quá lớn! Tối đa 10MB.',
    invalidFileType: 'Loại file không hợp lệ! Chỉ chấp nhận ảnh/video.',
    tooManyFiles: 'Quá nhiều files! Tối đa 10 media.',
    missingCaption: 'Vui lòng nhập chú thích!',
    missingMedia: 'Vui lòng chọn ảnh hoặc video!',
    notAuthenticated: 'Vui lòng đăng nhập!',
    permissionDenied: 'Không có quyền thực hiện!',
    
    avatarTooLarge: 'Ảnh đại diện quá lớn! Tối đa 5MB.',
    invalidAvatarType: 'Loại file không hợp lệ! Chỉ chấp nhận ảnh.',
    
    alreadyLikedPost: 'Bạn đã thích bài viết này!',
    
    // Default errors
    loginFailed: 'Đăng nhập thất bại!',
    signupFailed: 'Đăng ký thất bại!',
    googleLoginFailed: 'Đăng nhập Google thất bại!',
    facebookLoginFailed: 'Đăng nhập Facebook thất bại!',
    postFailed: 'Đăng bài thất bại!',
    profileUpdateFailed: 'Cập nhật thông tin thất bại!',
    likeFailed: 'Thích bài viết thất bại!',
    commentFailed: 'Thêm bình luận thất bại!',
    sendRequest: 'Gửi lời mời kết bạn thất bại!',
    acceptRequest: 'Chấp nhận lời mời thất bại!',
    deletePostFailed: 'Xóa bài viết thất bại!',
    hidePostFailed: 'Ẩn bài viết thất bại!',
    downloadMediaFailed: 'Tải xuống thất bại!',
    reportComingSoon: 'Tính năng báo cáo sắp ra mắt!',
    
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
    orSignInWith: 'Or sign in with',
    
    // Navigation & Menu
    createPost: 'Create Post',
    explore: 'Explore',
    settings: 'Settings',
    search: 'Search...',
    home: 'Home',
    profile: 'Profile',
    
    // Friends Feature
    friends: 'Friends',
    suggestions: 'Friend Suggestions',
    friendRequests: 'Friend Requests',
    noFriendsYet: 'No friends yet',
    noSuggestions: 'No suggestions available',
    noFriendRequests: 'No friend requests',
    friendsSince: 'Friends since',
    requestSent: 'Request sent',
    addFriend: 'Add Friend',
    unfriend: 'Unfriend',
    accept: 'Accept',
    reject: 'Reject',
    confirmUnfriend: 'Are you sure you want to unfriend?',
    unknownUser: 'Unknown User',
    viewAllFriends: 'View All Friends',
    
    // Create Post
    writeCaption: 'Write a caption...',
    addMedia: 'Add photo/video',
    cancel: 'Cancel',
    post: 'Post',
    remove: 'Remove',
    multiMediaHint: 'Select multiple photos/videos (max 10)',
    mediaLimit: 'Max 10 media',
    
    // User States
    guest: 'Guest',
    user: 'User',
    loading: 'Loading...',
    saving: 'Saving...',
    syncing: 'Syncing...',
    syncingData: 'Syncing data',
    
    // Feed & Posts
    noPosts: 'No posts yet',
    textPost: 'Text post',
    selectPost: 'Select a post to view details',
    
    // Post Details
    caption: 'Caption',
    noCaption: 'No caption',
    likes: 'likes',
    comments: 'Comments',
    noComments: 'No comments yet',
    writeComment: 'Write a comment...',
    loginToComment: 'Login to comment',
    
    // Profile
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
    interests: 'Interests',
    noInterestsSelected: 'No interests selected',
    selectInterests: 'Select Interests',
    save: 'Save',
    posts: 'Posts',
    postsComingSoon: 'Coming Soon',
    friendsComingSoon: 'Coming Soon',
    
    // Time formats
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    
    // Footer & Interaction
    scrollToNext: 'Scroll to see next post',
    scrollTooFast: 'Scrolling too fast',
    
    // Success Messages
    loginSuccess: 'Login successful!',
    signupSuccess: 'Registration successful!',
    logoutSuccess: 'Logout successful!',
    resetEmailSent: 'Password reset email sent!',
    postSuccess: 'Post created successfully!',
    profileSuccess: 'Profile updated successfully!',
    deletePostSuccess: 'Post deleted successfully!',
    hidePostSuccess: 'Post hidden successfully!',
    downloadMediaSuccess: 'Download completed!',
    friendRequestSent: 'Friend request sent!',
    friendRequestAccepted: 'Friend request accepted!',
    friendRequestRejected: 'Friend request rejected!',
    
    // Error Messages
    fillAllFields: 'Please fill in all fields!',
    passwordMismatch: 'Passwords do not match!',
    weakPassword: 'Password must be at least 6 characters!',
    enterEmail: 'Please enter your email!',
    emailNotFound: 'Email not found!',
    wrongPassword: 'Wrong password!',
    invalidEmail: 'Invalid email!',
    emailInUse: 'Email already in use!',
    loginCancelled: 'Login cancelled!',
    popupBlocked: 'Popup blocked! Please allow popups.',
    
    fileTooLarge: 'File too large! Maximum 10MB.',
    invalidFileType: 'Invalid file type! Only images/videos allowed.',
    tooManyFiles: 'Too many files! Maximum 10 media allowed.',
    missingCaption: 'Please enter a caption!',
    missingMedia: 'Please select a photo or video!',
    notAuthenticated: 'Please login first!',
    permissionDenied: 'Permission denied!',
    
    avatarTooLarge: 'Avatar too large! Maximum 5MB.',
    invalidAvatarType: 'Invalid file type! Only images allowed.',
    
    alreadyLikedPost: 'You already liked this post!',
    
    // Default errors
    loginFailed: 'Login failed!',
    signupFailed: 'Registration failed!',
    googleLoginFailed: 'Google login failed!',
    facebookLoginFailed: 'Facebook login failed!',
    postFailed: 'Failed to create post!',
    profileUpdateFailed: 'Failed to update profile!',
    likeFailed: 'Failed to like post!',
    commentFailed: 'Failed to add comment!',
    sendRequest: 'Failed to send friend request!',
    acceptRequest: 'Failed to accept request!',
    deletePostFailed: 'Failed to delete post!',
    hidePostFailed: 'Failed to hide post!',
    downloadMediaFailed: 'Download failed!',
    reportComingSoon: 'Report feature coming soon!',
    
    defaultError: 'An error occurred!'
  }
}

export function useLanguage() {
  const toggleLanguage = () => {
    const newLanguage = globalLanguage.value === 'vi' ? 'en' : 'vi'
    setLanguage(newLanguage)
  }

  const setLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      globalLanguage.value = lang
      saveLanguageToStorage(lang)
    }
  }

  const getText = (key) => {
    const currentTexts = translations[globalLanguage.value]
    const fallbackTexts = translations['en']
    
    return currentTexts[key] || fallbackTexts[key] || key
  }

  return {
    currentLanguage: globalLanguage,
    toggleLanguage,
    setLanguage,
    getText
  }
}