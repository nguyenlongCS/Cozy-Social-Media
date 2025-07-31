<!--
src/components/ProfileMain.vue
Component chính cho trang profile - Chỉnh sửa thông tin user
Logic:
- Load thông tin user hiện tại từ Firestore users collection
- Form chỉnh sửa UserName, Bio, Gender với validation
- Upload avatar mới với preview vào bucket avatar/
- Save thay đổi vào Firestore và trigger data sync tự động
- Hiển thị sync progress khi có thay đổi avatar/username
- Error handling cho cả profile update và sync operations
-->
<template>
  <div class="profile-main">
    <!-- Loading state -->
    <div v-if="isLoading" class="profile-container loading-state">
      <div class="profile-header">
        <div class="avatar-placeholder"></div>
        <div class="user-info">
          <h2 class="username">{{ getText('loading') }}...</h2>
          <p class="user-email">{{ getText('loading') }}...</p>
        </div>
      </div>
    </div>

    <!-- Profile form -->
    <div v-else-if="userProfile" class="profile-container">
      <div class="profile-header">
        <div class="avatar-section">
          <div 
            class="avatar-display"
            :style="{ backgroundImage: avatarPreview ? `url(${avatarPreview})` : (userProfile.Avatar ? `url(${userProfile.Avatar})` : '') }"
            @click="triggerAvatarInput"
          >
            <div v-if="!avatarPreview && !userProfile.Avatar" class="avatar-placeholder-text">
              {{ getText('clickToUpload') }}
            </div>
            <div class="avatar-overlay">
              <div class="camera-icon"></div>
            </div>
          </div>
          <input 
            ref="avatarInput" 
            type="file" 
            accept="image/*" 
            @change="handleAvatarSelect"
            style="display: none"
          >
          <button 
            v-if="avatarPreview || avatarFile" 
            class="remove-avatar-btn"
            @click="removeAvatar"
          >
            {{ getText('remove') }}
          </button>
        </div>

        <div class="user-info">
          <h2 class="username">{{ userProfile.UserName || getText('noName') }}</h2>
          <p class="user-email">{{ userProfile.Email }}</p>
          <p class="user-provider">{{ getText('signedInWith') }}: {{ getProviderText(userProfile.Provider) }}</p>
          <p class="join-date">{{ getText('joinedOn') }}: {{ formatDate(userProfile.Created) }}</p>
        </div>
      </div>

      <!-- Sync Status Display -->
      <div v-if="isSyncing" class="sync-status">
        <div class="sync-indicator">
          <div class="sync-spinner"></div>
          <span class="sync-text">{{ getText('syncingData') }}... {{ syncProgress }}%</span>
        </div>
        <div class="sync-progress-bar">
          <div class="sync-progress-fill" :style="{ width: `${syncProgress}%` }"></div>
        </div>
      </div>

      <div class="profile-form">
        <div class="form-group">
          <label class="form-label">{{ getText('userName') }}</label>
          <input 
            type="text"
            v-model="editForm.UserName"
            :placeholder="getText('enterUserName')"
            class="form-input"
            maxlength="50"
          >
        </div>

        <div class="form-group">
          <label class="form-label">{{ getText('bio') }}</label>
          <textarea 
            v-model="editForm.Bio"
            :placeholder="getText('enterBio')"
            class="form-textarea"
            maxlength="200"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">{{ getText('gender') }}</label>
          <select v-model="editForm.Gender" class="form-select">
            <option value="">{{ getText('selectGender') }}</option>
            <option value="male">{{ getText('male') }}</option>
            <option value="female">{{ getText('female') }}</option>
            <option value="other">{{ getText('other') }}</option>
          </select>
        </div>

        <div class="form-actions">
          <button 
            class="save-btn btn"
            @click="handleSave"
            :disabled="isSaving || !hasChanges || isSyncing"
          >
            {{ getSaveButtonText() }}
          </button>
          <button 
            class="cancel-btn btn"
            @click="handleCancel"
            :disabled="isSaving || isSyncing"
          >
            {{ getText('cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="profile-container error-state">
      <div class="error-message">
        <h3>{{ getText('errorLoadingProfile') }}</h3>
        <p>{{ error.message || getText('defaultError') }}</p>
        <button class="retry-btn btn" @click="loadUserProfile">
          {{ getText('retry') }}
        </button>
      </div>
    </div>

    <!-- Not logged in state -->
    <div v-else class="profile-container login-required">
      <div class="login-message">
        <h3>{{ getText('loginRequired') }}</h3>
        <p>{{ getText('loginToViewProfile') }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useFirestore } from '@/composables/useFirestore'
import { useDataSync } from '@/composables/useDataSync'

export default {
  name: 'ProfileMain',
  setup() {
    const router = useRouter()
    const { user } = useAuth()
    const { getUserById, updateUserProfile, isLoading, isSyncing } = useUsers()
    const { uploadAvatar } = useFirestore()
    const { getText } = useLanguage()
    const { showError, showSuccess } = useErrorHandler()
    const { syncProgress } = useDataSync()

    // Reactive data
    const userProfile = ref(null)
    const error = ref(null)
    const isSaving = ref(false)
    const avatarFile = ref(null)
    const avatarPreview = ref('')
    const avatarInput = ref(null)

    const editForm = ref({
      UserName: '',
      Bio: '',
      Gender: ''
    })

    const originalForm = ref({
      UserName: '',
      Bio: '',
      Gender: ''
    })

    // Computed properties
    const hasChanges = computed(() => {
      return (
        editForm.value.UserName !== originalForm.value.UserName ||
        editForm.value.Bio !== originalForm.value.Bio ||
        editForm.value.Gender !== originalForm.value.Gender ||
        avatarFile.value !== null
      )
    })

    // Methods
    const loadUserProfile = async () => {
      if (!user.value) {
        userProfile.value = null
        return
      }

      try {
        error.value = null
        const profile = await getUserById(user.value.uid)
        
        if (profile) {
          userProfile.value = profile
          editForm.value = {
            UserName: profile.UserName || '',
            Bio: profile.Bio || '',
            Gender: profile.Gender || ''
          }
          originalForm.value = { ...editForm.value }
        } else {
          userProfile.value = {
            id: user.value.uid,
            UserID: user.value.uid,
            UserName: user.value.displayName || 'NoName',
            Email: user.value.email,
            Provider: 'email',
            Created: new Date(),
            Avatar: user.value.photoURL,
            HasCustomAvatar: false,
            Bio: null,
            Gender: null
          }
          editForm.value = {
            UserName: userProfile.value.UserName,
            Bio: '',
            Gender: ''
          }
          originalForm.value = { ...editForm.value }
        }
      } catch (err) {
        console.error('Error loading user profile:', err)
        error.value = err
      }
    }

    const getProviderText = (provider) => {
      const providerMap = {
        'email': 'Email',
        'google': 'Google',
        'facebook': 'Facebook'
      }
      return providerMap[provider] || provider
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        date = timestamp
      } else {
        date = new Date(timestamp)
      }
      
      return date.toLocaleDateString()
    }

    const triggerAvatarInput = () => {
      if (avatarInput.value) {
        avatarInput.value.click()
      }
    }

    const handleAvatarSelect = (event) => {
      const file = event.target.files[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        showError({ message: 'AVATAR_TOO_LARGE' }, 'upload')
        return
      }

      if (!file.type.startsWith('image/')) {
        showError({ message: 'INVALID_AVATAR_TYPE' }, 'upload')
        return
      }

      avatarFile.value = file
      
      if (avatarPreview.value) {
        URL.revokeObjectURL(avatarPreview.value)
      }
      avatarPreview.value = URL.createObjectURL(file)
    }

    const removeAvatar = () => {
      if (avatarPreview.value) {
        URL.revokeObjectURL(avatarPreview.value)
      }
      avatarFile.value = null
      avatarPreview.value = ''
      if (avatarInput.value) {
        avatarInput.value.value = ''
      }
    }

    const getSaveButtonText = () => {
      if (isSaving.value) return getText('saving')
      if (isSyncing.value) return getText('syncing')
      return getText('saveChanges')
    }

    const handleSave = async () => {
      if (!user.value || !hasChanges.value) return

      isSaving.value = true

      try {
        const updateData = {
          UserName: editForm.value.UserName.trim() || 'NoName',
          Bio: editForm.value.Bio.trim() || null,
          Gender: editForm.value.Gender || null
        }

        if (avatarFile.value) {
          const uploadResult = await uploadAvatar(avatarFile.value, user.value.uid)
          updateData.Avatar = uploadResult.downloadURL
        }

        await updateUserProfile(user.value.uid, updateData)

        showSuccess('profile')
        await loadUserProfile()
        removeAvatar()

      } catch (error) {
        console.error('Error updating profile:', error)
        showError(error, 'profile')
      } finally {
        isSaving.value = false
      }
    }

    const handleCancel = () => {
      editForm.value = { ...originalForm.value }
      removeAvatar()
    }

    // Watchers
    watch(user, (newUser) => {
      if (newUser) {
        loadUserProfile()
      } else {
        userProfile.value = null
        error.value = null
      }
    }, { immediate: true })

    // Lifecycle
    onMounted(() => {
      loadUserProfile()
    })

    return {
      userProfile,
      editForm,
      error,
      isLoading,
      isSaving,
      isSyncing,
      syncProgress,
      hasChanges,
      avatarFile,
      avatarPreview,
      avatarInput,
      getText,
      getProviderText,
      formatDate,
      getSaveButtonText,
      triggerAvatarInput,
      handleAvatarSelect,
      removeAvatar,
      handleSave,
      handleCancel,
      loadUserProfile
    }
  }
}
</script>

<style scoped>
.profile-main {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.profile-container {
  width: 100%;
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.profile-header {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
  flex-shrink: 0;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.avatar-display {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
  background-size: cover;
  background-position: center;
}

.avatar-display:hover {
  transform: scale(1.05);
}

.avatar-placeholder-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.5rem;
  color: #000;
  text-align: center;
  font-weight: 500;
  line-height: 1.2;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.avatar-display:hover .avatar-overlay {
  opacity: 1;
}

.camera-icon {
  width: 1.25rem;
  height: 1.25rem;
  background: url('@/icons/camera.png') center/cover;
  filter: brightness(0) saturate(100%) invert(1);
}

.remove-avatar-btn {
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  color: var(--theme-color);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.remove-avatar-btn:hover {
  background: rgba(255, 235, 124, 0.2);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.username {
  font-size: 1rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0;
}

.user-email {
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.8);
  margin: 0;
}

.user-provider, .join-date {
  font-size: 0.625rem;
  color: rgba(255, 235, 124, 0.6);
  margin: 0;
}

.sync-status {
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.sync-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 235, 124, 0.3);
  border-top: 2px solid var(--theme-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.sync-text {
  font-size: 0.75rem;
  color: var(--theme-color);
  font-weight: 500;
}

.sync-progress-bar {
  width: 100%;
  height: 0.25rem;
  background: rgba(255, 235, 124, 0.2);
  border-radius: 0.125rem;
  overflow: hidden;
}

.sync-progress-fill {
  height: 100%;
  background: var(--theme-color);
  transition: width 0.3s ease;
  border-radius: 0.125rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.profile-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--theme-color);
}

.form-input, .form-textarea, .form-select {
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 0.375rem;
  padding: 0.375rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-input {
  height: 2rem;
}

.form-textarea {
  resize: none;
  height: 2.5rem;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0.25rem rgba(255, 235, 124, 0.3);
}

.form-input::placeholder, .form-textarea::placeholder {
  color: rgba(255, 235, 124, 0.6);
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.save-btn, .cancel-btn {
  height: 2rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.save-btn {
  width: 6rem;
}

.cancel-btn {
  width: 4.5rem;
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  color: var(--theme-color);
}

.save-btn:disabled, .cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
  transform: scale(1.05);
}

.loading-state, .error-state, .login-required {
  justify-content: center;
  align-items: center;
  text-align: center;
}

.avatar-placeholder {
  width: 5rem;
  height: 5rem;
  background: rgba(255, 235, 124, 0.3);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.error-message, .login-message {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.error-message h3, .login-message h3 {
  color: var(--theme-color);
  font-size: 1.1rem;
  margin: 0;
}

.error-message p, .login-message p {
  color: rgba(255, 235, 124, 0.8);
  font-size: 0.9rem;
  margin: 0;
}

.retry-btn {
  width: 6rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>