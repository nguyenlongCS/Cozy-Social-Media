/*
src/composables/useNews.js - Firebase Functions Integration
Quản lý tin tức thông qua Firebase Functions để tránh lỗi 426
Logic: 
- Sử dụng Firebase Functions làm proxy cho NewsAPI
- Pure data fetching operations, không tự handle errors
- Throw errors để component xử lý với useErrorHandler
- Focus vào news data processing only
- Tránh Single Responsibility và No Cross-Calling
*/

import { ref } from 'vue'

export function useNews() {
  const news = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Firebase Functions URLs
  const FUNCTIONS_BASE_URL = 'https://us-central1-fir-auth-cozy.cloudfunctions.net'

  // Load tin tức từ Firebase Functions
  const loadNews = async (category = 'general', country = 'us') => {
    isLoading.value = true
    error.value = null
    
    try {
      const functionsUrl = `${FUNCTIONS_BASE_URL}/getNews?category=${category}&country=${country}`
      
      const response = await fetch(functionsUrl)
      
      if (!response.ok) {
        throw new Error(`News service error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.articles) {
        throw new Error(data.error || 'Failed to fetch news')
      }

      // Filter và validate articles - ưu tiên articles có hình ảnh
      const validArticles = data.articles
        .filter(article => isValidArticle(article))
        .sort((a, b) => {
          // Ưu tiên articles có hình ảnh lên trước
          if (a.urlToImage && !b.urlToImage) return -1
          if (!a.urlToImage && b.urlToImage) return 1
          return 0
        })
        .map(article => ({
          id: generateArticleId(article),
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source,
          category: category
        }))

      news.value = validArticles
      return validArticles

    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Load mixed news từ Firebase Functions
  const loadMixedNews = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const functionsUrl = `${FUNCTIONS_BASE_URL}/getMixedNews`
      
      const response = await fetch(functionsUrl)
      
      if (!response.ok) {
        throw new Error(`News service error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.articles) {
        throw new Error(data.error || 'Failed to fetch news')
      }

      const allNews = data.articles

      // Nếu không có tin tức nào, throw error để component xử lý
      if (allNews.length === 0) {
        throw new Error('No news available at the moment')
      }

      // Ưu tiên articles có hình ảnh và shuffle
      const articlesWithImages = allNews.filter(article => article.urlToImage)
      const articlesWithoutImages = allNews.filter(article => !article.urlToImage)
      
      const shuffledWithImages = shuffleArray(articlesWithImages)
      const shuffledWithoutImages = shuffleArray(articlesWithoutImages)
      
      // Kết hợp: articles có hình ảnh trước, sau đó không có hình ảnh
      const finalNews = [...shuffledWithImages, ...shuffledWithoutImages].slice(0, 24)
      
      // Sort theo publishedAt mới nhất
      finalNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

      news.value = finalNews
      return finalNews

    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Search news từ Firebase Functions
  const searchNews = async (query, sortBy = 'publishedAt') => {
    if (!query?.trim()) return []

    isLoading.value = true
    error.value = null
    
    try {
      const functionsUrl = `${FUNCTIONS_BASE_URL}/searchNews?q=${encodeURIComponent(query)}&sortBy=${sortBy}`
      
      const response = await fetch(functionsUrl)
      
      if (!response.ok) {
        throw new Error(`Search service error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.articles) {
        throw new Error(data.error || 'Search failed')
      }

      const searchResults = data.articles
        .filter(article => isValidArticle(article))
        .sort((a, b) => {
          // Ưu tiên articles có hình ảnh
          if (a.urlToImage && !b.urlToImage) return -1
          if (!a.urlToImage && b.urlToImage) return 1
          return 0
        })
        .map(article => ({
          id: generateArticleId(article),
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source,
          category: 'search'
        }))

      return searchResults

    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Validate article - không thay đổi logic
  const isValidArticle = (article) => {
    return article &&
           article.title &&
           article.title !== '[Removed]' &&
           article.url &&
           article.source &&
           article.publishedAt &&
           article.title.length > 10
  }

  // Generate unique ID cho article - không thay đổi logic
  const generateArticleId = (article) => {
    const titleHash = article.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
    const timeHash = new Date(article.publishedAt).getTime().toString().slice(-6)
    return `${titleHash}_${timeHash}`
  }

  // Shuffle array utility - không thay đổi logic
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Format time - không thay đổi logic
  const formatNewsTime = (publishedAt) => {
    if (!publishedAt) return ''
    
    const date = new Date(publishedAt)
    const now = new Date()
    const diffInMs = now - date
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInHours < 1) return 'Vừa xong'
    if (diffInHours < 24) return `${diffInHours} giờ trước`
    if (diffInDays < 7) return `${diffInDays} ngày trước`
    
    return date.toLocaleDateString()
  }

  // Get category emoji - không thay đổi logic
  const getCategoryEmoji = (category) => {
    const emojiMap = {
      general: '📰',
      technology: '💻',
      business: '💼',
      entertainment: '🎬',
      sports: '⚽',
      health: '🏥',
      science: '🔬'
    }
    return emojiMap[category] || '📰'
  }

  // Get category color - không thay đổi logic
  const getCategoryColor = (category) => {
    const colorMap = {
      general: '#6495ED',
      technology: '#00CED1',
      business: '#32CD32',
      entertainment: '#FF69B4',
      sports: '#FF6347',
      health: '#98FB98',
      science: '#9370DB'
    }
    return colorMap[category] || '#6495ED'
  }

  return {
    // State
    news,
    isLoading,
    error,
    
    // Methods
    loadNews,
    loadMixedNews,
    searchNews,
    
    // Utilities
    formatNewsTime,
    getCategoryEmoji,
    getCategoryColor
  }
}