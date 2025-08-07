/*
src/composables/useErrorHandler.js - Updated with Messages Error Handling
Centralized error handling với consistent messaging
Logic: Map error codes to message keys với context-specific handling
Added: Messages-related error contexts và mapping
*/
import { useLanguage } from './useLanguage'

export function useErrorHandler() {
  const { getText } = useLanguage()

  // Error code mapping
  const errorCodeMap = {
    // Authentication errors
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

  // Context-specific error handling
  const contextErrorMap = {
    signup: { 'defaultError': 'signupFailed' },
    signup: { 'defaultError': 'signupFailed' },
    google: { 'defaultError': 'googleLoginFailed' },
    facebook: { 'defaultError': 'facebookLoginFailed' },
    reset: { 'defaultError': 'resetEmailFailed' },
    logout: { 'defaultError': 'logoutFailed' },
    post: { 'defaultError': 'postFailed' },
    upload: { 'defaultError': 'postFailed' },
    profile: { 'defaultError': 'profileUpdateFailed' },
    like: { 'defaultError': 'likeFailed' },
    comment: { 'defaultError': 'commentFailed' },
    sendRequest: { 'defaultError': 'sendRequest' },
    acceptRequest: { 'defaultError': 'acceptRequest' },
    unfriend: { 'defaultError': 'unfriend' },
    // Messages contexts
    message: { 'defaultError': 'messageFailed' },
    loadMessages: { 'defaultError': 'loadMessagesFailed' },
    loadConversations: { 'defaultError': 'loadConversationsFailed' },
    search: { 'defaultError': 'searchFailed' }
  }

  // Success message mapping
  const successKeyMap = {
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
    // Messages success
    message: 'messageSuccess'
  }

  const handleError = (error, context = 'login') => {
    const errorCode = error.code || error.message || 'defaultError'
    const messageKey = errorCodeMap[errorCode] || 'defaultError'
    
    // Apply context-specific mapping
    const contextMap = contextErrorMap[context]
    const finalMessageKey = (contextMap && contextMap[messageKey]) || messageKey
    
    return getText(finalMessageKey)
  }

  const showError = (error, context = 'login') => {
    const message = handleError(error, context)
    alert(message)
  }

  const showSuccess = (context = 'login') => {
    const messageKey = successKeyMap[context] || 'loginSuccess'
    const message = getText(messageKey)
    alert(message)
  }

  return {
    handleError,
    showError,
    showSuccess
  }
}