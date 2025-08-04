/*
functions/index.js - Auto News Posting System with Server-side Classification
Firebase Cloud Functions tự động đăng bài viết tin tức với tích hợp classification
Logic:
- Tích hợp server-side classification service cho auto posts
- Tự động classify và gán Tags cho news posts
- Enhanced: Retry mechanism, caption validation, source prioritization
- Optimized: Constants consolidation, better error handling, source quality filtering
- Professional: Focused categories, reliable news sources, production-ready code
*/

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')

// Import server-side classification service
const { classifyPost } = require('./classificationService')

// Initialize Firebase Admin SDK
admin.initializeApp()

// Firestore database reference
const db = admin.firestore()
db.settings({databaseId: 'social-media-db'})

// =============================================================================
// CONSTANTS CONSOLIDATION
// =============================================================================

const CONFIG = {
  // NewsAPI
  NEWS_API_KEY: functions.config().newsapi?.key,
  NEWS_API_BASE_URL: 'https://newsapi.org/v2',
  
  // News Bot
  NEWS_BOT_USER_ID: '1L64HAlhZZg3GSGjHtmq4B7i6Kh1',
  NEWS_BOT_FALLBACK: {
    UserName: 'News Bot',
    Email: 'news@system.auto',
    Avatar: null
  },
  
  // Content limits
  MAX_CAPTION_LENGTH: 500,
  MAX_TITLE_LENGTH: 200,
  ARTICLE_AGE_HOURS: 48, // Giảm từ 48 xuống 48 giờ
  RECENT_POSTS_CHECK: 30, // Giảm từ 50 xuống 30
  
  // Categories - Focused on high-quality tech news
  CATEGORIES: ['technology', 'business'],
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  
  // Premium news sources for better content quality
  PRIORITY_SOURCES: [
    'techcrunch.com',
    'theverge.com',
    'arstechnica.com',
    'wired.com',
    'engadget.com',
    'venturebeat.com',
    'reuters.com',
    'bbc.com',
    'cnn.com'
  ]
}

// =============================================================================
// CORE AUTO POSTING FUNCTION
// =============================================================================

exports.autoPostNews = functions.pubsub
  .schedule('0 * * * *') // Chạy mỗi giờ
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    return await executeNewsPosting('scheduled')
  })

// =============================================================================
// SHARED NEWS POSTING LOGIC
// =============================================================================

const executeNewsPosting = async (trigger = 'manual') => {
  try {
    // Validate API key
    if (!CONFIG.NEWS_API_KEY) {
      throw new Error('NewsAPI key not configured')
    }

    // Load News Bot user info
    const newsBotInfo = await loadNewsBotInfo()
    
    // Find suitable article
    const selectedArticle = await findSuitableArticle()
    
    if (!selectedArticle) {
      console.log(`No suitable articles found - ${trigger} trigger`)
      return { success: true, message: 'NO_ARTICLES_FOUND' }
    }

    // Create post
    const result = await createNewsPost(selectedArticle, newsBotInfo)
    
    console.log(`Auto news post completed - ${trigger} trigger:`, {
      postId: result.PostID,
      title: selectedArticle.title?.substring(0, 50) + '...',
      source: selectedArticle.source?.name
    })
    
    return { 
      success: true, 
      message: 'POST_CREATED',
      postId: result.PostID,
      trigger
    }

  } catch (error) {
    console.error(`Error in auto news posting (${trigger}):`, error.message)
    return { success: false, error: error.message, trigger }
  }
}

// =============================================================================
// NEWS BOT USER MANAGEMENT
// =============================================================================

const loadNewsBotInfo = async () => {
  try {
    const userDoc = await db.collection('users').doc(CONFIG.NEWS_BOT_USER_ID).get()
    
    if (userDoc.exists) {
      const userData = userDoc.data()
      return {
        UserName: userData.UserName || CONFIG.NEWS_BOT_FALLBACK.UserName,
        Email: userData.Email || CONFIG.NEWS_BOT_FALLBACK.Email,
        Avatar: userData.Avatar || CONFIG.NEWS_BOT_FALLBACK.Avatar
      }
    }
    
    // Return fallback without creating - News Bot should exist
    console.warn('News Bot user not found, using fallback')
    return CONFIG.NEWS_BOT_FALLBACK
    
  } catch (error) {
    console.error('Error loading News Bot info:', error.message)
    return CONFIG.NEWS_BOT_FALLBACK
  }
}

