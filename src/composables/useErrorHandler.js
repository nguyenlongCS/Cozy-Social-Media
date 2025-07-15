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
      'auth/operation-not-allowed': 'operationNotAllowed'
    }

    return errorMap[errorCode] || 'loginFailed'
  }

  // Handle authentication errors
  const handleAuthError = (error, context = 'login') => {
    let messageKey = getErrorMessageKey(error.code || error.message)
    
    // Context-specific error handling
    if (context === 'signup') {
      if (messageKey === 'loginFailed') {
        messageKey = 'signupFailed'
      }
    } else if (context === 'google') {
      if (messageKey === 'loginFailed') {
        messageKey = 'googleLoginFailed'
      }
    } else if (context === 'facebook') {
      if (messageKey === 'loginFailed') {
        messageKey = 'facebookLoginFailed'
      }
    } else if (context === 'reset') {
      if (messageKey === 'loginFailed') {
        messageKey = 'resetEmailFailed'
      }
    } else if (context === 'logout') {
      if (messageKey === 'loginFailed') {
        messageKey = 'logoutFailed'
      }
    }

    const message = getText(messageKey)
    console.error(`${context} error:`, error)
    return message
  }

  // Show error alert
  const showError = (error, context = 'login') => {
    const message = handleAuthError(error, context)
    alert(message)
  }

  // Show success message
  const showSuccess = (context = 'login') => {
    const successKeys = {
      login: 'loginSuccess',
      signup: 'signupSuccess',
      logout: 'logoutSuccess',
      reset: 'resetEmailSent'
    }
    
    const messageKey = successKeys[context] || 'loginSuccess'
    const message = getText(messageKey)
    alert(message)
  }

  return {
    handleAuthError,
    showError,
    showSuccess,
    getErrorMessageKey
  }
}