/*
functions/index.js - Auto News Posting System with Diversified Categories
Firebase Cloud Functions tự động đăng bài viết tin tức đa dạng chủ đề
Logic:
- Đa dạng hóa categories: sports, entertainment, health, science, technology
- Rotation system để đảm bảo balance giữa các chủ đề
- Enhanced source filtering cho từng category
- Improved caption formatting cho từng loại tin tức
- Category-specific validation và content quality checks
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
// DIVERSIFIED CONSTANTS CONFIGURATION
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
  ARTICLE_AGE_HOURS: 24, // Giảm xuống 24 giờ để có nội dung fresh hơn
  RECENT_POSTS_CHECK: 40,
  
  // DIVERSIFIED CATEGORIES - Balanced mix of topics
  CATEGORIES: [
    'sports',        // Thể thao - 20%
    'entertainment', // Giải trí/Âm nhạc - 20%
    'health',        // Sức khỏe/Y tế - 15%
    'science',       // Khoa học/Công nghệ - 15%
    'technology',    // Công nghệ - 15%
    'business',      // Kinh tế/Kinh doanh - 15%
  ],
  
  // Category rotation để đảm bảo diversity
  CATEGORY_ROTATION_STORAGE_KEY: 'last_posted_category',
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  
  // Category-specific premium sources
  CATEGORY_SOURCES: {
    sports: [
      'espn.com',
      'bbc.com/sport',
      'reuters.com',
      'cnn.com',
      'bleacherreport.com'
    ],
    entertainment: [
      'variety.com',
      'hollywoodreporter.com',
      'billboard.com',
      'entertainment-weekly.com',
      'rolling-stone.com',
      'bbc.com'
    ],
    health: [
      'webmd.com',
      'healthline.com',
      'mayoclinic.org',
      'reuters.com',
      'bbc.com',
      'cnn.com'
    ],
    science: [
      'sciencedaily.com',
      'nature.com',
      'newscientist.com',
      'scientific-american.com',
      'reuters.com',
      'bbc.com'
    ],
    technology: [
      'techcrunch.com',
      'theverge.com',
      'arstechnica.com',
      'wired.com',
      'engadget.com',
      'venturebeat.com'
    ],
    business: [
      'reuters.com',
      'bloomberg.com',
      'cnbc.com',
      'marketwatch.com',
      'bbc.com',
      'cnn.com'
    ]
  }
}

// =============================================================================
// CORE AUTO POSTING FUNCTION WITH CATEGORY ROTATION
// =============================================================================

exports.autoPostNews = functions.pubsub
  .schedule('0 */2 * * *') // Chạy mỗi 2 giờ để có thời gian đa dạng hơn
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    return await executeNewsPosting('scheduled')
  })

// =============================================================================
// ENHANCED NEWS POSTING LOGIC WITH CATEGORY DIVERSITY
// =============================================================================

const executeNewsPosting = async (trigger = 'manual') => {
  try {
    // Validate API key
    if (!CONFIG.NEWS_API_KEY) {
      throw new Error('NewsAPI key not configured')
    }

    // Load News Bot user info
    const newsBotInfo = await loadNewsBotInfo()
    
    // Get next category using rotation system
    const selectedCategory = await getNextCategory()
    
    // Find suitable article from selected category
    const selectedArticle = await findSuitableArticleFromCategory(selectedCategory)
    
    if (!selectedArticle) {
      console.log(`No suitable articles found for category: ${selectedCategory} - ${trigger} trigger`)
      // Try fallback với category khác
      const fallbackArticle = await findFallbackArticle(selectedCategory)
      
      if (!fallbackArticle) {
        return { success: true, message: 'NO_ARTICLES_FOUND', category: selectedCategory }
      }
      
      // Use fallback article
      const result = await createNewsPost(fallbackArticle, newsBotInfo, selectedCategory)
      await updateCategoryRotation(selectedCategory)
      
      return { 
        success: true, 
        message: 'FALLBACK_POST_CREATED',
        postId: result.PostID,
        category: selectedCategory,
        trigger
      }
    }

    // Create post với selected article
    const result = await createNewsPost(selectedArticle, newsBotInfo, selectedCategory)
    
    // Update category rotation
    await updateCategoryRotation(selectedCategory)
    
    console.log(`Diversified auto news post completed - ${trigger} trigger:`, {
      postId: result.PostID,
      category: selectedCategory,
      title: selectedArticle.title?.substring(0, 50) + '...',
      source: selectedArticle.source?.name
    })
    
    return { 
      success: true, 
      message: 'POST_CREATED',
      postId: result.PostID,
      category: selectedCategory,
      trigger
    }

  } catch (error) {
    console.error(`Error in diversified auto news posting (${trigger}):`, error.message)
    return { success: false, error: error.message, trigger }
  }
}

