/*
functions/index.js - Firebase Functions với News API endpoints
Firebase Cloud Functions với news proxy endpoints để tránh lỗi 426
Logic: Proxy NewsAPI requests qua server-side để bypass CORS restrictions
*/

const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Import server-side classification service
const { classifyPost } = require('./classificationService')

// Initialize Firebase Admin SDK
admin.initializeApp()

// Firestore database reference
const db = admin.firestore()
db.settings({databaseId: 'social-media-db'})

// NewsAPI configuration
const NEWS_API_KEY = functions.config().newsapi?.key
const NEWS_API_BASE_URL = 'https://newsapi.org/v2'

// =============================================================================
// NEWS API ENDPOINTS
// =============================================================================

// Get news by category
exports.getNews = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    if (!NEWS_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'NewsAPI key not configured'
      })
      return
    }

    const category = req.query.category || 'general'
    const country = req.query.country || 'us'
    const pageSize = req.query.pageSize || '20'

    const newsUrl = `${NEWS_API_BASE_URL}/top-headlines?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`
    
    const fetch = (await import('node-fetch')).default
    const response = await fetch(newsUrl)
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error(data.message || 'Failed to fetch news')
    }

    res.status(200).json({
      success: true,
      articles: data.articles,
      totalResults: data.totalResults
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get mixed news from multiple categories
exports.getMixedNews = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    if (!NEWS_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'NewsAPI key not configured'
      })
      return
    }

    const categories = ['general', 'technology', 'business', 'entertainment', 'sports']
    const fetch = (await import('node-fetch')).default
    
    const newsPromises = categories.map(async category => {
      try {
        const url = `${NEWS_API_BASE_URL}/top-headlines?country=us&category=${category}&pageSize=6&apiKey=${NEWS_API_KEY}`
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'ok') {
            return data.articles.map(article => ({
              ...article,
              category: category
            }))
          }
        }
        return []
      } catch {
        return []
      }
    })

    const results = await Promise.all(newsPromises)
    const allNews = results.flat()

    res.status(200).json({
      success: true,
      articles: allNews,
      totalResults: allNews.length
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Search news
exports.searchNews = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    if (!NEWS_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'NewsAPI key not configured'
      })
      return
    }

    const query = req.query.q
    const sortBy = req.query.sortBy || 'publishedAt'
    const pageSize = req.query.pageSize || '20'

    if (!query) {
      res.status(400).json({
        success: false,
        error: 'Search query is required'
      })
      return
    }

    const searchUrl = `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=${sortBy}&pageSize=${pageSize}&language=en&apiKey=${NEWS_API_KEY}`
    
    const fetch = (await import('node-fetch')).default
    const response = await fetch(searchUrl)
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error(data.message || 'Search failed')
    }

    res.status(200).json({
      success: true,
      articles: data.articles,
      totalResults: data.totalResults
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// =============================================================================
// EXISTING ENDPOINTS (Keep unchanged)
// =============================================================================

// Placeholder endpoint for future features
exports.systemInfo = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    res.status(200).json({
      success: true,
      message: 'System running normally',
      timestamp: new Date().toISOString(),
      features: {
        autoPosting: false,
        classification: true,
        userManagement: true,
        newsProxy: true
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message
    })
  }
})

// Classification endpoint for testing
exports.classifyText = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    const { text } = req.body
    
    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid text parameter'
      })
      return
    }

    const result = classifyPost(text)
    
    res.status(200).json({
      success: true,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      tags: result,
      tagCount: result.length
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message
    })
  }
})