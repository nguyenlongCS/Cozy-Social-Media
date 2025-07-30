/*
src/composables/useErrorHandler.js - Updated với Profile Errors
Composable xử lý lỗi
Centralize error handling logic và provide consistent error messages
Added: Profile related error codes
*/
import { useLanguage } from './useLanguage'

export function useErrorHandler() {
  const { getText } = useLanguage()

  // Map Firebase error codes to message keys
  const getErrorMessageKey = (errorCode) => {
    const errorMap = {
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
      'auth/account-exists-with-different-credential': 'accountExistsWithDifferentCredential',
      'auth/auth-domain-config-required': 'authDomainConfigRequired',
      'auth/operation-not-allowed': 'operationNotAllowed',
      
      // Create Post errors
      'FILE_TOO_LARGE': 'fileTooLarge',
      'INVALID_FILE_TYPE': 'invalidFileType',
      'MISSING_CAPTION': 'missingCaption',
      'NOT_AUTHENTICATED': 'notAuthenticated',
      'MISSING_FILE_OR_USER': 'postFailed',
      'MISSING_POST_DATA': 'postFailed',
      'MISSING_REQUIRED_FIELDS': 'postFailed',
      
      // Profile errors
      'AVATAR_TOO_LARGE': 'avatarTooLarge',
      'INVALID_AVATAR_TYPE': 'invalidAvatarType',
      'NO_USER_PROVIDED': 'profileUpdateFailed',
      'NO_USER_ID_PROVIDED': 'profileUpdateFailed',
      'MISSING_USER_OR_PROFILE_DATA': 'profileUpdateFailed',
      
      // Comments and Likes errors
      'MISSING_POST_OR_USER_ID': 'likeFailed',
      'MISSING_COMMENT_DATA': 'commentFailed',
      'MISSING_POST_ID': 'loadCommentsFailed',
      'ALREADY_LIKED': 'alreadyLikedPost',
      'NOT_LIKED': 'likeFailed',
      
      // Firebase permission errors
      'permission-denied': 'notAuthenticated',
      'unauthenticated': 'notAuthenticated'
    }

    return errorMap[errorCode] || 'defaultError'
  }

  // Get context-specific error message
  const getContextErrorMessage = (messageKey, context) => {
    const contextMap = {
      signup: {
        'defaultError': 'signupFailed'
      },
      google: {
        'defaultError': 'googleLoginFailed'
      },
      facebook: {
        'defaultError': 'facebookLoginFailed'
      },
      reset: {
        'defaultError': 'resetEmailFailed'
      },
      logout: {
        'defaultError': 'logoutFailed'
      },
      post: {
        'defaultError': 'postFailed'
      },
      upload: {
        'defaultError': 'postFailed'
      },
      loadPosts: {
        'defaultError': 'loadPostsFailed'
      },
      like: {
        'defaultError': 'likeFailed'
      },
      comment: {
        'defaultError': 'commentFailed'
      },
      loadComments: {
        'defaultError': 'loadCommentsFailed'
      },
      profile: {
        'defaultError': 'profileUpdateFailed'
      }
    }

    if (contextMap[context] && contextMap[context][messageKey]) {
      return contextMap[context][messageKey]
    }

    if (messageKey === 'defaultError') {
      return 'loginFailed'
    }

    return messageKey
  }

  // Handle errors
  const handleError = (error, context = 'login') => {
    const errorCode = error.code || error.message || 'defaultError'
    const messageKey = getErrorMessageKey(errorCode)
    const finalMessageKey = getContextErrorMessage(messageKey, context)
    const message = getText(finalMessageKey)
    
    console.error(`${context} error:`, error)
    return message
  }

  // Show error alert
  const showError = (error, context = 'login') => {
    const message = handleError(error, context)
    alert(message)
  }

  // Show success message
  const showSuccess = (context = 'login') => {
    const successKeys = {
      login: 'loginSuccess',
      signup: 'signupSuccess',
      logout: 'logoutSuccess',
      reset: 'resetEmailSent',
      post: 'postSuccess',
      profile: 'profileSuccess'
    }
    
    const messageKey = successKeys[context] || 'loginSuccess'
    const message = getText(messageKey)
    alert(message)
  }

  return {
    handleError,
    showError,
    showSuccess,
    getErrorMessageKey
  }
}