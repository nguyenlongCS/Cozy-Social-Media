/*
functions/index.js - Cloud Functions Auto News Posting System
Firebase Cloud Functions để tự động đăng bài viết tin tức 24/7
Logic:
- Schedule function chạy mỗi giờ với Cloud Scheduler
- Fetch tin tức mới từ NewsAPI
- Kiểm tra duplicate với posts đã có
- Tạo post tự động vào Firestore collection 'posts'
- Error handling và logging cho monitoring
- Không phụ thuộc vào client application
*/

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')

// Initialize Firebase Admin SDK
admin.initializeApp()

// Firestore database reference với database name chính xác
const db = admin.firestore()
// Set database name cho named database
db.settings({databaseId: 'social-media-db'})

// NewsAPI configuration
const NEWS_API_KEY = functions.config().newsapi.key
const NEWS_API_BASE_URL = 'https://newsapi.org/v2'

// News Bot configuration - User đã tồn tại trong collection users
const NEWS_BOT_USER_ID = '1L64HAlhZZg3GSGjHtmq4B7i6Kh1'

// Cloud Function chạy mỗi giờ để post tin tức tự động
exports.autoPostNews = functions.pubsub
  .schedule('0 * * * *') // Chạy mỗi giờ đúng phút 0
  .timeZone('Asia/Ho_Chi_Minh') // Timezone Việt Nam
  .onRun(async (context) => {
    console.log('Starting automated news posting...')
    
    try {
      // Check API key configuration
      if (!NEWS_API_KEY) {
        console.error('NewsAPI key not configured in Firebase Functions config')
        return null
      }

      // Load News Bot user info từ Firestore
      const newsBotInfo = await loadNewsBotInfo()
      if (!newsBotInfo) {
        console.error('Failed to load News Bot user info')
        return null
      }

      // Fetch latest news từ multiple categories
      const categories = ['technology', 'business', 'science', 'general']
      let selectedArticle = null

      for (const category of categories) {
        console.log(`Fetching news from category: ${category}`)
        
        const articles = await fetchLatestNews(category, 5)
        if (!articles || articles.length === 0) {
          console.log(`No articles found in category: ${category}`)
          continue
        }

        // Tìm article phù hợp (mới và chưa được post)
        for (const article of articles) {
          if (!isValidArticle(article)) continue
          if (!isArticleRecent(article)) continue
          
          const alreadyPosted = await isArticleAlreadyPosted(article)
          if (alreadyPosted) continue

          selectedArticle = article
          console.log(`Selected article from ${category}: ${article.title}`)
          break
        }

        if (selectedArticle) break
      }

      // Post article nếu tìm thấy
      if (selectedArticle) {
        await createNewsPost(selectedArticle, newsBotInfo)
        console.log('Auto news post completed successfully')
      } else {
        console.log('No new articles found - skipping this cycle')
      }

      return null
    } catch (error) {
      console.error('Error in auto news posting:', error)
      return null
    }
  })

// Load News Bot user info từ Firestore users collection
async function loadNewsBotInfo() {
  try {
    const userDoc = await db.collection('users').doc(NEWS_BOT_USER_ID).get()
    
    if (!userDoc.exists) {
      console.error('News Bot user not found in users collection')
      return {
        UserName: 'News',
        Email: 'news@system.auto',
        Avatar: null
      }
    }

    const userData = userDoc.data()
    console.log('News Bot loaded:', {
      UserName: userData.UserName,
      hasAvatar: !!userData.Avatar
    })

    return userData
  } catch (error) {
    console.error('Error loading News Bot info:', error)
    return {
      UserName: 'News',
      Email: 'news@system.auto',
      Avatar: null
    }
  }
}

