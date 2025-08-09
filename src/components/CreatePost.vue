<!--
src/components/CreatePost.vue - Refactored
Component tạo bài đăng với multi-media support
Logic: Upload media files, preview carousel, auto-resize textarea, submit post
-->
<template>
  <div class="create-post">
    <div class="user-info">
      <div 
        class="avatar"
        :style="{ backgroundImage: userAvatar ? `url(${userAvatar})` : '' }"
      ></div>
      <span class="name">{{ getCurrentUserDisplayName() }}</span>
    </div>
    <div class="timestamp">{{ getCurrentTime() }}</div>
    
    <div class="media-area">
      <!-- Empty state -->
      <div v-if="selectedFiles.length === 0" class="upload-placeholder" @click="triggerFileInput">
        <div class="plus-icon"></div>
        <span>{{ getText('addMedia') }}</span>
        <div class="upload-hint">{{ getText('multiMediaHint') }}</div>
      </div>
      
      <!-- Multi-media preview -->
      <div v-else class="media-carousel">
        <div class="media-container">
          <div class="media-wrapper">
            <img 
              v-if="currentMedia.type.startsWith('image/')" 
              :src="currentMedia.url" 
              alt="Preview" 
              class="preview-media"
            >
            <video 
              v-else-if="currentMedia.type.startsWith('video/')" 
              :src="currentMedia.url" 
              class="preview-media"
              controls
              autoplay
              muted
              loop
              playsinline
              @click="toggleVideoPlayPause"
              @error="handleVideoError"
            />
          </div>
          
          <!-- Media controls -->
          <div class="media-controls">
            <button 
              class="nav-btn prev-btn" 
              @click="previousMedia"
              v-if="selectedFiles.length > 1"
              :disabled="currentIndex === 0"
            >
              ‹
            </button>
            <button 
              class="nav-btn next-btn" 
              @click="nextMedia"
              v-if="selectedFiles.length > 1"
              :disabled="currentIndex === selectedFiles.length - 1"
            >
              ›
            </button>
            <button 
              class="remove-media" 
              @click="removeCurrentMedia"
            >
              ×
            </button>
            <button 
              class="add-more-btn" 
              @click="triggerFileInput"
              :disabled="selectedFiles.length >= 10"
            >
              +
            </button>
          </div>
        </div>
        
        <!-- Dots indicator -->
        <div v-if="selectedFiles.length > 1" class="media-dots">
          <button
            v-for="(file, index) in selectedFiles"
            :key="index"
            class="dot"
            :class="{ active: index === currentIndex }"
            @click="currentIndex = index"
          >
          </button>
        </div>
        
        <!-- Media counter -->
        <div class="media-counter">
          {{ currentIndex + 1 }}/{{ selectedFiles.length }}
          <span v-if="selectedFiles.length >= 10" class="limit-warning">{{ getText('mediaLimit') }}</span>
        </div>
      </div>
      
      <input 
        ref="fileInput" 
        type="file" 
        accept="image/*,video/*" 
        multiple
        @change="handleFileSelect"
        style="display: none"
      >
    </div>

    <!-- Media thumbnails -->
    <div v-if="selectedFiles.length > 1" class="media-thumbnails">
      <div 
        v-for="(file, index) in selectedFiles" 
        :key="index"
        class="thumbnail"
        :class="{ active: index === currentIndex }"
        @click="currentIndex = index"
      >
        <img 
          v-if="file.type.startsWith('image/')" 
          :src="file.url" 
          alt="Thumbnail"
        >
        <div v-else class="video-thumbnail">
          <div class="play-icon">▶</div>
        </div>
        <button class="remove-thumbnail" @click.stop="removeMedia(index)">×</button>
      </div>
    </div>

    <div class="bottom-bar">
      <textarea 
        v-model="caption" 
        :placeholder="getText('writeCaption')" 
        class="caption-input"
        rows="1"
        ref="captionTextarea"
        @input="adjustTextareaHeight"
      ></textarea>
      <div class="actions">
        <button class="cancel-btn" @click="handleCancel" :disabled="isUploading"></button>
        <button class="post-btn" @click="handlePost" :disabled="!canPost || isUploading">
          <div v-if="isUploading" class="upload-progress">
            {{ uploadProgress }}%
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'
import { useFirestore } from '@/composables/useFirestore'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'CreatePost',
  setup() {
    const router = useRouter()
    const { getText, currentLanguage } = useLanguage()
    const { user } = useAuth()
    const { getUserById } = useUsers()
    const { createPost, uploadMedia } = useFirestore()
    const { showError, showSuccess } = useErrorHandler()

    // Reactive state
    const caption = ref('')
    const selectedFiles = ref([])
    const currentIndex = ref(0)
    const fileInput = ref(null)
    const captionTextarea = ref(null)
    const isUploading = ref(false)
    const uploadProgress = ref(0)
    const userAvatar = ref('')

    // Constants
    const MAX_FILES = 10
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

    // Computed properties
    const canPost = computed(() => {
      return caption.value.trim().length > 0 && user.value && selectedFiles.value.length > 0
    })

    const currentMedia = computed(() => {
      return selectedFiles.value[currentIndex.value] || {}
    })

    // User display methods
    const getCurrentUserDisplayName = () => {
      if (!user.value) return getText('guest')
      const meText = currentLanguage.value === 'vi' ? 'Tôi' : 'Me'
      return meText
    }

    const getCurrentTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const year = now.getFullYear()
      return `${hours}:${minutes}, ${day}/${month}/${year}`
    }

    // Load user avatar
    const loadUserAvatar = async () => {
      if (!user.value) {
        userAvatar.value = ''
        return
      }

      try {
        const userProfile = await getUserById(user.value.uid)
        userAvatar.value = userProfile?.Avatar || user.value.photoURL || ''
      } catch (error) {
        userAvatar.value = user.value.photoURL || ''
      }
    }

    // Textarea auto-resize
    const adjustTextareaHeight = async () => {
      await nextTick()
      if (captionTextarea.value) {
        captionTextarea.value.style.height = 'auto'
        const scrollHeight = captionTextarea.value.scrollHeight
        const maxHeight = 150
        const newHeight = Math.min(scrollHeight, maxHeight)
        captionTextarea.value.style.height = newHeight + 'px'
        
        if (scrollHeight > maxHeight) {
          captionTextarea.value.style.overflowY = 'auto'
        } else {
          captionTextarea.value.style.overflowY = 'hidden'
        }
      }
    }

    // File handling
    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    const validateFile = (file) => {
      if (file.size > MAX_FILE_SIZE) {
        showError({ message: 'FILE_TOO_LARGE' }, 'upload')
        return false
      }

      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showError({ message: 'INVALID_FILE_TYPE' }, 'upload')
        return false
      }

      return true
    }

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files)
      if (!files.length) return

      if (selectedFiles.value.length + files.length > MAX_FILES) {
        showError({ message: 'TOO_MANY_FILES' }, 'upload')
        return
      }

      const validFiles = files.filter(validateFile)
      
      validFiles.forEach(file => {
        const fileObj = {
          file,
          url: URL.createObjectURL(file),
          type: file.type,
          name: file.name,
          size: file.size
        }
        selectedFiles.value.push(fileObj)
      })

      if (fileInput.value) fileInput.value.value = ''
    }

    // Media navigation
    const removeMedia = (index) => {
      if (selectedFiles.value[index]) {
        URL.revokeObjectURL(selectedFiles.value[index].url)
        selectedFiles.value.splice(index, 1)
        
        if (currentIndex.value >= selectedFiles.value.length) {
          currentIndex.value = Math.max(0, selectedFiles.value.length - 1)
        }
      }
    }

    const removeCurrentMedia = () => {
      removeMedia(currentIndex.value)
    }

    const removeAllMedia = () => {
      selectedFiles.value.forEach(file => {
        URL.revokeObjectURL(file.url)
      })
      selectedFiles.value = []
      currentIndex.value = 0
    }

    const previousMedia = () => {
      if (currentIndex.value > 0) currentIndex.value--
    }

    const nextMedia = () => {
      if (currentIndex.value < selectedFiles.value.length - 1) currentIndex.value++
    }

    // Video controls
    const toggleVideoPlayPause = (event) => {
      const video = event.target
      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }
    }

    const handleVideoError = (event) => {
      const video = event.target
      video.setAttribute('controls', 'true')
      video.removeAttribute('autoplay')
    }

    // Upload multiple media
    const uploadMultipleMedia = async () => {
      const uploadPromises = selectedFiles.value.map(async (fileObj, index) => {
        try {
          const result = await uploadMedia(fileObj.file, user.value.uid)
          uploadProgress.value = Math.round(((index + 1) / selectedFiles.value.length) * 100)
          return {
            url: result.downloadURL,
            type: fileObj.type.startsWith('image/') ? 'image' : 'video',
            size: fileObj.size,
            name: fileObj.name
          }
        } catch (error) {
          return null
        }
      })

      const results = await Promise.all(uploadPromises)
      return results.filter(result => result !== null)
    }

    // Action handlers
    const handleCancel = () => {
      caption.value = ''
      removeAllMedia()
      router.push('/')
    }

    const handlePost = async () => {
      if (!user.value) {
        showError({ message: 'NOT_AUTHENTICATED' }, 'post')
        return
      }

      if (!canPost.value) {
        if (!caption.value.trim()) {
          showError({ message: 'MISSING_CAPTION' }, 'post')
        } else if (selectedFiles.value.length === 0) {
          showError({ message: 'MISSING_MEDIA' }, 'post')
        }
        return
      }

      isUploading.value = true
      uploadProgress.value = 0

      try {
        const uploadedMedia = await uploadMultipleMedia()
        
        if (uploadedMedia.length === 0) {
          throw new Error('No media files uploaded successfully')
        }

        const postData = {
          caption: caption.value.trim(),
          authorId: user.value.uid,
          authorName: getCurrentUserDisplayName(),
          authorEmail: user.value.email,
          mediaUrl: uploadedMedia[0].url,
          mediaType: uploadedMedia[0].type,
          mediaItems: uploadedMedia,
          mediaCount: uploadedMedia.length,
          createdAt: new Date(),
          likes: 0,
          comments: []
        }

        await createPost(postData)
        showSuccess('post')
        
        caption.value = ''
        removeAllMedia()
        router.push('/')

      } catch (error) {
        showError(error, 'post')
      } finally {
        isUploading.value = false
        uploadProgress.value = 0
      }
    }

    // Watchers
    watch(user, (newUser) => {
      if (newUser) {
        loadUserAvatar()
      } else {
        userAvatar.value = ''
      }
    }, { immediate: true })

    watch(caption, adjustTextareaHeight)

    watch(() => selectedFiles.value.length, (newLength) => {
      if (currentIndex.value >= newLength) {
        currentIndex.value = Math.max(0, newLength - 1)
      }
    })

    // Lifecycle
    onMounted(() => {
      if (user.value) loadUserAvatar()
      nextTick(adjustTextareaHeight)
    })

    return {
      caption,
      selectedFiles,
      currentIndex,
      fileInput,
      captionTextarea,
      isUploading,
      uploadProgress,
      userAvatar,
      canPost,
      currentMedia,
      MAX_FILES,
      getText,
      getCurrentUserDisplayName,
      getCurrentTime,
      adjustTextareaHeight,
      triggerFileInput,
      handleFileSelect,
      removeMedia,
      removeCurrentMedia,
      previousMedia,
      nextMedia,
      toggleVideoPlayPause,
      handleVideoError,
      handleCancel,
      handlePost
    }
  }
}
</script>

