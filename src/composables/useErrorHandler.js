/*
src/composables/useErrorHandler.js - Updated with Friends Feature Error Support
Composable xử lý lỗi với hỗ trợ friends actions
Centralize error handling logic và provide consistent error messages
Added: Friends error codes và success messages
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
      'MISSING_MEDIA': 'missingMedia',
      'NOT_AUTHENTICATED': 'notAuthenticated',
      'MISSING_FILE_OR_USER': 'postFailed',
      'MISSING_POST_DATA': 'postFailed',
      'MISSING_REQUIRED_FIELDS': 'postFailed',
      
      // Post Actions errors
      'INVALID_POST': 'invalidPost',
      'PERMISSION_DENIED': 'permissionDenied',
      'NO_MEDIA_TO_DOWNLOAD': 'noMediaToDownload',
      
      // Profile errors
      'AVATAR_TOO_LARGE': 'avatarTooLarge',
      'INVALID_AVATAR_TYPE': 'invalidAvatarType',
      'NO_USER_PROVIDED': 'profileUpdateFailed',
      'NO_USER_ID_PROVIDED': 'profileUpdateFailed',
      'MISSING_USER_OR_PROFILE_DATA': 'profileUpdateFailed',
      'USER_NOT_FOUND': 'profileUpdateFailed',
      
      // Data Sync errors
      'MISSING_USER_OR_DATA': 'syncFailed',
      'NO_DATA_TO_SYNC': 'syncSuccess',
      'NO_DOCUMENTS_TO_SYNC': 'syncSuccess',
      'SYNC_COMPLETED': 'syncSuccess',
      
      // Comments and Likes errors
      'MISSING_POST_OR_USER_ID': 'likeFailed',
      'MISSING_COMMENT_DATA': 'commentFailed',
      'MISSING_POST_ID': 'loadCommentsFailed',
      'ALREADY_LIKED': 'alreadyLikedPost',
      'NOT_LIKED': 'likeFailed',
      
      // Friends errors
      'INVALID_FRIEND_REQUEST': 'sendRequest',
      'FRIENDSHIP_ALREADY_EXISTS': 'sendRequest',
      'INVALID_REQUEST_ID': 'acceptRequest',
      'INVALID_FRIENDSHIP_ID': 'unfriend',
      
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
      },
      sync: {
        'defaultError': 'syncFailed',
        'syncSuccess': 'syncSuccess'
      },
      // Post actions contexts
      deletePost: {
        'defaultError': 'deletePostFailed'
      },
      hidePost: {
        'defaultError': 'hidePostFailed'
      },
      download: {
        'defaultError': 'downloadMediaFailed'
      },
      report: {
        'defaultError': 'reportComingSoon'
      },
      share: {
        'defaultError': 'shareComingSoon'
      },
      // Friends contexts
      loadFriends: {
        'defaultError': 'loadFriends'
      },
      loadSuggestions: {
        'defaultError': 'loadSuggestions'
      },
      loadRequests: {
        'defaultError': 'loadRequests'
      },
      sendRequest: {
        'defaultError': 'sendRequest'
      },
      acceptRequest: {
        'defaultError': 'acceptRequest'
      },
      rejectRequest: {
        'defaultError': 'rejectRequest'
      },
      unfriend: {
        'defaultError': 'unfriend'
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
      profile: 'profileSuccess',
      sync: 'syncSuccess',
      // Post actions success contexts
      deletePost: 'deletePostSuccess',
      hidePost: 'hidePostSuccess',
      download: 'downloadMediaSuccess',
      // Friends success contexts
      friendRequestSent: 'friendRequestSent',
      friendRequestAccepted: 'friendRequestAccepted',
      friendRequestRejected: 'friendRequestRejected',
      unfriend: 'unfriend'
    }
    
    const messageKey = successKeys[context] || 'loginSuccess'
    const message = getText(messageKey)
    alert(message)
  }

  // Show sync status message (success hoặc info)
  const showSyncStatus = (result, context = 'sync') => {
    if (result && result.success) {
      if (result.message === 'NO_DATA_TO_SYNC' || result.message === 'NO_DOCUMENTS_TO_SYNC') {
        // Không hiển thị message cho trường hợp không có gì để sync
        console.log('No sync needed:', result.message)
        return
      }
      
      if (result.message === 'SYNC_COMPLETED') {
        showSuccess(context)
        return
      }
    }
    
    // Default success message
    showSuccess(context)
  }

  return {
    handleError,
    showError,
    showSuccess,
    showSyncStatus,
    getErrorMessageKey
  }
}