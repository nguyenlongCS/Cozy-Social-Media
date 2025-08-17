<!--
src/components/NewsMain.vue
Component chính hiển thị grid tin tức từ NewsAPI
Logic: Hiển thị grid layout tương tự Discover với news articles
-->
<template>
  <div class="news-main">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-text">{{ getText('loading') }}...</div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-container">
      <div class="error-text">{{ getText('errorLoadingNews') }}</div>
      <button class="retry-btn" @click="loadNewsData">{{ getText('retry') }}</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="news.length === 0" class="empty-container">
      <div class="empty-text">{{ getText('noNewsAvailable') }}</div>
    </div>

    <!-- News grid -->
    <div v-else class="news-grid">
      <div
        v-for="(article, index) in news"
        :key="article.id"
        class="news-item"
        :class="getNewsItemClass(index)"
        @click="openArticle(article)"
      >
        <!-- Article image -->
        <div class="news-media">
          <img
            v-if="article.urlToImage"
            :src="article.urlToImage"
            :alt="article.title"
            class="media-image"
            @error="handleImageError"
          >
          <div v-else class="no-image">
            <div class="news-icon">📰</div>
          </div>

          <!-- Category badge -->
          <div class="category-badge" :style="{ backgroundColor: getCategoryColor(article.category) }">
            {{ getCategoryEmoji(article.category) }} {{ getCategoryText(article.category) }}
          </div>

          <!-- Article overlay -->
          <div class="article-overlay">
            <div class="source-info">
              <div class="source-name">{{ article.source?.name || 'Unknown Source' }}</div>
              <div class="publish-time">{{ formatNewsTime(article.publishedAt) }}</div>
            </div>
          </div>
        </div>

        <!-- Article content -->
        <div class="news-content">
          <h3 class="news-title">{{ article.title }}</h3>
          <p v-if="article.description" class="news-description">
            {{ truncateText(article.description, 100) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useNews } from '@/composables/useNews'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'NewsMain',
  setup() {
    const { getText } = useLanguage()
    const { 
      news, 
      isLoading, 
      error, 
      loadMixedNews, 
      formatNewsTime, 
      getCategoryEmoji, 
      getCategoryColor 
    } = useNews()
    const { showError } = useErrorHandler()

    // Load news data
    const loadNewsData = async () => {
      try {
        await loadMixedNews()
      } catch (error) {
        showError(error, 'news')
      }
    }

    // Grid class cho asymmetrical layout
    const getNewsItemClass = (index) => {
      const patterns = [
        'large', 'small', 'small',
        'small', 'large', 'small', 
        'small', 'small', 'large',
        'large', 'small', 'small'
      ]
      return patterns[index % patterns.length]
    }

    // Get category text
    const getCategoryText = (category) => {
      const categoryMap = {
        general: getText('general'),
        technology: getText('technology'),
        business: getText('business'),
        entertainment: getText('entertainment'),
        sports: getText('sports'),
        health: getText('health'),
        science: getText('science')
      }
      return categoryMap[category] || category
    }

    // Truncate text
    const truncateText = (text, maxLength) => {
      if (!text) return ''
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }

    // Handle image error
    const handleImageError = (event) => {
      event.target.style.display = 'none'
      const parent = event.target.parentElement
      const noImageDiv = parent.querySelector('.no-image')
      if (noImageDiv) {
        noImageDiv.style.display = 'flex'
      }
    }

    // Open article in new tab
    const openArticle = (article) => {
      if (article.url) {
        window.open(article.url, '_blank')
      }
    }

    onMounted(loadNewsData)

    return {
      news,
      isLoading,
      error,
      getText,
      loadNewsData,
      getNewsItemClass,
      getCategoryText,
      getCategoryColor,
      getCategoryEmoji,
      formatNewsTime,
      truncateText,
      handleImageError,
      openArticle
    }
  }
}
</script>

<style scoped>
.news-main {
  width: 100%;
  height: 100%;
  position: relative;
  background: #2B2D42;
  overflow: hidden;
}

.loading-container, .empty-container, .error-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.loading-text, .empty-text, .error-text {
  color: var(--theme-color);
  font-size: 1rem;
  font-weight: 500;
}

.retry-btn {
  background: var(--theme-color);
  color: #2B2D42;
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0.25rem 0.5rem var(--theme-color-20);
}

.news-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: 200px;
  gap: 0.5rem;
  padding: 1rem;
  overflow-y: auto;
  grid-auto-flow: row dense;
}

.news-item.small {
  grid-column: span 1;
  grid-row: span 1;
}

.news-item.large {
  grid-column: span 2;
  grid-row: span 2;
}

.news-item {
  position: relative;
  cursor: pointer;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 0.125rem solid var(--theme-color-20);
  background: var(--theme-color-05);
  display: flex;
  flex-direction: column;
}

.news-item:hover {
  transform: scale(1.02);
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.4);
  border-color: var(--theme-color);
}

.news-media {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 60%;
}

.media-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.news-item:hover .media-image {
  transform: scale(1.05);
}

.no-image {
  width: 100%;
  height: 100%;
  background: var(--theme-color-10);
  display: none;
  align-items: center;
  justify-content: center;
}

.news-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.category-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: var(--theme-color);
  color: #2B2D42;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.625rem;
  font-weight: 600;
  z-index: 2;
}

.article-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 1rem 0.75rem 0.75rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.news-item:hover .article-overlay {
  opacity: 1;
}

.source-info {
  color: white;
}

.source-name {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.publish-time {
  font-size: 0.625rem;
  opacity: 0.8;
}

.news-content {
  padding: 0.75rem;
  flex-shrink: 0;
  max-height: 40%;
  overflow: hidden;
}

.news-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-description {
  font-size: 0.75rem;
  color: var(--theme-color);
  opacity: 0.8;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 768px) {
  .news-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    grid-auto-rows: 180px;
    gap: 0.25rem;
    padding: 0.5rem;
  }
  
  .news-item.large {
    grid-column: span 1;
    grid-row: span 1;
  }
}

.news-grid::-webkit-scrollbar {
  width: 0.25rem;
}

.news-grid::-webkit-scrollbar-track {
  background: var(--theme-color-10);
}

.news-grid::-webkit-scrollbar-thumb {
  background: var(--theme-color-20);
  border-radius: 0.125rem;
}

.news-grid::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
}
</style>