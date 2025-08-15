<!--
src/components/DiscoverMain.vue
Component chính hiển thị grid posts cho trang Discover
Logic: Hiển thị asymmetrical grid với trending posts có fire icon, videos auto-play
-->
<template>
  <div class="discover-main">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-text">{{ getText('loading') }}...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="posts.length === 0" class="empty-container">
      <div class="empty-text">{{ getText('noPostsToDiscover') }}</div>
    </div>

    <!-- Posts grid -->
    <div v-else class="posts-grid">
      <div
        v-for="(post, index) in posts"
        :key="post.PostID"
        class="post-item"
        :class="getPostItemClass(index)"
        @click="openPost(post)"
      >
        <!-- Media content -->
        <div class="post-media">
          <img
            v-if="post.MediaType === 'image' || !post.MediaType"
            :src="post.MediaURL"
            :alt="post.Caption || 'Post'"
            class="media-image"
            @error="handleImageError"
          >
          <video
            v-else-if="post.MediaType === 'video'"
            :src="post.MediaURL"
            class="media-video"
            muted
            autoplay
            loop
            playsinline
            @loadeddata="handleVideoLoaded"
          >
          </video>

          <!-- Multiple media indicator -->
          <div v-if="post.mediaCount > 1" class="multiple-media-icon">
            <div class="gallery-icon"></div>
          </div>

          <!-- Trending fire icon -->
          <div v-if="post.isTrending" class="trending-icon">
            <img 
              src="@/icons/fire.gif" 
              alt="Trending" 
              class="fire-gif"
              @error="handleFireGifError"
            >
          </div>

          <!-- Post overlay -->
          <div class="post-overlay">
            <div class="like-count">
              <div class="like-icon"></div>
              <span class="like-number">{{ formatLikes(post.likes) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useDiscover } from '@/composables/useDiscover'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'DiscoverMain',
  setup() {
    const { getText } = useLanguage()
    const { posts, isLoading, loadDiscoverPosts, identifyTrendingPosts } = useDiscover()
    const { showError } = useErrorHandler()

    // Load posts khi component mount
    const loadPosts = async () => {
      try {
        await loadDiscoverPosts()
        await identifyTrendingPosts()
      } catch (error) {
        showError(error, 'discover')
      }
    }

    // Grid class cho asymmetrical layout
    const getPostItemClass = (index) => {
      const patterns = [
        'large', 'small', 'small',
        'small', 'large', 'small', 
        'small', 'small', 'large',
        'large', 'small', 'small',
        'small', 'small', 'small',
        'small', 'large', 'small'
      ]
      return patterns[index % patterns.length]
    }

    // Format số lượt like
    const formatLikes = (likes) => {
      if (!likes || likes === 0) return '0'
      if (likes < 1000) return likes.toString()
      if (likes < 1000000) return (likes / 1000).toFixed(1) + 'K'
      return (likes / 1000000).toFixed(1) + 'M'
    }

    // Video auto-play khi load
    const handleVideoLoaded = (event) => {
      const video = event.target
      if (video && video.tagName === 'VIDEO') {
        video.play().catch(() => {})
      }
    }

    // Handle errors
    const handleImageError = (event) => {
      event.target.style.display = 'none'
    }

    const handleFireGifError = (event) => {
      event.target.outerHTML = '<div class="fire-fallback">🔥</div>'
    }

    // Open post detail
    const openPost = (post) => {
      // TODO: Implement post detail modal or navigation
    }

    onMounted(loadPosts)

    return {
      posts,
      isLoading,
      getText,
      getPostItemClass,
      formatLikes,
      handleVideoLoaded,
      handleImageError,
      handleFireGifError,
      openPost
    }
  }
}
</script>

<style scoped>
.discover-main {
  width: 100%;
  height: 100%;
  position: relative;
  background: #2B2D42;
  overflow: hidden;
}

.loading-container, .empty-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text, .empty-text {
  color: var(--theme-color);
  font-size: 1rem;
  font-weight: 500;
}

.posts-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  grid-auto-rows: 180px;
  gap: 0.25rem;
  padding: 0.5rem;
  overflow-y: auto;
  grid-auto-flow: row dense;
}

.post-item.small {
  grid-column: span 1;
  grid-row: span 1;
}

.post-item.large {
  grid-column: span 2;
  grid-row: span 2;
}

.post-item {
  position: relative;
  cursor: pointer;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 0.125rem solid var(--theme-color-20);
}

.post-item:hover {
  transform: scale(1.03);
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.4);
  border-color: var(--theme-color);
}

.post-media {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.media-image, .media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.media-video {
  object-position: center;
}

.post-item:hover .media-image,
.post-item:hover .media-video {
  transform: scale(1.05);
}

.multiple-media-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1rem;
  height: 1rem;
  z-index: 2;
}

.gallery-icon {
  width: 100%;
  height: 100%;
  background: url('@/icons/gallery.png') center/cover;
  filter: brightness(0) saturate(100%) invert(100%);
  opacity: 0.8;
}

.trending-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  z-index: 3;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fire-gif {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

.fire-fallback {
  font-size: 1.2rem;
  animation: bounce 0.5s infinite alternate;
}

.post-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 1rem 0.75rem 0.75rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.post-item:hover .post-overlay {
  opacity: 1;
}

.like-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.like-icon {
  width: 1rem;
  height: 1rem;
  background: url('@/icons/like.png') center/cover;
  filter: brightness(0) saturate(100%) invert(100%);
}

.like-number {
  text-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.5);
}

@keyframes bounce {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    grid-auto-rows: 150px;
  }
  
  .post-item.large {
    grid-column: span 1;
    grid-row: span 1;
  }
}

@media (max-width: 480px) {
  .posts-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 160px;
    gap: 0.125rem;
    padding: 0.25rem;
  }
  
  .post-item.large {
    grid-column: span 1;
    grid-row: span 1;
  }
}

.posts-grid::-webkit-scrollbar {
  width: 0.25rem;
}

.posts-grid::-webkit-scrollbar-track {
  background: var(--theme-color-10);
}

.posts-grid::-webkit-scrollbar-thumb {
  background: var(--theme-color-20);
  border-radius: 0.125rem;
}

.posts-grid::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
}
</style>