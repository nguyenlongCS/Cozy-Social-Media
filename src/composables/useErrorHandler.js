/*
src/composables/useErrorHandler.js - Refactored
Xử lý lỗi tập trung với message mapping
Logic: Map error codes thành message keys với context-specific handling
*/
import { useLanguage } from './useLanguage'

export function useErrorHandler() {
  const { getText } = useLanguage()

  // Error code to message key mapping
  const errorCodeMap = {
    // Auth errors
    'MISSING_FIELDS': 'fillAllFields',
    'PASSWORD_MISMATCH': 'passwordMismatch',
    'WEAK_PASSWORD': 'weakPassword',
    'MISSING_EMAIL': 'enterEmail',
    'auth/user-not-found': 'emailNotFound',
    'auth/wrong-password': 'wrongPassword',
    'auth/invalid-email': 'invalidEmail',
    'auth/email-already-in-use': 'emailInUse',
    'auth/weak-password': 'weakPassword',
    'auth/popup-closed-by-user': 'loginCancelled',
    'auth/popup-blocked': 'popupBlocked',
    
    // Post errors
    'FILE_TOO_LARGE': 'fileTooLarge',
    'INVALID_FILE_TYPE': 'invalidFileType',
    'MISSING_CAPTION': 'missingCaption',
    'MISSING_MEDIA': 'missingMedia',
    'NOT_AUTHENTICATED': 'notAuthenticated',
    'TOO_MANY_FILES': 'tooManyFiles',
    
    // Profile errors
    'AVATAR_TOO_LARGE': 'avatarTooLarge',
    'INVALID_AVATAR_TYPE': 'invalidAvatarType',
    
    // Interaction errors
    'ALREADY_LIKED': 'alreadyLikedPost',
    'PERMISSION_DENIED': 'permissionDenied',
    
    // Friends errors
    'INVALID_FRIEND_REQUEST': 'sendRequest',
    'FRIENDSHIP_ALREADY_EXISTS': 'sendRequest',
    
    // Messages errors
    'MISSING_MESSAGE_DATA': 'messageFailed',
    'CANNOT_MESSAGE_YOURSELF': 'messageFailed',
    'USER_NOT_FOUND': 'messageFailed',
    'NO_USER_PROVIDED': 'messageFailed',
    'INVALID_REQUEST_ID': 'messageFailed'
  }

  // Context-specific default errors
  const contextDefaults = {
    login: 'loginFailed',
    signup: 'signupFailed',
    google: 'googleLoginFailed',
    facebook: 'facebookLoginFailed',
    reset: 'resetEmailFailed',
    logout: 'logoutFailed',
    post: 'postFailed',
    upload: 'postFailed',
    profile: 'profileUpdateFailed',
    like: 'likeFailed',
    comment: 'commentFailed',
    sendRequest: 'sendRequest',
    acceptRequest: 'acceptRequest',
    unfriend: 'unfriend',
    message: 'messageFailed',
    loadMessages: 'loadMessagesFailed',
    loadConversations: 'loadConversationsFailed',
    search: 'searchFailed'
  }

  // Success message keys
  const successKeys = {
    login: 'loginSuccess',
    signup: 'signupSuccess',
    logout: 'logoutSuccess',
    reset: 'resetEmailSent',
    post: 'postSuccess',
    profile: 'profileSuccess',
    deletePost: 'deletePostSuccess',
    hidePost: 'hidePostSuccess',
    downloadMedia: 'downloadMediaSuccess',
    friendRequestSent: 'friendRequestSent',
    friendRequestAccepted: 'friendRequestAccepted',
    friendRequestRejected: 'friendRequestRejected',
    unfriend: 'unfriend',
    message: 'messageSuccess'
  }

  // Handle error
  const handleError = (error, context = 'login') => {
    const errorCode = error.code || error.message || 'defaultError'
    const messageKey = errorCodeMap[errorCode] || contextDefaults[context] || 'defaultError'
    return getText(messageKey)
  }

  // Show error alert
  const showError = (error, context = 'login') => {
    const message = handleError(error, context)
    alert(message)
  }

  // Show success alert
  const showSuccess = (context = 'login') => {
    const messageKey = successKeys[context] || 'loginSuccess'
    const message = getText(messageKey)
    alert(message)
  }

  return {
    handleError,
    showError,
    showSuccess
  }
}