/*
Composable xử lý lỗi
Centralize error handling logic và provide consistent error messages
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
      'MISSING_REQUIRED_FIELDS': 'postFailed'
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
      post: 'postSuccess'
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