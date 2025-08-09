<!--
src/components/HomeMain.vue - Refactored
Component Feed chính với options menu cho bài viết
Logic: Hiển thị posts với multi-media carousel, like/unlike, wheel scrolling, post actions
-->
<template>
  <div class="feed">
    <!-- Loading state -->
    <div v-if="isLoading" class="content-container">
      <div class="user-info">
        <div class="avatar"></div>
        <span class="name">{{ getText('loading') }}</span>
      </div>
      <div class="timestamp">--:--</div>
      <div class="loading-text">{{ getText('loading') }}</div>
      <div class="bottom-bar">
        <span class="caption">{{ getText('loading') }}</span>
        <div class="actions">
          <button class="like"></button>
          <button class="options-menu"></button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="posts.length === 0" class="content-container">
      <div class="user-info">
        <div class="avatar"></div>
        <span class="name">{{ getText('noPosts') }}</span>
      </div>
      <div class="timestamp">--:--</div>
      <div class="empty-text">{{ getText('noPosts') }}</div>
      <div class="bottom-bar">
        <span class="caption">{{ getText('noPosts') }}</span>
        <div class="actions">
          <button class="like"></button>
          <button class="options-menu"></button>
        </div>
      </div>
    </div>

    <!-- Current post -->
    <div v-else class="content-container" @wheel="handleWheel">
      <div class="user-info">
        <div class="avatar" :style="{ backgroundImage: currentPost.Avatar ? `url(${currentPost.Avatar})` : '' }"></div>
        <span class="name">{{ getDisplayName(currentPost) }}</span>
      </div>
      <div class="timestamp">{{ formatTimestamp(currentPost.Created) }}</div>
      
      <!-- Multi-media carousel -->
      <div v-if="hasMultipleMedia" class="media-carousel">
        <div class="media-container">
          <img v-if="currentMedia.type === 'image'" 
               :src="currentMedia.url" 
               :alt="currentPost.Caption"
               class="post-media">
          <video v-else-if="currentMedia.type === 'video'" 
                 :src="currentMedia.url" 
                 class="post-media"
                 controls
                 autoplay
                 muted
                 loop
                 playsinline
                 @click="toggleVideoPlayPause"
                 @error="handleVideoError">
          </video>
          
          <!-- Navigation controls -->
          <div class="media-controls" v-if="currentPost.mediaCount > 1">
            <button 
              class="nav-btn prev-btn" 
              @click="previousMedia"
              :disabled="currentMediaIndex === 0"
            >
              ‹
            </button>
            <button 
              class="nav-btn next-btn" 
              @click="nextMedia"
              :disabled="currentMediaIndex === currentPost.mediaCount - 1"
            >
              ›
            </button>
          </div>
        </div>
        
        <!-- Media dots indicator -->
        <div v-if="currentPost.mediaCount > 1" class="media-dots">
          <button
            v-for="(item, index) in currentPost.mediaItems"
            :key="index"
            class="dot"
            :class="{ active: index === currentMediaIndex }"
            @click="currentMediaIndex = index"
          >
          </button>
        </div>
        
        <!-- Media counter -->
        <div v-if="currentPost.mediaCount > 1" class="media-counter">
          {{ currentMediaIndex + 1 }}/{{ currentPost.mediaCount }}
        </div>
      </div>
      
      <!-- Single media -->
      <div v-else-if="currentPost.MediaURL" class="single-media">
        <img v-if="currentPost.MediaType === 'image'" 
             :src="currentPost.MediaURL" 
             :alt="currentPost.Caption"
             class="post-media">
        <video v-else-if="currentPost.MediaType === 'video'" 
               :src="currentPost.MediaURL" 
               class="post-media"
               controls
               autoplay
               muted
               loop
               playsinline
               @click="toggleVideoPlayPause"
               @error="handleVideoError">
        </video>
      </div>
      
      <!-- No media -->
      <div v-else class="no-media">
        {{ getText('textPost') }}
      </div>
      
      <div class="bottom-bar">
        <span class="caption">{{ currentPost.Caption }}</span>
        <div class="actions">
          <button 
            class="like" 
            @click="handleLike"
            :disabled="isLiking"
            :class="{ liked: isLikedByUser }"
          >
            <span class="like-count">{{ currentPost.likes || 0 }}</span>
          </button>
          
          <!-- Options Menu Button -->
          <div class="options-container">
            <button 
              class="options-menu"
              @click="toggleOptionsMenu"
              :disabled="isActionsLoading"
            ></button>
            
            <!-- Options Dropdown Menu -->
            <div v-if="showOptionsMenu" class="options-dropdown">
              <!-- Owner-only actions -->
              <template v-if="isPostOwner">
                <button 
                  class="option-item delete-option"
                  @click="handleDeletePost"
                  :disabled="isActionsLoading"
                >
                  <div class="option-icon delete-icon"></div>
                  <span>{{ getText('deletePost') }}</span>
                </button>
                <button 
                  class="option-item hide-option"
                  @click="handleHidePost"
                  :disabled="isActionsLoading"
                >
                  <div class="option-icon hide-icon"></div>
                  <span>{{ getText('hidePost') }}</span>
                </button>
              </template>
              
              <!-- Common actions -->
              <button 
                class="option-item download-option"
                @click="handleDownloadMedia"
                :disabled="isActionsLoading || !hasMedia"
              >
                <div class="option-icon download-icon"></div>
                <span>{{ getText('downloadMedia') }}</span>
              </button>
              <button 
                class="option-item report-option"
                @click="handleReportPost"
                :disabled="isActionsLoading"
              >
                <div class="option-icon report-icon"></div>
                <span>{{ getText('reportPost') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useFirestore } from '@/composables/useFirestore'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useAuth } from '@/composables/useAuth'
