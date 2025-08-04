<!--
src/components/HomeMain.vue - Updated with Options Menu
Component Feed chính với options menu cho bài viết
Logic:
- Thêm options menu dropdown với 5 chức năng
- Xóa bài viết (chỉ owner)
- Ẩn bài viết (chỉ owner) 
- Tải xuống media
- Báo cáo bài viết
- Kiểm tra quyền sở hữu để hiển thị menu phù hợp
- Click outside để đóng menu
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
                 controls
                 class="post-media">
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
               controls
               class="post-media">
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
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
    
    // Reactive data
    const posts = ref([])
    const currentIndex = ref(0)
    const currentMediaIndex = ref(0)
    const preloadedMedia = ref(new Map())
    const lastScrollTime = ref(0)
    const scrollCooldown = 300
    const isLiking = ref(false)
    const userLikes = ref(new Set())
    
    // Options menu state
    const showOptionsMenu = ref(false)

    // Computed properties
    const currentPost = computed(() => {
      return posts.value[currentIndex.value] || {}
    })

    const hasMultipleMedia = computed(() => {
      return currentPost.value.mediaItems && currentPost.value.mediaItems.length > 0
    })

    const currentMedia = computed(() => {
      if (hasMultipleMedia.value) {
        return currentPost.value.mediaItems[currentMediaIndex.value] || {}
      }
      return {}
    })

    const isLikedByUser = computed(() => {
      if (!user.value || !currentPost.value.PostID) return false
      return userLikes.value.has(currentPost.value.PostID)
    })

    // Options menu computed properties
    const isPostOwner = computed(() => {
      return user.value && currentPost.value.UserID === user.value.uid
    })

    const hasMedia = computed(() => {
      return currentPost.value.MediaURL || 
             (currentPost.value.mediaItems && currentPost.value.mediaItems.length > 0)
    })

    // Methods
    const getDisplayName = (post) => {
      if (!post.UserName) return getText('user')
      
      const userName = post.UserName
      
      if (user.value && post.UserID === user.value.uid) {
        const meText = currentLanguage.value === 'vi' ? 'tôi' : 'me'
        return `${userName} (${meText})`
      }
      
      return userName
    }

    // Media navigation methods
    const previousMedia = () => {
      if (currentMediaIndex.value > 0) {
        currentMediaIndex.value--
      }
    }

    const nextMedia = () => {
      if (currentMediaIndex.value < currentPost.value.mediaCount - 1) {
        currentMediaIndex.value++
      }
    }

    const resetMediaIndex = () => {
      currentMediaIndex.value = 0
    }

    // Options menu methods
    const toggleOptionsMenu = () => {
      showOptionsMenu.value = !showOptionsMenu.value
    }

    const closeOptionsMenu = () => {
      showOptionsMenu.value = false
    }

    // Handle click outside to close menu
    const handleClickOutside = (event) => {
      const optionsContainer = event.target.closest('.options-container')
      if (!optionsContainer && showOptionsMenu.value) {
        closeOptionsMenu()
      }
    }

    // Post action handlers
    const handleDeletePost = async () => {
      if (!currentPost.value || !user.value) return
      
      const confirmed = confirm(getText('confirmDeletePost'))
      if (!confirmed) return

      try {
        await deletePost(currentPost.value, user.value.uid)
        
        // Remove post from local state
        posts.value.splice(currentIndex.value, 1)
        
        // Adjust current index
        if (currentIndex.value >= posts.value.length) {
          currentIndex.value = Math.max(0, posts.value.length - 1)
        }
        
        // Emit updated post stats
        emitPostStats()
        
        closeOptionsMenu()
        emit('post-deleted', currentPost.value.PostID)
        
        // Reload posts if list becomes empty
        if (posts.value.length === 0) {
          await loadPosts()
        }
        
      } catch (error) {
        console.error('Delete post failed:', error)
      }
    }

    const handleHidePost = async () => {
      if (!currentPost.value || !user.value) return
      
      const confirmed = confirm(getText('confirmHidePost'))
      if (!confirmed) return

      try {
        await hidePost(currentPost.value, user.value.uid)
        
        // Remove post from local state (visually hidden from feed)
        posts.value.splice(currentIndex.value, 1)
        
        // Adjust current index
        if (currentIndex.value >= posts.value.length) {
          currentIndex.value = Math.max(0, posts.value.length - 1)
        }
        
        // Emit updated post stats
        emitPostStats()
        
        closeOptionsMenu()
        emit('post-hidden', currentPost.value.PostID)
        
        // Reload posts if list becomes empty
        if (posts.value.length === 0) {
          await loadPosts()
        }
        
      } catch (error) {
        console.error('Hide post failed:', error)
      }
    }

    const handleDownloadMedia = async () => {
      if (!currentPost.value) return
      
      try {
        await downloadPostMedia(currentPost.value)
        closeOptionsMenu()
      } catch (error) {
        console.error('Download media failed:', error)
      }
    }

    const handleReportPost = async () => {
      if (!currentPost.value) return
      
      try {
        await reportPost(currentPost.value)
        closeOptionsMenu()
      } catch (error) {
        console.error('Report post failed:', error)
      }
    }

    // Existing methods (loadPosts, handleLike, etc.) remain unchanged
    const loadPosts = async () => {
      try {
        // Load ALL posts instead of limit 10
        const fetchedPosts = await getPosts(1000) // Large number to get all posts
        // Filter out hidden posts
        posts.value = fetchedPosts.filter(post => !post.Hidden)
        console.log('Posts loaded:', posts.value.length, 'Total fetched:', fetchedPosts.length)
        
        // Emit post stats for footer counter
        emitPostStats()
        
        if (user.value) {
          const likedPostIds = await getUserLikedPosts(user.value.uid)
          userLikes.value = new Set(likedPostIds)
          console.log('User liked posts loaded:', likedPostIds.length)
        }
        
        if (posts.value.length > 0) {
          preloadMedia(0)
          if (posts.value.length > 1) {
            preloadMedia(1)
          }
        }
      } catch (error) {
        console.error('Error loading posts:', error)
        showError(error, 'loadPosts')
      }
    }

    // Emit post stats to parent
    const emitPostStats = () => {
      emit('post-stats-changed', {
        currentIndex: currentIndex.value,
        totalPosts: posts.value.length
      })
    }

    const handleLike = async () => {
      if (!user.value) {
        showError({ message: 'NOT_AUTHENTICATED' }, 'like')
        return
      }

      if (!currentPost.value.PostID || isLiking.value) {
        return
      }

      isLiking.value = true

      try {
        const isCurrentlyLiked = isLikedByUser.value
        
        const result = await togglePostLike(currentPost.value.PostID, user.value.uid)
        
        if (!result.success) {
          if (result.message === 'ALREADY_LIKED') {
            console.log('User already liked this post')
            userLikes.value.add(currentPost.value.PostID)
            showError({ message: 'ALREADY_LIKED_POST' }, 'like')
          } else if (result.message === 'NOT_LIKED') {
            console.log('User has not liked this post')
            userLikes.value.delete(currentPost.value.PostID)
          }
          return
        }

        if (isCurrentlyLiked) {
          userLikes.value.delete(currentPost.value.PostID)
        } else {
          userLikes.value.add(currentPost.value.PostID)
        }
        
        const postIndex = posts.value.findIndex(p => p.PostID === currentPost.value.PostID)
        if (postIndex !== -1) {
          const newLikeCount = isCurrentlyLiked 
            ? (posts.value[postIndex].likes || 0) - 1 
            : (posts.value[postIndex].likes || 0) + 1
          posts.value[postIndex].likes = Math.max(0, newLikeCount)
        }

        console.log('Like toggled successfully:', {
          PostID: currentPost.value.PostID,
          isLiked: !isCurrentlyLiked
        })

      } catch (error) {
        console.error('Error toggling like:', error)
        showError(error, 'like')
      } finally {
        isLiking.value = false
      }
    }

    // Preload media method (unchanged)
    const preloadMedia = (index) => {
      const post = posts.value[index]
      if (!post || preloadedMedia.value.has(post.PostID)) {
        return
      }

      if (post.mediaItems && post.mediaItems.length > 0) {
        post.mediaItems.forEach((mediaItem, mediaIndex) => {
          const cacheKey = `${post.PostID}_${mediaIndex}`
          
          if (mediaItem.type === 'image') {
            const img = new Image()
            img.onload = () => {
              preloadedMedia.value.set(cacheKey, true)
              console.log(`Preloaded multi-media image ${mediaIndex + 1} for post:`, post.PostID)
            }
            img.onerror = () => {
              console.error(`Failed to preload multi-media image ${mediaIndex + 1} for post:`, post.PostID)
            }
            img.src = mediaItem.url
          } else if (mediaItem.type === 'video') {
            const video = document.createElement('video')
            video.onloadeddata = () => {
              preloadedMedia.value.set(cacheKey, true)
              console.log(`Preloaded multi-media video ${mediaIndex + 1} for post:`, post.PostID)
            }
            video.onerror = () => {
              console.error(`Failed to preload multi-media video ${mediaIndex + 1} for post:`, post.PostID)
            }
            video.preload = 'metadata'
            video.src = mediaItem.url
          }
        })
      } else if (post.MediaURL) {
        if (post.MediaType === 'image') {
          const img = new Image()
          img.onload = () => {
            preloadedMedia.value.set(post.PostID, true)
            console.log('Preloaded single image for post:', post.PostID)
          }
          img.onerror = () => {
            console.error('Failed to preload single image for post:', post.PostID)
          }
          img.src = post.MediaURL
        } else if (post.MediaType === 'video') {
          const video = document.createElement('video')
          video.onloadeddata = () => {
            preloadedMedia.value.set(post.PostID, true)
            console.log('Preloaded single video for post:', post.PostID)
          }
          video.onerror = () => {
            console.error('Failed to preload single video for post:', post.PostID)
          }
          video.preload = 'metadata'
          video.src = post.MediaURL
        }
      }
    }

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '--:--'
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        date = timestamp
      } else {
        date = new Date(timestamp)
      }
      
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      
      return `${hours}:${minutes}, ${day}/${month}/${year}`
    }

    const handleWheel = (event) => {
      if (posts.value.length <= 1) return
      
      event.preventDefault()
      
      // Close options menu when scrolling
      if (showOptionsMenu.value) {
        closeOptionsMenu()
      }
      
      const currentTime = Date.now()
      const timeSinceLastScroll = currentTime - lastScrollTime.value
      
      if (timeSinceLastScroll < scrollCooldown) {
        emit('scroll-warning', true)
        setTimeout(() => {
          emit('scroll-warning', false)
        }, 2000)
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
    watch(currentIndex, (newIndex) => {
      const totalPosts = posts.value.length
      if (totalPosts === 0) return

      resetMediaIndex()
      closeOptionsMenu() // Close menu when changing posts
      
      // Emit updated post stats
      emitPostStats()

      const nextIndex = (newIndex + 1) % totalPosts
      preloadMedia(nextIndex)

      const prevIndex = newIndex === 0 ? totalPosts - 1 : newIndex - 1
      preloadMedia(prevIndex)
    })

    watch(currentPost, (newPost) => {
      emit('current-post-changed', newPost)
    }, { immediate: true, deep: true })

    watch(user, async (newUser) => {
      if (newUser) {
        try {
          const likedPostIds = await getUserLikedPosts(newUser.uid)
          userLikes.value = new Set(likedPostIds)
          console.log('User likes reloaded:', likedPostIds.length)
        } catch (error) {
          console.error('Error reloading user likes:', error)
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
      toggleOptionsMenu,
      handleDeletePost,
      handleHidePost,
      handleDownloadMedia,
      handleReportPost
    }
  }
}
</script>

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

/* Multi-media carousel styles */
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
  color: white;
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
  background: rgba(255, 255, 255, 0.5);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot.active {
  background: white;
  transform: scale(1.2);
}

.media-counter {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
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
  background: rgba(255, 235, 124, 0.1);
  border-radius: 0.9375rem;
  border: 0.125rem solid rgba(255, 235, 124, 0.3);
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
  background-color: #ff4757;
  transform: scale(1.05);
}

.like-count {
  position: absolute;
  bottom: -0.25rem;
  right: -0.25rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
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
  background: rgba(255, 235, 124, 0.1);
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

/* Special colors for critical actions */
.delete-option {
  color: #ff6b6b;
}

.delete-option .option-icon {
  filter: brightness(0) saturate(100%) invert(55%) sepia(100%) saturate(3000%) hue-rotate(335deg) brightness(100%) contrast(95%);
}

.delete-option:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.1);
}
</style>