// =============================================================================
// CATEGORY ROTATION SYSTEM
// =============================================================================

const getNextCategory = async () => {
  try {
    // Sử dụng News Bot user document để lưu category rotation info
    const newsBotDoc = await db.collection('users').doc(CONFIG.NEWS_BOT_USER_ID).get()
    
    let lastCategory = null
    let categoryHistory = []
    
    if (newsBotDoc.exists) {
      const data = newsBotDoc.data()
      lastCategory = data.lastPostedCategory
      categoryHistory = data.categoryHistory || []
    }
    
    // Tìm category tiếp theo theo rotation logic
    const nextCategory = selectNextCategory(lastCategory, categoryHistory)
    
    console.log('Category rotation:', {
      lastCategory,
      selectedCategory: nextCategory,
      recentHistory: categoryHistory.slice(-3)
    })
    
    return nextCategory
    
  } catch (error) {
    console.error('Error in category rotation:', error)
    // Fallback to random category
    return CONFIG.CATEGORIES[Math.floor(Math.random() * CONFIG.CATEGORIES.length)]
  }
}

const selectNextCategory = (lastCategory, categoryHistory) => {
  // Nếu chưa có history, bắt đầu với sports
  if (!lastCategory) {
    return 'sports'
  }
  
  // Get recent categories (last 3 posts) để tránh repeat
  const recentCategories = categoryHistory.slice(-3)
  
  // Filter ra categories chưa được dùng gần đây
  const availableCategories = CONFIG.CATEGORIES.filter(cat => 
    !recentCategories.includes(cat)
  )
  
  // Nếu tất cả categories đã dùng gần đây, reset và chọn random
  if (availableCategories.length === 0) {
    return CONFIG.CATEGORIES[Math.floor(Math.random() * CONFIG.CATEGORIES.length)]
  }
  
  // Weighted selection để ưu tiên các category ít được post
  const categoryWeights = {
    'sports': 20,        // Thể thao - cao nhất
    'entertainment': 20, // Giải trí - cao nhất  
    'health': 15,        // Sức khỏe
    'science': 15,       // Khoa học
    'technology': 15,    // Công nghệ - giảm từ trước
    'business': 15       // Kinh doanh - giảm từ trước
  }
  
  // Calculate weighted random selection
  const weightedCategories = availableCategories.map(cat => ({
    category: cat,
    weight: categoryWeights[cat] || 10
  }))
  
  const totalWeight = weightedCategories.reduce((sum, item) => sum + item.weight, 0)
  const random = Math.random() * totalWeight
  
  let currentWeight = 0
  for (const item of weightedCategories) {
    currentWeight += item.weight
    if (random <= currentWeight) {
      return item.category
    }
  }
  
  // Fallback
  return availableCategories[0]
}