// Fetch latest news từ NewsAPI
async function fetchLatestNews(category = 'technology', pageSize = 5) {
  try {
    const url = `${NEWS_API_BASE_URL}/top-headlines?category=${category}&country=us&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`NewsAPI Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI Status Error: ${data.message || 'Unknown error'}`)
    }

    console.log(`Fetched ${data.articles?.length || 0} articles from ${category}`)
    return data.articles || []
  } catch (error) {
    console.error(`Error fetching news from ${category}:`, error)
    return []
  }
}

// Validate article structure
function isValidArticle(article) {
  return article && 
         article.title && 
         article.title.length > 10 &&
         article.url &&
         article.source &&
         article.source.name
}

// Check xem article có đủ mới không (published trong vòng 48 giờ)
function isArticleRecent(article) {
  if (!article.publishedAt) {
    return true // Nếu không có publishedAt, coi như recent
  }
  
  try {
    const publishedTime = new Date(article.publishedAt)
    const now = new Date()
    const hoursSincePublished = (now - publishedTime) / (1000 * 60 * 60)
    
    // Cloud Functions có thể có delay, nên tăng thời gian lên 48 giờ
    const isRecent = hoursSincePublished <= 48
    
    if (!isRecent) {
      console.log(`Article too old: published ${hoursSincePublished.toFixed(1)} hours ago`)
    }
    
    return isRecent
  } catch (error) {
    console.error('Error checking article recency:', error)
    return true // Fail-safe: cho phép post nếu không check được
  }
}

// Check xem article đã được post chưa bằng cách query Firestore
async function isArticleAlreadyPosted(article) {
  try {
    // Query posts gần nhất của News Bot (50 posts)
    const recentPostsQuery = await db
      .collection('posts')
      .where('UserID', '==', NEWS_BOT_USER_ID)
      .orderBy('Created', 'desc')
      .limit(50)
      .get()

    if (recentPostsQuery.empty) {
      return false // Chưa có post nào
    }

    const recentPosts = recentPostsQuery.docs.map(doc => doc.data())

    // Check bằng URL (primary check)
    if (article.url) {
      const urlExists = recentPosts.some(post => {
        const caption = post.Caption || ''
        return caption.includes(article.url)
      })
      if (urlExists) {
        console.log('Article already posted (URL match):', article.url)
        return true
      }
    }

    // Check bằng title (fallback check)
    if (article.title) {
      const normalizedTitle = article.title.toLowerCase().replace(/[^\w\s]/g, '').trim()
      
      const titleExists = recentPosts.some(post => {
        const caption = post.Caption || ''
        const normalizedCaption = caption.toLowerCase().replace(/[^\w\s]/g, '')
        return normalizedCaption.includes(normalizedTitle) && normalizedTitle.length > 10
      })
      
      if (titleExists) {
        console.log('Article already posted (Title match):', article.title)
        return true
      }
    }

    return false // Article chưa được post
  } catch (error) {
    console.error('Error checking if article already posted:', error)
    return false // Fail-safe: cho phép post nếu không check được
  }
}

// Format news article thành caption
function formatNewsCaption(article) {
  const title = article.title || 'Không có tiêu đề'
  const content = article.content || article.description || 'Không có nội dung'
  const sourceName = article.source?.name || 'Không rõ nguồn'
  const author = article.author || 'Không rõ tác giả'
  const publishedAt = article.publishedAt ? formatPublishTime(article.publishedAt) : 'Không rõ thời gian'
  const url = article.url || ''

  // Template caption theo yêu cầu
  const caption = `${title}

${content}

📰 Nguồn: ${sourceName}
✍️ Tác giả: ${author}  
🕒 Thời gian: ${publishedAt}

${url}`

  return caption
}

// Format publish time từ ISO string
function formatPublishTime(isoString) {
  try {
    const date = new Date(isoString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${hours}:${minutes}, ${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting publish time:', error)
    return 'Không rõ thời gian'
  }
}

// Tạo post mới trong Firestore collection 'posts'
async function createNewsPost(article, newsBotInfo) {
  try {
    const caption = formatNewsCaption(article)
    
    // Tạo post data với structure giống manual posts
    const postData = {
      UserID: NEWS_BOT_USER_ID,
      UserName: newsBotInfo.UserName || 'News',
      Avatar: newsBotInfo.Avatar || null,
      Caption: caption,
      Created: admin.firestore.FieldValue.serverTimestamp(),
      MediaType: article.urlToImage ? 'image' : null,
      MediaURL: article.urlToImage || null,
      likes: 0,
      comments: 0
    }

    console.log('Creating news post:', {
      title: article.title,
      source: article.source.name,
      hasImage: !!article.urlToImage,
      userInfo: {
        UserName: postData.UserName,
        hasAvatar: !!postData.Avatar
      }
    })

    // Lưu post vào Firestore collection 'posts'
    const docRef = await db.collection('posts').add(postData)
    
    console.log('News post created successfully with ID:', docRef.id)
    
    return {
      PostID: docRef.id,
      ...postData
    }
  } catch (error) {
    console.error('Error creating news post:', error)
    throw error
  }
}

// HTTP Function để manual trigger (for testing)
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
    console.log('Manual news post triggered via HTTP')
    
    if (!NEWS_API_KEY) {
      res.status(500).json({ error: 'NewsAPI key not configured' })
      return
    }

    const newsBotInfo = await loadNewsBotInfo()
    const articles = await fetchLatestNews('technology', 3)
    
    if (!articles || articles.length === 0) {
      res.status(404).json({ error: 'No articles found' })
      return
    }

    const validArticle = articles.find(article => 
      isValidArticle(article) && isArticleRecent(article)
    )

    if (!validArticle) {
      res.status(404).json({ error: 'No valid recent articles found' })
      return
    }

    const result = await createNewsPost(validArticle, newsBotInfo)
    
    res.status(200).json({
      success: true,
      message: 'News post created successfully',
      postId: result.PostID,
      article: {
        title: validArticle.title,
        source: validArticle.source.name
      }
    })
  } catch (error) {
    console.error('Error in manual news post:', error)
    res.status(500).json({ 
      error: 'Failed to create news post',
      details: error.message 
    })
  }
})

// Function để get recent news posts (for monitoring)
exports.getRecentNewsPosts = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  
  try {
    const recentPosts = await db
      .collection('posts')
      .where('UserID', '==', NEWS_BOT_USER_ID)
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
      posts: posts
    })
  } catch (error) {
    console.error('Error getting recent news posts:', error)
    res.status(500).json({ 
      error: 'Failed to get recent posts',
      details: error.message 
    })
  }
})