// =============================================================================
// ARTICLE DISCOVERY & FILTERING
// =============================================================================

const findSuitableArticle = async () => {
  for (const category of CONFIG.CATEGORIES) {
    const articles = await fetchLatestNewsWithRetry(category)
    
    if (articles.length === 0) continue
    
    // Sort by source priority first, then by publishedAt
    const prioritizedArticles = prioritizeArticlesBySource(articles)
    
    for (const article of prioritizedArticles) {
      if (await isArticleSuitable(article)) {
        return article
      }
    }
  }
  
  return null
}

const fetchLatestNewsWithRetry = async (category, retryCount = 0) => {
  try {
    const url = `${CONFIG.NEWS_API_BASE_URL}/top-headlines?category=${category}&country=us&pageSize=10&apiKey=${CONFIG.NEWS_API_KEY}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`NewsAPI HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI Error: ${data.message || 'Unknown error'}`)
    }

    return data.articles || []
    
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} for category ${category}`)
      await delay(CONFIG.RETRY_DELAY_MS * (retryCount + 1))
      return await fetchLatestNewsWithRetry(category, retryCount + 1)
    }
    
    console.error(`Failed to fetch news for ${category} after ${CONFIG.MAX_RETRIES} retries:`, error.message)
    return []
  }
}

const prioritizeArticlesBySource = (articles) => {
  return articles.sort((a, b) => {
    const aSourcePriority = getSourcePriority(a.source?.name)
    const bSourcePriority = getSourcePriority(b.source?.name)
    
    if (aSourcePriority !== bSourcePriority) {
      return aSourcePriority - bSourcePriority // Lower number = higher priority
    }
    
    // If same priority, sort by publishedAt (newer first)
    const aTime = new Date(a.publishedAt || 0)
    const bTime = new Date(b.publishedAt || 0)
    return bTime - aTime
  })
}

const getSourcePriority = (sourceName) => {
  if (!sourceName) return 999
  
  const sourceUrl = sourceName.toLowerCase()
  const priorityIndex = CONFIG.PRIORITY_SOURCES.findIndex(source => 
    sourceUrl.includes(source.replace('.com', '')) || sourceUrl.includes(source)
  )
  
  return priorityIndex === -1 ? 100 : priorityIndex // Priority sources get 0-8, others get 100
}

// =============================================================================
// ARTICLE VALIDATION
// =============================================================================

const isArticleSuitable = async (article) => {
  return isValidArticle(article) && 
         isArticleRecent(article) && 
         !(await isArticleAlreadyPosted(article))
}

const isValidArticle = (article) => {
  if (!article?.title || !article?.url || !article?.source?.name) {
    return false
  }
  
  if (article.title.length < 10 || article.title.length > CONFIG.MAX_TITLE_LENGTH) {
    return false
  }
  
  // Filter out articles with generic or poor titles
  const poorTitleIndicators = ['[removed]', '[deleted]', 'click here', 'you won\'t believe']
  const titleLower = article.title.toLowerCase()
  
  return !poorTitleIndicators.some(indicator => titleLower.includes(indicator))
}

const isArticleRecent = (article) => {
  if (!article.publishedAt) {
    return false // Strict validation - require publishedAt
  }
  
  try {
    const publishedTime = new Date(article.publishedAt)
    const now = new Date()
    const hoursSincePublished = (now - publishedTime) / (1000 * 60 * 60)
    
    return hoursSincePublished <= CONFIG.ARTICLE_AGE_HOURS
  } catch (error) {
    return false // Strict validation on error
  }
}

