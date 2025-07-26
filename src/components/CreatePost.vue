<!--
Component CreatePost - Tạo bài đăng mới
Logic:
- Giao diện giống HomeMain.vue nhưng có thể chọn file và nhập caption
- Preview media được chọn trong media-area với object-fit để tự động fit
- Actions buttons giống HomeMain.vue (chỉ icon, không text)
- Sử dụng Firebase Storage để upload media và Firestore để lưu bài đăng
- Hỗ trợ đa ngôn ngữ cho UI text
- Bài đăng được lưu vào collection 'posts' để hiển thị cho mọi người
-->
<template>
  <div class="create-post">
    <div class="user-info">
      <div class="avatar"></div>
      <span class="name">{{ getUserDisplayName() }}</span>
    </div>
    <div class="timestamp">{{ getCurrentTime() }}</div>
    
    <div class="media-area" @click="triggerFileInput">
      <div v-if="!selectedFile && !previewUrl" class="upload-placeholder">
        <div class="plus-icon"></div>
        <span>{{ getText('addMedia') }}</span>
      </div>
      <div v-else-if="previewUrl" class="media-preview">
        <img v-if="isImage" :src="previewUrl" alt="Preview" class="preview-media">
        <video v-else-if="isVideo" :src="previewUrl" controls class="preview-media"></video>
        <button class="remove-media" @click.stop="removeMedia">×</button>
      </div>
      <input 
        ref="fileInput" 
        type="file" 
        accept="image/*,video/*" 
        @change="handleFileSelect"
        style="display: none"
      >
    </div>

    <div class="bottom-bar">
      <input 
        type="text" 
        v-model="caption" 
        :placeholder="getText('writeCaption')" 
        class="caption-input"
        maxlength="500"
      >
      <div class="actions">
        <button class="cancel-btn" @click="handleCancel" :disabled="isUploading"></button>
        <button class="post-btn" @click="handlePost" :disabled="!canPost || isUploading"></button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useFirestore } from '@/composables/useFirestore'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'CreatePost',
  setup() {
    const router = useRouter()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const { createPost, uploadMedia } = useFirestore()
    const { showError, showSuccess } = useErrorHandler()

    // Reactive data
    const caption = ref('')
    const selectedFile = ref(null)
    const previewUrl = ref('')
    const fileInput = ref(null)
    const isUploading = ref(false)

    // Computed
    const canPost = computed(() => 
      caption.value.trim().length > 0 && user.value
    )

    const isImage = computed(() => 
      selectedFile.value && selectedFile.value.type.startsWith('image/')
    )
    
    const isVideo = computed(() => 
      selectedFile.value && selectedFile.value.type.startsWith('video/')
    )

    // Get user display name
    const getUserDisplayName = () => {
      if (!user.value) return getText('guest')
      return user.value.displayName || user.value.email || getText('user')
    }

    // Get current time
    const getCurrentTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const year = now.getFullYear()
      return `${hours}:${minutes}, ${day}/${month}/${year}`
    }

    // Trigger file input
    const triggerFileInput = () => {
      if (fileInput.value) {
        fileInput.value.click()
      }
    }

    // Handle file selection
    const handleFileSelect = (event) => {
      const file = event.target.files[0]
      if (!file) return

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError({ message: 'FILE_TOO_LARGE' }, 'upload')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showError({ message: 'INVALID_FILE_TYPE' }, 'upload')
        return
      }

      selectedFile.value = file
      
      // Create preview URL
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
      }
      previewUrl.value = URL.createObjectURL(file)
    }

    // Remove selected media
    const removeMedia = () => {
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
      }
      selectedFile.value = null
      previewUrl.value = ''
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    // Handle cancel
    const handleCancel = () => {
      caption.value = ''
      removeMedia()
      router.push('/')
    }

    // Handle post creation
    const handlePost = async () => {
      if (!user.value) {
        showError({ message: 'NOT_AUTHENTICATED' }, 'post')
        return
      }

      if (!canPost.value) {
        showError({ message: 'MISSING_CAPTION' }, 'post')
        return
      }

      isUploading.value = true

      try {
        let mediaUrl = null
        let mediaType = null

        // Upload media if selected
        if (selectedFile.value) {
          const uploadResult = await uploadMedia(selectedFile.value, user.value.uid)
          mediaUrl = uploadResult.downloadURL
          mediaType = selectedFile.value.type.startsWith('image/') ? 'image' : 'video'
        }

        // Create post data
        const postData = {
          caption: caption.value.trim(),
          authorId: user.value.uid,
          authorName: getUserDisplayName(),
          authorEmail: user.value.email,
          mediaUrl,
          mediaType,
          createdAt: new Date(),
          likes: 0,
          comments: []
        }

        // Save to Firestore
        await createPost(postData)

        showSuccess('post')
        
        // Reset form và navigate về home
        caption.value = ''
        removeMedia()
        router.push('/')

      } catch (error) {
        console.error('Error creating post:', error)
        showError(error, 'post')
      } finally {
        isUploading.value = false
      }
    }

    return {
      caption,
      selectedFile,
      previewUrl,
      fileInput,
      isUploading,
      canPost,
      isImage,
      isVideo,
      getText,
      getUserDisplayName,
      getCurrentTime,
      triggerFileInput,
      handleFileSelect,
      removeMedia,
      handleCancel,
      handlePost
    }
  }
}
</script>

<style scoped>
.create-post {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
}

.user-info {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.avatar {
  width: 1.875rem;
  height: 1.875rem;
  background: var(--theme-color);
  border: 0.125rem solid var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
}

.name {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
}

.timestamp {
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  font-weight: 400;
}

.media-area {
  width: 80%;
  height: 18.75rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9375rem;
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.media-area:hover {
  transform: scale(1.02);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #000;
  font-size: 1rem;
  font-weight: 500;
}

.plus-icon {
  width: 3rem;
  height: 3rem;
  background: url('src/icons/plus.png') center/cover;
}

.media-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-media {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.9375rem;
}

.remove-media {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.remove-media:hover {
  background: rgba(0, 0, 0, 0.9);
}

.bottom-bar {
  position: absolute;
  bottom: 0.625rem;
  left: 0.625rem;
  right: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
}

.caption-input {
  flex: 1;
  height: 1.875rem;
  background: var(--theme-color);
  border: 0.125rem solid #000;
  border-radius: 0.9375rem;
  padding: 0 0.625rem;
  font-size: 0.75rem;
  color: #000;
  outline: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
}

.caption-input::placeholder {
  color: rgba(0, 0, 0, 0.6);
}

.actions {
  display: flex;
  gap: 0.625rem;
}

.cancel-btn, .post-btn {
  width: 1.875rem;
  height: 1.875rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.cancel-btn {
  background: url('src/icons/cancel.png') center/cover var(--theme-color);
}

.post-btn {
  background: url('src/icons/post.png') center/cover var(--theme-color);
}

.cancel-btn:hover:not(:disabled), .post-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 0.25rem 0.625rem rgba(0, 0, 0, 0.4);
  background-color: #2B2D42;
}

.cancel-btn:disabled, .post-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>