import { usePostActions } from '@/composables/usePostActions'

export default {
  name: 'HomeMain',
  emits: ['scroll-warning', 'current-post-changed', 'post-deleted', 'post-hidden', 'post-stats-changed'],
  setup(props, { emit }) {
    const { getPosts, togglePostLike, getUserLikedPosts, isLoading } = useFirestore()
    const { getText, currentLanguage } = useLanguage()
    const { showError } = useErrorHandler()
    const { user } = useAuth()
    const { 
      deletePost, 
      hidePost, 
      downloadPostMedia, 
      reportPost,
      isLoading: isActionsLoading 
    } = usePostActions()
    
    // Reactive state
    const posts = ref([])
    const currentIndex = ref(0)
    const currentMediaIndex = ref(0)
    const lastScrollTime = ref(0)
    const scrollCooldown = 300
    const isLiking = ref(false)
    const userLikes = ref(new Set())
    const showOptionsMenu = ref(false)

    // Computed properties
    const currentPost = computed(() => posts.value[currentIndex.value] || {})
    const hasMultipleMedia = computed(() => currentPost.value.mediaItems?.length > 0)
    const currentMedia = computed(() => {
      return hasMultipleMedia.value ? currentPost.value.mediaItems[currentMediaIndex.value] || {} : {}
    })
    const isLikedByUser = computed(() => {
      return user.value && currentPost.value.PostID ? userLikes.value.has(currentPost.value.PostID) : false
    })
    const isPostOwner = computed(() => user.value && currentPost.value.UserID === user.value.uid)
    const hasMedia = computed(() => {
      return currentPost.value.MediaURL || (currentPost.value.mediaItems?.length > 0)
    })

    // Display name helper
    const getDisplayName = (post) => {
      if (!post.UserName) return getText('user')
      
      const userName = post.UserName
      if (user.value && post.UserID === user.value.uid) {
        const meText = currentLanguage.value === 'vi' ? 'tôi' : 'me'
        return `${userName} (${meText})`
      }
      return userName
    }

    // Media navigation
    const previousMedia = () => {
      if (currentMediaIndex.value > 0) currentMediaIndex.value--
    }

    const nextMedia = () => {
      if (currentMediaIndex.value < currentPost.value.mediaCount - 1) currentMediaIndex.value++
    }

    const resetMediaIndex = () => {
      currentMediaIndex.value = 0
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

    // Options menu
    const toggleOptionsMenu = () => {
      showOptionsMenu.value = !showOptionsMenu.value
    }

    const closeOptionsMenu = () => {
      showOptionsMenu.value = false
    }

    // Click outside handler
    const handleClickOutside = (event) => {
      const optionsContainer = event.target.closest('.options-container')
      if (!optionsContainer && showOptionsMenu.value) {
        closeOptionsMenu()
      }
    }

    // Post actions
    const handleDeletePost = async () => {
      if (!currentPost.value || !user.value) return
      
      const confirmed = confirm(getText('confirmDeletePost'))
      if (!confirmed) return

      try {
        await deletePost(currentPost.value, user.value.uid)
        posts.value.splice(currentIndex.value, 1)
        
        if (currentIndex.value >= posts.value.length) {
          currentIndex.value = Math.max(0, posts.value.length - 1)
        }
        
        emitPostStats()
        closeOptionsMenu()
        emit('post-deleted', currentPost.value.PostID)
        
        if (posts.value.length === 0) await loadPosts()
        
      } catch (error) {
        // Error handled in composable
      }
    }

    const handleHidePost = async () => {
      if (!currentPost.value || !user.value) return
      
      const confirmed = confirm(getText('confirmHidePost'))
      if (!confirmed) return

      try {
        await hidePost(currentPost.value, user.value.uid)
        posts.value.splice(currentIndex.value, 1)
        
        if (currentIndex.value >= posts.value.length) {
          currentIndex.value = Math.max(0, posts.value.length - 1)
        }
        
        emitPostStats()
        closeOptionsMenu()
        emit('post-hidden', currentPost.value.PostID)
        
        if (posts.value.length === 0) await loadPosts()
        
      } catch (error) {
        // Error handled in composable
      }
    }

    const handleDownloadMedia = async () => {
      if (!currentPost.value) return
      
      try {
        await downloadPostMedia(currentPost.value)
        closeOptionsMenu()
      } catch (error) {
        // Error handled in composable
      }
    }

    const handleReportPost = async () => {
      if (!currentPost.value) return
      
      try {
        await reportPost(currentPost.value)
        closeOptionsMenu()
      } catch (error) {
        // Error handled in composable
      }
    }

    // Load posts
    const loadPosts = async () => {
      try {
        const fetchedPosts = await getPosts(1000)
        posts.value = fetchedPosts.filter(post => !post.Hidden)
        
        emitPostStats()
        
        if (user.value) {
          const likedPostIds = await getUserLikedPosts(user.value.uid)
          userLikes.value = new Set(likedPostIds)
        }
      } catch (error) {
        showError(error, 'loadPosts')
      }
    }

    // Emit post stats
    const emitPostStats = () => {
      emit('post-stats-changed', {
        currentIndex: currentIndex.value,
        totalPosts: posts.value.length
      })
    }

    // Handle like
    const handleLike = async () => {
      if (!user.value) {
        showError({ message: 'NOT_AUTHENTICATED' }, 'like')
        return
      }

      if (!currentPost.value.PostID || isLiking.value) return

      isLiking.value = true

      try {
        const isCurrentlyLiked = isLikedByUser.value
        const result = await togglePostLike(currentPost.value.PostID, user.value.uid)
        
        if (!result.success) {
          if (result.message === 'ALREADY_LIKED') {
            userLikes.value.add(currentPost.value.PostID)
            showError({ message: 'ALREADY_LIKED_POST' }, 'like')
          } else if (result.message === 'NOT_LIKED') {
            userLikes.value.delete(currentPost.value.PostID)
          }
          return
        }

        // Update local state
        if (isCurrentlyLiked) {
          userLikes.value.delete(currentPost.value.PostID)
        } else {
          userLikes.value.add(currentPost.value.PostID)
        }
        
        const postIndex = posts.value.findIndex(p => p.PostID === currentPost.value.PostID)
        if (postIndex !== -1) {
          const newLikeCount = isCurrentlyLiked 
            ? Math.max(0, (posts.value[postIndex].likes || 0) - 1)
            : (posts.value[postIndex].likes || 0) + 1
          posts.value[postIndex].likes = newLikeCount
        }

      } catch (error) {
        showError(error, 'like')
      } finally {
        isLiking.value = false
      }
    }

    // Format timestamp
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '--:--'
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else {
        date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      }
      
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      
      return `${hours}:${minutes}, ${day}/${month}/${year}`
    }

    // Handle wheel scroll
    const handleWheel = (event) => {
      if (posts.value.length <= 1) return
      
      event.preventDefault()
      
      if (showOptionsMenu.value) closeOptionsMenu()
      
      const currentTime = Date.now()
      const timeSinceLastScroll = currentTime - lastScrollTime.value
      
      if (timeSinceLastScroll < scrollCooldown) {
        emit('scroll-warning', true)
        setTimeout(() => emit('scroll-warning', false), 2000)
        return
      }
      
      lastScrollTime.value = currentTime
      
      if (event.deltaY > 0) {
        currentIndex.value = (currentIndex.value + 1) % posts.value.length
      } else {
        currentIndex.value = currentIndex.value === 0 
          ? posts.value.length - 1 
          : currentIndex.value - 1
      }
    }

    // Watchers
    watch(currentIndex, () => {
      resetMediaIndex()
      closeOptionsMenu()
      emitPostStats()
    })

    watch(currentPost, (newPost) => {
      emit('current-post-changed', newPost)
    }, { immediate: true, deep: true })

    watch(user, async (newUser) => {
      if (newUser) {
        try {
          const likedPostIds = await getUserLikedPosts(newUser.uid)
          userLikes.value = new Set(likedPostIds)
        } catch (error) {
          // Silent fail
        }
      } else {
        userLikes.value.clear()
      }
    })

    // Lifecycle
    onMounted(() => {
      loadPosts()
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      posts,
      currentPost,
      currentIndex,
      currentMediaIndex,
      hasMultipleMedia,
      currentMedia,
      isLoading,
      isLiking,
      isLikedByUser,
      isPostOwner,
      hasMedia,
      showOptionsMenu,
      isActionsLoading,
      getText,
      getDisplayName,
      formatTimestamp,
      handleWheel,
      handleLike,
      previousMedia,
      nextMedia,
      toggleVideoPlayPause,
      handleVideoError,
      toggleOptionsMenu,
      handleDeletePost,
      handleHidePost,
      handleDownloadMedia,
      handleReportPost
    }
  }
}
</script>

/* HomeMain.vue styles - Updated Colors */
<style scoped>
.feed {
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

.content-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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

/* Media styles */
.media-carousel {
  width: 80%;
  height: 18.75rem;
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 0.9375rem;
  overflow: hidden;
}

.media-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.single-media {
  width: 80%;
  height: 18.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9375rem;
  overflow: hidden;
}

.post-media {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.9375rem;
}

/* Video autoplay styles */
video.post-media {
  cursor: pointer;
}

video.post-media:hover {
  opacity: 0.95;
}

/* Webkit browsers (Chrome, Safari) - Hide all controls by default */
video.post-media::-webkit-media-controls {
  display: none !important;
}

video.post-media::-webkit-media-controls-panel {
  display: none !important;
}

video.post-media::-webkit-media-controls-play-button {
  display: none !important;
}

video.post-media::-webkit-media-controls-start-playback-button {
  display: none !important;
}

video.post-media::-webkit-media-controls-timeline {
  display: none !important;
}

video.post-media::-webkit-media-controls-volume-slider {
  display: none !important;
}

video.post-media::-webkit-media-controls-current-time-display {
  display: none !important;
}

video.post-media::-webkit-media-controls-time-remaining-display {
  display: none !important;
}

video.post-media::-webkit-media-controls-mute-button {
  display: none !important;
}

video.post-media::-webkit-media-controls-fullscreen-button {
  display: none !important;
}

/* Show all controls on hover or focus */
video.post-media:hover::-webkit-media-controls,
video.post-media:focus::-webkit-media-controls {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-panel,
video.post-media:focus::-webkit-media-controls-panel {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-play-button,
video.post-media:focus::-webkit-media-controls-play-button {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-timeline,
video.post-media:focus::-webkit-media-controls-timeline {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-volume-slider,
video.post-media:focus::-webkit-media-controls-volume-slider {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-current-time-display,
video.post-media:focus::-webkit-media-controls-current-time-display {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-time-remaining-display,
video.post-media:focus::-webkit-media-controls-time-remaining-display {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-mute-button,
video.post-media:focus::-webkit-media-controls-mute-button {
  display: flex !important;
}

video.post-media:hover::-webkit-media-controls-fullscreen-button,
video.post-media:focus::-webkit-media-controls-fullscreen-button {
  display: flex !important;
}

/* Firefox */
video.post-media::-moz-media-controls {
  opacity: 0 !important;
  transition: opacity 0.3s ease;
}

video.post-media:hover::-moz-media-controls,
video.post-media:focus::-moz-media-controls {
  opacity: 1 !important;
}

@media (max-width: 768px) {
  video.post-media::-webkit-media-controls {
    display: block !important;
  }
  
  video.post-media::-webkit-media-controls-panel {
    display: flex !important;
  }
  
  video.post-media::-moz-media-controls {
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
  z-index: 10;
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

.media-dots {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.25rem;
  z-index: 10;
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
  z-index: 10;
}

.no-media, .loading-text, .empty-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-color);
  font-size: 1rem;
  font-weight: 500;
  width: 80%;
  height: 18.75rem;
  background: var(--theme-color-10);
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color-20);
}

.bottom-bar {
  position: absolute;
  bottom: 0.625rem;
  left: 0.625rem;
  right: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.caption {
  font-size: 0.75rem;
  max-width: 50%;
  background: var(--theme-color);
  padding: 0.3125rem 0.625rem;
  border-radius: 0.9375rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  color: #000;
  word-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 0.625rem;
}

.like, .options-menu {
  width: 1.875rem;
  height: 1.875rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.like {
  background: url('@/icons/like.png') center/1rem var(--theme-color);
  background-repeat: no-repeat;
}

.like.liked {
  background-color: rgba(255, 0, 0, 0.8);
  transform: scale(1.05);
}

.like-count {
  position: absolute;
  bottom: -0.25rem;
  right: -0.25rem;
  background: rgba(0, 0, 0, 0.8);
  color: var(--theme-color);
  font-size: 0.5rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.5rem;
  min-width: 1rem;
  text-align: center;
}

.options-menu {
  background: url('@/icons/options.png') center/1rem var(--theme-color);
  background-repeat: no-repeat;
}

.like:hover:not(:disabled), .options-menu:hover {
  transform: scale(1.1);
  box-shadow: 0 0.25rem 0.625rem rgba(0, 0, 0, 0.4);
  background-color: #2B2D42;
}

.like:disabled, .options-menu:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Options Menu Styles */
.options-container {
  position: relative;
}

.options-dropdown {
  position: absolute;
  bottom: 2.5rem;
  right: 0;
  min-width: 10rem;
  background: #2B2D42;
  border: 0.125rem solid var(--theme-color);
  border-radius: 0.5rem;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.option-item {
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--theme-color);
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.3s ease;
  text-align: left;
}

.option-item:hover:not(:disabled) {
  background: var(--theme-color-10);
}

.option-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-icon {
  width: 1rem;
  height: 1rem;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.delete-icon {
  background-image: url('@/icons/delete.png');
}

.hide-icon {
  background-image: url('@/icons/hide.png');
}

.download-icon {
  background-image: url('@/icons/download.png');
}

.report-icon {
  background-image: url('@/icons/report.png');
}

.delete-option {
  color: rgba(255, 0, 0, 0.9);
}

.delete-option .option-icon {
  filter: brightness(0) saturate(100%) invert(55%) sepia(100%) saturate(3000%) hue-rotate(335deg) brightness(100%) contrast(95%);
}

.delete-option:hover:not(:disabled) {
  background: rgba(255, 0, 0, 0.1);
}
</style>