const isArticleAlreadyPosted = async (article) => {
  try {
    const recentPostsQuery = await db
      .collection('posts')
      .where('UserID', '==', CONFIG.NEWS_BOT_USER_ID)
      .orderBy('Created', 'desc')
      .limit(CONFIG.RECENT_POSTS_CHECK)
      .get()

    if (recentPostsQuery.empty) return false

    const recentPosts = recentPostsQuery.docs.map(doc => doc.data())

    // URL-based duplicate check (primary)
    if (article.url) {
      const urlExists = recentPosts.some(post => 
        post.Caption?.includes(article.url)
      )
      if (urlExists) return true
    }

    // Title-based duplicate check (secondary)
    if (article.title && article.title.length > 20) {
      const normalizedTitle = normalizeString(article.title)
      
      const titleExists = recentPosts.some(post => {
        const normalizedCaption = normalizeString(post.Caption || '')
        return normalizedCaption.includes(normalizedTitle)
      })
      
      if (titleExists) return true
    }

    return false
  } catch (error) {
    console.error('Error checking duplicate articles:', error.message)
    return false // Allow posting on error
  }
}

const normalizeString = (str) => {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// =============================================================================
// POST CREATION WITH SERVER-SIDE CLASSIFICATION
// =============================================================================

const createNewsPost = async (article, newsBotInfo) => {
  const caption = formatNewsCaption(article)
  
  // Validate caption length
  if (caption.length > CONFIG.MAX_CAPTION_LENGTH) {
    throw new Error(`Caption too long: ${caption.length} > ${CONFIG.MAX_CAPTION_LENGTH}`)
  }

  // Classify caption using server-side classification service
  let tags = null
  try {
    const classificationResult = classifyPost(caption)
    if (classificationResult && classificationResult.length > 0) {
      tags = classificationResult
      console.log('Auto post classified with tags:', tags)
    } else {
      console.log('No classification tags found for auto post')
    }
  } catch (classificationError) {
    console.error('Classification failed for auto post:', classificationError)
    // Continue without tags rather than failing the post
  }

  const postData = {
    UserID: CONFIG.NEWS_BOT_USER_ID,
    UserName: newsBotInfo.UserName,
    Avatar: newsBotInfo.Avatar,
    Caption: caption,
    Created: admin.firestore.FieldValue.serverTimestamp(),
    MediaType: article.urlToImage ? 'image' : null,
    MediaURL: article.urlToImage || null,
    likes: 0,
    comments: 0,
    // Include Tags from server-side classification
    Tags: tags
  }

  const docRef = await db.collection('posts').add(postData)
  
  console.log('News post created with classification:', {
    PostID: docRef.id,
    UserID: CONFIG.NEWS_BOT_USER_ID,
    UserName: newsBotInfo.UserName,
    Tags: tags
  })

  return {
    PostID: docRef.id,
    ...postData
  }
}

const formatNewsCaption = (article) => {
  const title = article.title || 'No Title'
  const description = article.description || 'No Description'
  const sourceName = article.source?.name || 'Unknown Source'
  const publishedAt = article.publishedAt ? formatPublishTime(article.publishedAt) : 'Unknown Time'
  const url = article.url || ''

  // Optimized caption format
  const caption = `${title}

${description}

📰 ${sourceName} | 🕒 ${publishedAt}

${url}`

  return caption
}

const formatPublishTime = (isoString) => {
  try {
    const date = new Date(isoString)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    
    return `${hours}:${minutes}, ${day}/${month}/${year}`
  } catch (error) {
    return 'Invalid Date'
  }
}

// =============================================================================
// MANUAL TRIGGER ENDPOINT
// =============================================================================

exports.triggerNewsPost = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    const result = await executeNewsPosting('manual')
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        postId: result.postId || null,
        trigger: result.trigger
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        trigger: result.trigger
      })
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      trigger: 'manual'
    })
  }
})

// =============================================================================
// MONITORING ENDPOINT
// =============================================================================

exports.getRecentNewsPosts = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  
  try {
    const recentPosts = await db
      .collection('posts')
      .where('UserID', '==', CONFIG.NEWS_BOT_USER_ID)
      .orderBy('Created', 'desc')
      .limit(10)
      .get()

    const posts = recentPosts.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      Created: doc.data().Created?.toDate?.() || doc.data().Created
    }))

    res.status(200).json({
      success: true,
      count: posts.length,
      posts: posts,
      config: {
        categories: CONFIG.CATEGORIES,
        maxCaptionLength: CONFIG.MAX_CAPTION_LENGTH,
        articleAgeHours: CONFIG.ARTICLE_AGE_HOURS
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message
    })
  }
})

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))