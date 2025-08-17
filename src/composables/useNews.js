/*
src/composables/useNews.js
Quản lý tin tức từ NewsAPI
Logic:
- Fetch tin tức từ NewsAPI với categories khác nhau
- Lấy 20 tin tức mới nhất và hot nhất
- Filter và validate articles
- Handle errors và loading states
*/

import { ref } from 'vue'

export function useNews() {
  const news = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // NewsAPI configuration
  const NEWS_API_KEY = 'YOUR_NEWS_API_KEY' // Cần thay bằng key thực
  const NEWS_API_BASE_URL = 'https://newsapi.org/v2'

  // Load tin tức từ NewsAPI
  const loadNews = async (category = 'general', country = 'us') => {
    isLoading.value = true
    error.value = null

    try {
      // Fetch top headlines
      const headlinesUrl = `${NEWS_API_BASE_URL}/top-headlines?country=${country}&category=${category}&pageSize=20&apiKey=${NEWS_API_KEY}`
      
      const response = await fetch(headlinesUrl)
      
      if (!response.ok) {
        throw new Error(`NewsAPI Error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to fetch news')
      }

      // Filter và validate articles
      const validArticles = data.articles
        .filter(article => isValidArticle(article))
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
      news.value = []
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Load mixed news từ multiple categories
  const loadMixedNews = async () => {
    isLoading.value = true
    error.value = null

    try {
      const categories = ['general', 'technology', 'business', 'entertainment', 'sports']
      const newsPromises = categories.map(async category => {
        try {
          const url = `${NEWS_API_BASE_URL}/top-headlines?country=us&category=${category}&pageSize=4&apiKey=${NEWS_API_KEY}`
          const response = await fetch(url)
          
          if (response.ok) {
            const data = await response.json()
            return data.articles
              .filter(article => isValidArticle(article))
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
          }
          return []
        } catch {
          return []
        }
      })

      const results = await Promise.all(newsPromises)
      const allNews = results.flat()

      // Shuffle và lấy 20 articles
      const shuffledNews = shuffleArray(allNews).slice(0, 20)
      
      // Sort theo publishedAt mới nhất
      shuffledNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

      news.value = shuffledNews
      return shuffledNews

    } catch (err) {
      error.value = err
      news.value = []
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Search news
  const searchNews = async (query, sortBy = 'publishedAt') => {
    if (!query?.trim()) return []

    isLoading.value = true
    error.value = null

    try {
      const searchUrl = `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=${sortBy}&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`
      
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status !== 'ok') {
        throw new Error(data.message || 'Search failed')
      }

      const searchResults = data.articles
        .filter(article => isValidArticle(article))
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

  // Validate article
  const isValidArticle = (article) => {
    return article &&
           article.title &&
           article.title !== '[Removed]' &&
           article.url &&
           article.source &&
           article.publishedAt &&
           article.title.length > 10
  }

  // Generate unique ID cho article
  const generateArticleId = (article) => {
    const titleHash = article.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
    const timeHash = new Date(article.publishedAt).getTime().toString().slice(-6)
    return `${titleHash}_${timeHash}`
  }

  // Shuffle array utility
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Format time
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

  // Get category emoji
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

  // Get category color
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