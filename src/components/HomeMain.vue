<!--
src/components/HomeMain.vue - Updated
Component Feed content - Load và hiển thị posts từ Firestore
Logic:
- Load posts từ Firestore khi component mount
- Chỉ hiển thị 1 bài viết tại một thời điểm
- Cuộn để chuyển sang bài viết tiếp theo (wheel event)
- Emit currentPost khi thay đổi để HomeRight có thể hiển thị chi tiết
- Vị trí hiển thị giống như content cố định mẫu ban đầu
- Không có thanh cuộn hiển thị
- Preload media cho bài tiếp theo để tránh lag khi cuộn
-->
<template>
  <div class="feed">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-content">
      <div class="user-info">
        <div class="avatar"></div>
        <span class="name">{{ getText('loading') || 'Đang tải...' }}</span>
      </div>
      <div class="timestamp">--:--</div>
      <div class="media-area">
        <div class="loading-text">{{ getText('loading') || 'Đang tải...' }}</div>
      </div>
      <div class="bottom-bar">
        <span class="caption">{{ getText('loading') || 'Đang tải...' }}</span>
        <div class="actions">
          <button class="like"></button>
          <button class="options-menu"></button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="posts.length === 0" class="empty-content">
      <div class="user-info">
        <div class="avatar"></div>
        <span class="name">{{ getText('noPosts') || 'Chưa có bài viết' }}</span>
      </div>
      <div class="timestamp">--:--</div>
      <div class="media-area">
        <div class="empty-text">{{ getText('noPosts') || 'Chưa có bài viết nào' }}</div>
      </div>
      <div class="bottom-bar">
        <span class="caption">{{ getText('noPosts') || 'Chưa có bài viết nào' }}</span>
        <div class="actions">
          <button class="like"></button>
          <button class="options-menu"></button>
        </div>
      </div>
    </div>

    <!-- Current post -->
    <div v-else class="post-content" @wheel="handleWheel">
      <div class="user-info">
        <div class="avatar"></div>
        <span class="name">{{ getDisplayName(currentPost) }}</span>
      </div>
      <div class="timestamp">{{ formatTimestamp(currentPost.createdAt) }}</div>
      
      <!-- Media area -->
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
          {{ getText('textPost') || 'Bài viết văn bản' }}
        </div>
      </div>
      
      <div class="bottom-bar">
        <span class="caption">{{ currentPost.caption }}</span>
        <div class="actions">
          <button class="like"></button>
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
    const { getPosts, isLoading } = useFirestore()
    const { getText, currentLanguage } = useLanguage()
    const { showError } = useErrorHandler()
    const { user } = useAuth()
    
    const posts = ref([])
    const currentIndex = ref(0)
    const preloadedMedia = ref(new Map()) // Cache cho media đã preload
    const lastScrollTime = ref(0) // Thời gian cuộn gần nhất
    const scrollCooldown = 300 // Cooldown 300ms giữa các lần cuộn
    const showScrollWarning = ref(false) // Hiển thị cảnh báo cuộn nhanh

    // Current post được hiển thị
    const currentPost = computed(() => {
      return posts.value[currentIndex.value] || {}
    })

    // Get display name với (me/tôi) cho current user
    const getDisplayName = (post) => {
      if (!post.authorName) return getText('user')
      
      const authorName = post.authorName
      
      // Kiểm tra nếu đây là bài của user hiện tại
      if (user.value && post.authorId === user.value.uid) {
        const meText = currentLanguage.value === 'vi' ? 'tôi' : 'me'
        return `${authorName} (${meText})`
      }
      
      return authorName
    }

    // Load posts từ Firestore
    const loadPosts = async () => {
      try {
        const fetchedPosts = await getPosts(10) // Lấy 10 posts mới nhất
        posts.value = fetchedPosts
        console.log('Posts loaded:', fetchedPosts.length)
        
        // Preload media cho bài đầu tiên và bài tiếp theo
        if (fetchedPosts.length > 0) {
          preloadMedia(0) // Bài hiện tại
          if (fetchedPosts.length > 1) {
            preloadMedia(1) // Bài tiếp theo
          }
        }
      } catch (error) {
        console.error('Error loading posts:', error)
        showError(error, 'loadPosts')
      }
    }

    // Preload media cho một bài cụ thể
    const preloadMedia = (index) => {
      const post = posts.value[index]
      if (!post || !post.mediaUrl || preloadedMedia.value.has(post.id)) {
        return // Không có media hoặc đã preload rồi
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

    // Watch currentIndex để preload media cho bài tiếp theo và trước đó
    watch(currentIndex, (newIndex) => {
      const totalPosts = posts.value.length
      if (totalPosts === 0) return

      // Preload bài tiếp theo
      const nextIndex = (newIndex + 1) % totalPosts
      preloadMedia(nextIndex)

      // Preload bài trước đó
      const prevIndex = newIndex === 0 ? totalPosts - 1 : newIndex - 1
      preloadMedia(prevIndex)
    })

    // Watch currentPost để emit khi thay đổi
    watch(currentPost, (newPost) => {
      emit('current-post-changed', newPost)
    }, { immediate: true, deep: true })

    // Format timestamp cho hiển thị
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '--:--'
      
      let date
      if (timestamp.toDate) {
        // Firestore Timestamp
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

    // Handle wheel scroll để chuyển bài viết với throttle
    const handleWheel = (event) => {
      if (posts.value.length <= 1) return
      
      event.preventDefault()
      
      const currentTime = Date.now()
      const timeSinceLastScroll = currentTime - lastScrollTime.value
      
      // Kiểm tra scroll quá nhanh
      if (timeSinceLastScroll < scrollCooldown) {
        // Hiển thị cảnh báo scroll quá nhanh
        showScrollWarning.value = true
        emit('scroll-warning', true)
        setTimeout(() => {
          showScrollWarning.value = false
          emit('scroll-warning', false)
        }, 2000) // Ẩn sau 2 giây
        return
      }
      
      // Update thời gian cuộn gần nhất
      lastScrollTime.value = currentTime
      
      if (event.deltaY > 0) {
        // Scroll down - next post
        currentIndex.value = (currentIndex.value + 1) % posts.value.length
      } else {
        // Scroll up - previous post
        currentIndex.value = currentIndex.value === 0 
          ? posts.value.length - 1 
          : currentIndex.value - 1
      }
    }

    // Load posts khi component mount
    onMounted(() => {
      loadPosts()
    })

    return {
      posts,
      currentPost,
      isLoading,
      showScrollWarning,
      getText,
      getDisplayName,
      formatTimestamp,
      handleWheel,
      loadPosts
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

.loading-content, .empty-content, .post-content {
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

.options-menu {
  background: url('src/icons/options.png') center/cover var(--theme-color);
}

.like:hover, .options-menu:hover {
  transform: scale(1.1);
  box-shadow: 0 0.25rem 0.625rem rgba(0, 0, 0, 0.4);
  background-color: #2B2D42;
}
</style>