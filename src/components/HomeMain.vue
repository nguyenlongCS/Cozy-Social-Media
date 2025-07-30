<!--
src/components/HomeMain.vue - Updated với Posts Structure mới
Component Feed chính - Hiển thị posts từ Firestore với chức năng like
Logic:
- Load posts từ Firestore với structure mới (PostID, UserID, UserName, etc.)
- Cuộn wheel để chuyển bài với throttle và warning
- Preload media cho bài tiếp theo để tránh lag
- Emit currentPost để HomeRight hiển thị chi tiết
- Format timestamp và display name với (me/tôi) cho current user
- Xử lý like/unlike post thông qua togglePostLike
- Sử dụng fields mới: PostID, UserName, Avatar, Caption, Created, MediaType, MediaURL
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
      <div class="media-area">
        <div class="loading-text">{{ getText('loading') }}</div>
      </div>
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
      <div class="media-area">
        <div class="empty-text">{{ getText('noPosts') }}</div>
      </div>
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
      
      <div class="media-area">
        <img v-if="currentPost.MediaType === 'image'" 
             :src="currentPost.MediaURL" 
             :alt="currentPost.Caption"
             class="post-media">
        <video v-else-if="currentPost.MediaType === 'video'" 
               :src="currentPost.MediaURL" 
               controls
               class="post-media">
        </video>
        <div v-else class="no-media">
          {{ getText('textPost') }}
        </div>
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
          <button class="options-menu"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useFirestore } from '@/composables/useFirestore'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useAuth } from '@/composables/useAuth'

export default {
  name: 'HomeMain',
  emits: ['scroll-warning', 'current-post-changed'],
  setup(props, { emit }) {
    const { getPosts, togglePostLike, getUserLikedPosts, isLoading } = useFirestore()
    const { getText, currentLanguage } = useLanguage()
    const { showError } = useErrorHandler()
    const { user } = useAuth()
    
    // Reactive data
    const posts = ref([])
    const currentIndex = ref(0)
    const preloadedMedia = ref(new Map())
    const lastScrollTime = ref(0)
    const scrollCooldown = 300
    const isLiking = ref(false)
    const userLikes = ref(new Set()) // Track posts liked by current user

    // Computed properties
    const currentPost = computed(() => {
      return posts.value[currentIndex.value] || {}
    })

    const isLikedByUser = computed(() => {
      if (!user.value || !currentPost.value.PostID) return false
      return userLikes.value.has(currentPost.value.PostID)
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

    const loadPosts = async () => {
      try {
        const fetchedPosts = await getPosts(10)
        posts.value = fetchedPosts
        console.log('Posts loaded:', fetchedPosts.length)
        
        // Load user liked posts if user is logged in
        if (user.value) {
          const likedPostIds = await getUserLikedPosts(user.value.uid)
          userLikes.value = new Set(likedPostIds)
          console.log('User liked posts loaded:', likedPostIds.length)
        }
        
        if (fetchedPosts.length > 0) {
          preloadMedia(0)
          if (fetchedPosts.length > 1) {
            preloadMedia(1)
          }
        }
      } catch (error) {
        console.error('Error loading posts:', error)
        showError(error, 'loadPosts')
      }
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
        
        // Update in Firestore with strict policy
        const result = await togglePostLike(currentPost.value.PostID, user.value.uid)
        
        if (!result.success) {
          // Handle failed like attempt
          if (result.message === 'ALREADY_LIKED') {
            console.log('User already liked this post')
            // Ensure UI reflects actual state
            userLikes.value.add(currentPost.value.PostID)
            // Show user-friendly message
            showError({ message: 'ALREADY_LIKED_POST' }, 'like')
          } else if (result.message === 'NOT_LIKED') {
            console.log('User has not liked this post')
            userLikes.value.delete(currentPost.value.PostID)
          }
          return
        }

        // Update UI state on successful toggle
        if (isCurrentlyLiked) {
          userLikes.value.delete(currentPost.value.PostID)
        } else {
          userLikes.value.add(currentPost.value.PostID)
        }
        
        // Update local post data
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

    const preloadMedia = (index) => {
      const post = posts.value[index]
      if (!post || !post.MediaURL || preloadedMedia.value.has(post.PostID)) {
        return
      }

      if (post.MediaType === 'image') {
        const img = new Image()
        img.onload = () => {
          preloadedMedia.value.set(post.PostID, true)
          console.log('Preloaded image for post:', post.PostID)
        }
        img.onerror = () => {
          console.error('Failed to preload image for post:', post.PostID)
        }
        img.src = post.MediaURL
      } else if (post.MediaType === 'video') {
        const video = document.createElement('video')
        video.onloadeddata = () => {
          preloadedMedia.value.set(post.PostID, true)
          console.log('Preloaded video for post:', post.PostID)
        }
        video.onerror = () => {
          console.error('Failed to preload video for post:', post.PostID)
        }
        video.preload = 'metadata'
        video.src = post.MediaURL
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

      const nextIndex = (newIndex + 1) % totalPosts
      preloadMedia(nextIndex)

      const prevIndex = newIndex === 0 ? totalPosts - 1 : newIndex - 1
      preloadMedia(prevIndex)
    })

    watch(currentPost, (newPost) => {
      emit('current-post-changed', newPost)
    }, { immediate: true, deep: true })

    // Watch user changes để reload likes tracking
    watch(user, async (newUser) => {
      if (newUser) {
        // Re-load user liked posts khi user đăng nhập
        try {
          const likedPostIds = await getUserLikedPosts(newUser.uid)
          userLikes.value = new Set(likedPostIds)
          console.log('User likes reloaded:', likedPostIds.length)
        } catch (error) {
          console.error('Error reloading user likes:', error)
        }
      } else {
        // Clear likes tracking khi user đăng xuất
        userLikes.value.clear()
      }
    })

    // Lifecycle
    onMounted(() => {
      loadPosts()
    })

    return {
      posts,
      currentPost,
      isLoading,
      isLiking,
      isLikedByUser,
      getText,
      getDisplayName,
      formatTimestamp,
      handleWheel,
      handleLike
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

.media-area {
  width: 80%;
  height: 18.75rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9375rem;
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);
  color: #000;
  font-size: 1rem;
  font-weight: 500;
  overflow: hidden;
}

.post-media {
  max-width: 90%;
  max-height: 90%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.9375rem;
}

.no-media, .loading-text, .empty-text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-size: 1rem;
  font-weight: 500;
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
  background: url('@/icons/like.png') center/cover var(--theme-color);
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
  background: url('@/icons/options.png') center/cover var(--theme-color);
}

.like:hover:not(:disabled), .options-menu:hover {
  transform: scale(1.1);
  box-shadow: 0 0.25rem 0.625rem rgba(0, 0, 0, 0.4);
  background-color: #2B2D42;
}

.like:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>