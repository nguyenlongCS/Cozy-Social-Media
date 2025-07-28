<!--
src/components/HomeMain.vue - Updated
Component Feed chính - Hiển thị posts từ Firestore với chức năng like
Logic:
- Load posts từ Firestore và hiển thị từng bài một
- Cuộn wheel để chuyển bài với throttle và warning
- Preload media cho bài tiếp theo để tránh lag
- Emit currentPost để HomeRight hiển thị chi tiết
- Format timestamp và display name với (me/tôi) cho current user
- Xử lý like/unlike post thông qua useFirestore
- Mỗi user chỉ được like 1 lần per post
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
        <div class="avatar"></div>
        <span class="name">{{ getDisplayName(currentPost) }}</span>
      </div>
      <div class="timestamp">{{ formatTimestamp(currentPost.createdAt) }}</div>
      
      <div class="media-area">
        <img v-if="currentPost.mediaType === 'image'" 
             :src="currentPost.mediaUrl" 
             :alt="currentPost.caption"
             class="post-media">
        <video v-else-if="currentPost.mediaType === 'video'" 
               :src="currentPost.mediaUrl" 
               controls
               class="post-media">
        </video>
        <div v-else class="no-media">
          {{ getText('textPost') }}
        </div>
      </div>
      
      <div class="bottom-bar">
        <span class="caption">{{ currentPost.caption }}</span>
        <div class="actions">
          <button 
            class="like" 
            @click="handleLike"
            :disabled="isLiking"
            :class="{ liked: isLikedByUser }"
          ></button>
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
    const { getPosts, updatePostLikes, isLoading } = useFirestore()
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
      if (!user.value || !currentPost.value.id) return false
      return userLikes.value.has(currentPost.value.id)
    })

    // Methods
    const getDisplayName = (post) => {
      if (!post.authorName) return getText('user')
      
      const authorName = post.authorName
      
      if (user.value && post.authorId === user.value.uid) {
        const meText = currentLanguage.value === 'vi' ? 'tôi' : 'me'
        return `${authorName} (${meText})`
      }
      
      return authorName
    }

    const loadPosts = async () => {
      try {
        const fetchedPosts = await getPosts(10)
        posts.value = fetchedPosts
        console.log('Posts loaded:', fetchedPosts.length)
        
        // Initialize user likes tracking từ post data
        if (user.value) {
          fetchedPosts.forEach(post => {
            if (post.likedBy && post.likedBy.includes(user.value.uid)) {
              userLikes.value.add(post.id)
            }
          })
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

      if (!currentPost.value.id || isLiking.value) {
        return
      }

      isLiking.value = true

      try {
        const isCurrentlyLiked = isLikedByUser.value
        const newLikeCount = isCurrentlyLiked 
          ? (currentPost.value.likes || 0) - 1 
          : (currentPost.value.likes || 0) + 1

        // Update UI optimistically
        if (isCurrentlyLiked) {
          userLikes.value.delete(currentPost.value.id)
        } else {
          userLikes.value.add(currentPost.value.id)
        }
        
        // Update local post data
        const postIndex = posts.value.findIndex(p => p.id === currentPost.value.id)
        if (postIndex !== -1) {
          posts.value[postIndex].likes = newLikeCount
          if (isCurrentlyLiked) {
            posts.value[postIndex].likedBy = (posts.value[postIndex].likedBy || [])
              .filter(id => id !== user.value.uid)  
          } else {
            posts.value[postIndex].likedBy = [...(posts.value[postIndex].likedBy || []), user.value.uid]
          }
        }

        // Update in Firestore
        await updatePostLikes(currentPost.value.id, newLikeCount, user.value.uid, !isCurrentlyLiked)

        console.log('Like updated successfully:', {
          postId: currentPost.value.id,
          newLikeCount,
          isLiked: !isCurrentlyLiked
        })

      } catch (error) {
        console.error('Error updating like:', error)
        showError(error, 'like')
        
        // Revert optimistic update on error
        if (isLikedByUser.value) {
          userLikes.value.delete(currentPost.value.id)
        } else {
          userLikes.value.add(currentPost.value.id)
        }
      } finally {
        isLiking.value = false
      }
    }

    const preloadMedia = (index) => {
      const post = posts.value[index]
      if (!post || !post.mediaUrl || preloadedMedia.value.has(post.id)) {
        return
      }

      if (post.mediaType === 'image') {
        const img = new Image()
        img.onload = () => {
          preloadedMedia.value.set(post.id, true)
          console.log('Preloaded image for post:', post.id)
        }
        img.onerror = () => {
          console.error('Failed to preload image for post:', post.id)
        }
        img.src = post.mediaUrl
      } else if (post.mediaType === 'video') {
        const video = document.createElement('video')
        video.onloadeddata = () => {
          preloadedMedia.value.set(post.id, true)
          console.log('Preloaded video for post:', post.id)
        }
        video.onerror = () => {
          console.error('Failed to preload video for post:', post.id)
        }
        video.preload = 'metadata'
        video.src = post.mediaUrl
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

    // Watch user changes để update likes tracking
    watch(user, (newUser) => {
      if (newUser) {
        // Re-initialize likes tracking khi user đăng nhập
        userLikes.value.clear()
        posts.value.forEach(post => {
          if (post.likedBy && post.likedBy.includes(newUser.uid)) {
            userLikes.value.add(post.id)
          }
        })
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
  background: url('src/icons/user.png') center/cover var(--theme-color);
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
}

.like {
  background: url('src/icons/like.png') center/cover var(--theme-color);
}

.like.liked {
  background-color: #ff4757; /* Red color khi đã like */
  transform: scale(1.05);
}

.options-menu {
  background: url('src/icons/options.png') center/cover var(--theme-color);
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