/* CreatePost.vue styles - Updated Colors */
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
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  background-size: cover;
  background-position: center;
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
  height: 15rem;
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
  text-align: center;
}

.plus-icon {
  width: 3rem;
  height: 3rem;
  background: url('@/icons/plus.png') center/cover;
}

.upload-hint {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}

/* Media Carousel */
.media-carousel {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.media-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.media-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-media {
  max-width: 95%;
  max-height: 95%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.5rem;
}

/* Video autoplay styles */
video.preview-media {
  cursor: pointer;
}

video.preview-media:hover {
  opacity: 0.95;
}

/* Webkit browsers (Chrome, Safari) */
video.preview-media::-webkit-media-controls {
  display: none !important;
}

video.preview-media::-webkit-media-controls-panel {
  display: none !important;
}

video.preview-media::-webkit-media-controls-play-button {
  display: none !important;
}

video.preview-media::-webkit-media-controls-start-playback-button {
  display: none !important;
}

video.preview-media::-webkit-media-controls-timeline {
  display: none !important;
}

video.preview-media::-webkit-media-controls-volume-slider {
  display: none !important;
}

/* Show all controls on hover */
video.preview-media:hover::-webkit-media-controls {
  display: flex !important;
}

video.preview-media:hover::-webkit-media-controls-panel {
  display: flex !important;
}

video.preview-media:hover::-webkit-media-controls-play-button {
  display: flex !important;
}

video.preview-media:hover::-webkit-media-controls-timeline {
  display: flex !important;
}

video.preview-media:hover::-webkit-media-controls-volume-slider {
  display: flex !important;
}

/* Firefox */
video.preview-media::-moz-media-controls {
  opacity: 0 !important;
  transition: opacity 0.3s ease;
}

video.preview-media:hover::-moz-media-controls {
  opacity: 1 !important;
}

@media (max-width: 768px) {
  video.preview-media::-webkit-media-controls {
    display: block !important;
  }
  
  video.preview-media::-webkit-media-controls-panel {
    display: flex !important;
  }
  
  video.preview-media::-moz-media-controls {
    opacity: 1;
  }
}

.media-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  background: rgba(0, 0, 0, 0.7);
  color: var(--theme-color);
  border: none;
  border-radius: 50%;
  font-size: 1.25rem;
  font-weight: bold;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s ease;
}