const updateCategoryRotation = async (postedCategory) => {
  try {
    // Sử dụng News Bot user document để lưu category rotation info
    const newsBotRef = db.collection('users').doc(CONFIG.NEWS_BOT_USER_ID)
    const newsBotDoc = await newsBotRef.get()
    
    let categoryHistory = []
    if (newsBotDoc.exists) {
      const data = newsBotDoc.data()
      categoryHistory = data.categoryHistory || []
    }
    
    // Add new category to history
    categoryHistory.push(postedCategory)
    
    // Keep only last 10 entries
    if (categoryHistory.length > 10) {
      categoryHistory = categoryHistory.slice(-10)
    }
    
    // Update News Bot user document với category rotation info
    await newsBotRef.set({
      lastPostedCategory: postedCategory,
      categoryHistory: categoryHistory,
      lastCategoryUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    
  } catch (error) {
    console.error('Error updating category rotation:', error)
  }
}

// =============================================================================
// CATEGORY-SPECIFIC ARTICLE DISCOVERY
// =============================================================================

const findSuitableArticleFromCategory = async (category) => {
  const articles = await fetchLatestNewsWithRetry(category)
  
  if (articles.length === 0) return null
  
  // Sort by category-specific source priority
  const prioritizedArticles = prioritizeArticlesBySourceForCategory(articles, category)
  
  for (const article of prioritizedArticles) {
    if (await isArticleSuitableForCategory(article, category)) {
      return article
    }
  }
  
  return null
}

const findFallbackArticle = async (excludeCategory) => {
  // Try other categories as fallback
  const fallbackCategories = CONFIG.CATEGORIES.filter(cat => cat !== excludeCategory)
  
  for (const category of fallbackCategories) {
    const articles = await fetchLatestNewsWithRetry(category)
    
    if (articles.length > 0) {
      const prioritizedArticles = prioritizeArticlesBySourceForCategory(articles, category)
      
      for (const article of prioritizedArticles) {
        if (await isArticleSuitableForCategory(article, category)) {
          return article
        }
      }
    }
  }
  
  return null
}

const prioritizeArticlesBySourceForCategory = (articles, category) => {
  const categorySources = CONFIG.CATEGORY_SOURCES[category] || []
  
  return articles.sort((a, b) => {
    const aSourcePriority = getSourcePriorityForCategory(a.source?.name, categorySources)
    const bSourcePriority = getSourcePriorityForCategory(b.source?.name, categorySources)
    
    if (aSourcePriority !== bSourcePriority) {
      return aSourcePriority - bSourcePriority
    }
    
    // Same priority → sort by publishedAt
    const aTime = new Date(a.publishedAt || 0)
    const bTime = new Date(b.publishedAt || 0)
    return bTime - aTime
  })
}

const getSourcePriorityForCategory = (sourceName, categorySources) => {
  if (!sourceName) return 999
  
  const sourceUrl = sourceName.toLowerCase()
  const priorityIndex = categorySources.findIndex(source => 
    sourceUrl.includes(source.replace('.com', '')) || sourceUrl.includes(source)
  )
  
  return priorityIndex === -1 ? 100 : priorityIndex
}

// =============================================================================
// CATEGORY-SPECIFIC ARTICLE VALIDATION
// =============================================================================

const isArticleSuitableForCategory = async (article, category) => {
  return isValidArticleForCategory(article, category) && 
         isArticleRecent(article) && 
         !(await isArticleAlreadyPosted(article))
}

const isValidArticleForCategory = (article, category) => {
  if (!isValidArticle(article)) return false
  
  // Category-specific validation
  const title = article.title.toLowerCase()
  const description = (article.description || '').toLowerCase()
  const content = title + ' ' + description
  
  // Category-specific keyword validation
  const categoryKeywords = {
    sports: ['sport', 'game', 'match', 'team', 'player', 'championship', 'tournament', 'football', 'basketball', 'tennis', 'olympic'],
    entertainment: ['movie', 'film', 'music', 'concert', 'album', 'celebrity', 'actor', 'singer', 'entertainment', 'show', 'award'],
    health: ['health', 'medical', 'doctor', 'hospital', 'medicine', 'treatment', 'disease', 'virus', 'vaccine', 'fitness'],
    science: ['science', 'research', 'study', 'discovery', 'technology', 'space', 'climate', 'environment', 'scientist'],
    technology: ['tech', 'software', 'app', 'smartphone', 'computer', 'AI', 'digital', 'internet', 'innovation'],
    business: ['business', 'company', 'economy', 'market', 'finance', 'investment', 'stock', 'revenue', 'profit']
  }
  
  const keywords = categoryKeywords[category] || []
  const hasRelevantKeywords = keywords.some(keyword => content.includes(keyword))
  
  // Flexible validation - nếu từ nguồn tin uy tín thì ít strict hơn
  const trustedSources = CONFIG.CATEGORY_SOURCES[category] || []
  const isFromTrustedSource = trustedSources.some(source => 
    (article.source?.name || '').toLowerCase().includes(source.replace('.com', ''))
  )
  
  return hasRelevantKeywords || isFromTrustedSource
}

// =============================================================================
// EXISTING HELPER FUNCTIONS (kept same)
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
    
    console.warn('News Bot user not found, using fallback')
    return CONFIG.NEWS_BOT_FALLBACK
    
  } catch (error) {
    console.error('Error loading News Bot info:', error.message)
    return CONFIG.NEWS_BOT_FALLBACK
  }
}