.prev-btn {
  left: 0.5rem;
}

.next-btn {
  right: 0.5rem;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.9);
  transform: translateY(-50%) scale(1.1);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-media {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s ease;
}

.add-more-btn {
  position: absolute;
  top: 0.5rem;
  right: 2.5rem;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--theme-color);
  color: #000;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s ease;
}

.remove-media:hover, .add-more-btn:hover {
  transform: scale(1.1);
}

.add-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.media-dots {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.25rem;
  pointer-events: all;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--theme-color-20);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot.active {
  background: var(--theme-color);
  transform: scale(1.2);
}

.media-counter {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: var(--theme-color);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.625rem;
  font-weight: 500;
  pointer-events: all;
}

.limit-warning {
  color: #2B2D42;
  margin-left: 0.25rem;
}

.media-thumbnails {
  width: 80%;
  margin-top: 0.5rem;
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  padding: 0.25rem;
}

.thumbnail {
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.thumbnail.active {
  border-color: var(--theme-color);
  transform: scale(1.05);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-thumbnail {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-icon {
  color: var(--theme-color);
  font-size: 1rem;
}

.remove-thumbnail {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1rem;
  height: 1rem;
  background: rgba(255, 0, 0, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 0.625rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.remove-thumbnail:hover {
  transform: scale(1.1);
}

.bottom-bar {
  position: absolute;
  bottom: 0.625rem;
  left: 0.625rem;
  right: 0.625rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.625rem;
}

.caption-input {
  flex: 1;
  min-height: 1.875rem;
  max-height: 9.375rem;
  background: var(--theme-color);
  border: 0.125rem solid #000;
  border-radius: 0.9375rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  color: #000;
  outline: none;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  resize: none;
  overflow-y: hidden;
  font-family: inherit;
  line-height: 1.2;
  transition: height 0.2s ease;
}

.caption-input::placeholder {
  color: var(--theme-color-20);
}

.caption-input:focus {
  box-shadow: 0 0 0.5rem var(--theme-color-20);
}

.actions {
  display: flex;
  gap: 0.625rem;
  align-self: flex-end;
}

.cancel-btn, .post-btn {
  width: 1.875rem;
  height: 1.875rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  flex-shrink: 0;
  position: relative;
}

.cancel-btn {
  background: url('@/icons/cancel.png') center/cover var(--theme-color);
}

.post-btn {
  background: url('@/icons/post.png') center/cover var(--theme-color);
}

.upload-progress {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.625rem;
  font-weight: bold;
  color: #000;
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