const fetchLatestNewsWithRetry = async (category, retryCount = 0) => {
  try {
    const url = `${CONFIG.NEWS_API_BASE_URL}/top-headlines?category=${category}&country=us&pageSize=15&apiKey=${CONFIG.NEWS_API_KEY}`
    
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

const isValidArticle = (article) => {
  if (!article?.title || !article?.url || !article?.source?.name) {
    return false
  }
  
  if (article.title.length < 10 || article.title.length > CONFIG.MAX_TITLE_LENGTH) {
    return false
  }
  
  const poorTitleIndicators = ['[removed]', '[deleted]', 'click here', 'you won\'t believe']
  const titleLower = article.title.toLowerCase()
  
  return !poorTitleIndicators.some(indicator => titleLower.includes(indicator))
}

const isArticleRecent = (article) => {
  if (!article.publishedAt) return false
  
  try {
    const publishedTime = new Date(article.publishedAt)
    const now = new Date()
    const hoursSincePublished = (now - publishedTime) / (1000 * 60 * 60)
    
    return hoursSincePublished <= CONFIG.ARTICLE_AGE_HOURS
  } catch (error) {
    return false
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

    if (article.url) {
      const urlExists = recentPosts.some(post => 
        post.Caption?.includes(article.url)
      )
      if (urlExists) return true
    }

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
    return false
  }
}

const normalizeString = (str) => {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// =============================================================================
// ENHANCED POST CREATION WITH CATEGORY CONTEXT
// =============================================================================

const createNewsPost = async (article, newsBotInfo, category) => {
  const caption = formatNewsCaptionForCategory(article, category)
  
  if (caption.length > CONFIG.MAX_CAPTION_LENGTH) {
    throw new Error(`Caption too long: ${caption.length} > ${CONFIG.MAX_CAPTION_LENGTH}`)
  }

  // Server-side classification
  let tags = null
  try {
    const classificationResult = classifyPost(caption)
    if (classificationResult && classificationResult.length > 0) {
      tags = classificationResult
      console.log(`Auto post (${category}) classified with tags:`, tags)
    }
  } catch (classificationError) {
    console.error('Classification failed for auto post:', classificationError)
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
    Tags: tags,
    // Add category metadata
    SourceCategory: category,
    SourceName: article.source?.name
  }

  const docRef = await db.collection('posts').add(postData)
  
  console.log('Diversified news post created:', {
    PostID: docRef.id,
    Category: category,
    Tags: tags,
    Source: article.source?.name
  })

  return {
    PostID: docRef.id,
    ...postData
  }
}

const formatNewsCaptionForCategory = (article, category) => {
  const title = article.title || 'No Title'
  const description = article.description || 'No Description'
  const sourceName = article.source?.name || 'Unknown Source'
  const publishedAt = article.publishedAt ? formatPublishTime(article.publishedAt) : 'Unknown Time'
  const url = article.url || ''

  // Category-specific emojis
  const categoryEmojis = {
    sports: '⚽',
    entertainment: '🎬', 
    health: '🏥',
    science: '🔬',
    technology: '💻',
    business: '💼'
  }

  const categoryEmoji = categoryEmojis[category] || '📰'

  const caption = `${title}

${description}

${categoryEmoji} ${sourceName} | 🕒 ${publishedAt}

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
// ENHANCED ENDPOINTS
// =============================================================================

exports.triggerNewsPost = functions.https.onRequest(async (req, res) => {
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
        category: result.category,
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

exports.getRecentNewsPosts = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  
  try {
    const recentPosts = await db
      .collection('posts')
      .where('UserID', '==', CONFIG.NEWS_BOT_USER_ID)
      .orderBy('Created', 'desc')
      .limit(15)
      .get()

    const posts = recentPosts.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      Created: doc.data().Created?.toDate?.() || doc.data().Created
    }))

    // Category distribution stats
    const categoryStats = {}
    posts.forEach(post => {
      const category = post.SourceCategory || 'unknown'
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })

    res.status(200).json({
      success: true,
      count: posts.length,
      posts: posts,
      categoryDistribution: categoryStats,
      config: {
        categories: CONFIG.CATEGORIES,
        categoryRotation: true,
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