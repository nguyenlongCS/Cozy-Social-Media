/*
src/composables/useNewsAPI.js
Composable xử lý tích hợp NewsAPI để tạo bài post tự động
Logic:
- Fetch tin tức mới nhất từ NewsAPI
- Format tin tức thành caption với template specified
- Tạo post tự động với user "News" (UserId: 1L64HAlhZZg3GSGjHtmq4B7i6Kh1)
- Lấy userName và avatar từ collection users
- Schedule auto-post mỗi giờ với setInterval
- Error handling cho API calls và network issues
*/
import { ref, onMounted, onUnmounted } from 'vue'
import { useFirestore } from './useFirestore'
import { useUsers } from './useUsers'
import { useErrorHandler } from './useErrorHandler'

// News Bot User ID (đã được tạo sẵn trong collection users)
const NEWS_BOT_USER_ID = '1L64HAlhZZg3GSGjHtmq4B7i6Kh1'
const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY
const NEWS_API_BASE_URL = 'https://newsapi.org/v2'

export function useNewsAPI() {
  const { createPost } = useFirestore()
  const { getUserById } = useUsers()
  const { showError } = useErrorHandler()
  
  // Reactive state
  const isLoading = ref(false)
  const error = ref(null)
  const lastPostTime = ref(null)
  const autoPostEnabled = ref(true)
  const intervalId = ref(null)
  const newsBot = ref(null) // Cache news bot user info

  // Load News Bot user info từ collection users
  const loadNewsBotInfo = async () => {
    try {
      console.log('Loading News Bot user info from Firestore...')
      const botUser = await getUserById(NEWS_BOT_USER_ID)
      
      if (botUser) {
        newsBot.value = botUser
        console.log('News Bot loaded:', {
          UserName: botUser.UserName,
          hasAvatar: !!botUser.Avatar
        })
      } else {
        console.warn('News Bot user not found in collection users')
        // Fallback info nếu không tìm thấy
        newsBot.value = {
          UserName: 'News',
          Email: 'news@system.auto',
          Avatar: null
        }
      }
    } catch (err) {
      console.error('Error loading News Bot info:', err)
      // Fallback info nếu có lỗi
      newsBot.value = {
        UserName: 'News',
        Email: 'news@system.auto', 
        Avatar: null
      }
    }
  }

  // Fetch latest news từ NewsAPI
  const fetchLatestNews = async (category = 'technology', pageSize = 5) => {
    if (!NEWS_API_KEY) {
      throw new Error('NEWS_API_KEY not configured')
    }

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

      return data.articles || []
    } catch (err) {
      console.error('Error fetching news:', err)
      throw err
    }
  }

  // Format news article thành caption theo template yêu cầu
  const formatNewsCaption = (article) => {
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
  const formatPublishTime = (isoString) => {
    try {
      const date = new Date(isoString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      
      return `${hours}:${minutes}, ${day}/${month}/${year}`
    } catch (err) {
      console.error('Error formatting publish time:', err)
      return 'Không rõ thời gian'
    }
  }

  // Check xem article đã được post chưa bằng cách query recent posts từ Firestore
  const isArticleAlreadyPosted = async (article) => {
    try {
      // Query 30 bài post gần nhất của News Bot từ Firestore
      const recentPosts = await getRecentNewsBotPosts(30)
      
      if (!recentPosts || recentPosts.length === 0) {
        return false // Chưa có bài nào
      }
      
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
        const titleExists = recentPosts.some(post => {
          const caption = post.Caption || ''
          // So sánh title (loại bỏ dấu câu và normalize)
          const normalizedTitle = article.title.toLowerCase().replace(/[^\w\s]/g, '').trim()
          const normalizedCaption = caption.toLowerCase().replace(/[^\w\s]/g, '')
          return normalizedCaption.includes(normalizedTitle) && normalizedTitle.length > 10
        })
        if (titleExists) {
          console.log('Article already posted (Title match):', article.title)
          return true
        }
      }
      
      return false // Article chưa được post
      
    } catch (err) {
      console.error('Error checking if article already posted:', err)
      // Nếu có lỗi khi check, return false để vẫn cho phép post (fail-safe)
      return false
    }
  }

  // Get recent posts của News Bot từ Firestore để check duplicate
  const getRecentNewsBotPosts = async (limitCount = 30) => {
    try {
      const { getPosts } = useFirestore()
      
      // Lấy posts gần nhất (sẽ bao gồm cả posts của News Bot và user khác)
      const allRecentPosts = await getPosts(limitCount * 2) // Lấy nhiều hơn để filter
      
      // Filter chỉ lấy posts của News Bot
      const newsBotPosts = allRecentPosts.filter(post => post.UserID === NEWS_BOT_USER_ID)
      
      console.log(`Found ${newsBotPosts.length} recent News Bot posts for duplicate check`)
      return newsBotPosts.slice(0, limitCount) // Giới hạn số lượng
      
    } catch (err) {
      console.error('Error getting recent News Bot posts:', err)
      return [] // Return empty array nếu có lỗi
    }
  }

  // Check xem article có đủ mới không (published trong vòng 6 giờ)
  const isArticleRecent = (article) => {
    if (!article.publishedAt) {
      return true // Nếu không có publishedAt, coi như recent
    }
    
    try {
      const publishedTime = new Date(article.publishedAt)
      const now = new Date()
      const hoursSincePublished = (now - publishedTime) / (1000 * 60 * 60)
      
      // Chỉ post article published trong vòng 6 giờ gần đây
      const isRecent = hoursSincePublished <= 6
      
      if (!isRecent) {
        console.log(`Article too old: published ${hoursSincePublished.toFixed(1)} hours ago`)
      }
      
      return isRecent
    } catch (err) {
      console.error('Error checking article recency:', err)
      return true // Fail-safe: cho phép post nếu không check được
    }
  }

  // Tạo một bài post tự động từ news article
  const createNewsPost = async (article) => {
    if (!article) {
      throw new Error('No article provided')
    }

    // Đảm bảo News Bot info đã được load
    if (!newsBot.value) {
      await loadNewsBotInfo()
    }

    try {
      const caption = formatNewsCaption(article)
      
      // Tạo post data với thông tin từ collection users
      const postData = {
        caption: caption,
        authorId: NEWS_BOT_USER_ID,
        authorName: newsBot.value?.UserName || 'News',
        authorEmail: newsBot.value?.Email || 'news@system.auto',
        mediaUrl: article.urlToImage || null,
        mediaType: article.urlToImage ? 'image' : null,
        createdAt: new Date(),
        likes: 0,
        comments: []
      }

      console.log('Creating news post:', {
        title: article.title,
        source: article.source?.name,
        hasImage: !!article.urlToImage,
        authorName: postData.authorName,
        hasAuthorAvatar: !!newsBot.value?.Avatar
      })

      // Lưu post vào Firestore thông qua useFirestore
      const savedPost = await createPost(postData)
      
      console.log('News post created successfully:', savedPost.PostID)
      
      return savedPost
    } catch (err) {
      console.error('Error creating news post:', err)
      throw err
    }
  }

  // Auto post tin tức mới nhất với duplicate detection
  const performAutoPost = async () => {
    if (!autoPostEnabled.value) {
      console.log('Auto posting is disabled')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      console.log('Performing auto news post with duplicate detection...')
      
      // Fetch latest news
      const articles = await fetchLatestNews('technology', 5)
      
      if (!articles || articles.length === 0) {
        console.log('No news articles found')
        return
      }

      console.log(`Fetched ${articles.length} articles, checking for duplicates...`)

      // Find first article that is both recent and not already posted
      let selectedArticle = null
      
      for (const article of articles) {
        // Validate article structure
        if (!article.title || !article.url) {
          console.log('Skipping invalid article:', article.title || 'No title')
          continue
        }
        
        // Check if article is recent (within 6 hours)
        if (!isArticleRecent(article)) {
          console.log('Skipping old article:', article.title)
          continue
        }
        
        // Check if article already posted (main duplicate detection)
        const alreadyPosted = await isArticleAlreadyPosted(article)
        if (alreadyPosted) {
          console.log('Skipping duplicate article:', article.title)
          continue
        }
        
        // Found a good article!
        selectedArticle = article
        console.log('Selected new article for posting:', article.title)
        break
      }

      // If no suitable article found, try different categories
      if (!selectedArticle) {
        console.log('No new articles in technology, trying other categories...')
        
        const alternativeCategories = ['general', 'business', 'science']
        
        for (const category of alternativeCategories) {
          console.log(`Trying category: ${category}`)
          const altArticles = await fetchLatestNews(category, 3)
          
          for (const article of altArticles) {
            if (!article.title || !article.url) continue
            if (!isArticleRecent(article)) continue
            
            const alreadyPosted = await isArticleAlreadyPosted(article)
            if (!alreadyPosted) {
              selectedArticle = article
              console.log(`Found new article in ${category}:`, article.title)
              break
            }
          }
          
          if (selectedArticle) break
        }
      }

      // Post the selected article or skip if none found
      if (selectedArticle) {
        await createNewsPost(selectedArticle)
        
        // Lưu thời gian post thành công
        saveLastPostTime()
        lastPostTime.value = new Date()
        
        console.log('Auto news post completed successfully')
      } else {
        console.log('No new articles found - skipping this posting cycle')
      }
      
    } catch (err) {
      console.error('Error during auto post:', err)
      error.value = err
      
      // Không hiển thị error alert cho auto posting để không spam user
    } finally {
      isLoading.value = false
    }
  }

  // Check xem đã đến giờ post chưa (dựa trên localStorage)
  const shouldPostNow = () => {
    try {
      const lastPostTime = localStorage.getItem('lastNewsPostTime')
      if (!lastPostTime) {
        return true // Chưa bao giờ post
      }

      const lastPost = new Date(lastPostTime)
      const now = new Date()
      const hoursSinceLastPost = (now - lastPost) / (1000 * 60 * 60)

      // Post nếu đã qua ít nhất 1 giờ
      return hoursSinceLastPost >= 1
    } catch (err) {
      console.error('Error checking last post time:', err)
      return false
    }
  }

  // Lưu thời gian post vào localStorage
  const saveLastPostTime = () => {
    try {
      localStorage.setItem('lastNewsPostTime', new Date().toISOString())
    } catch (err) {
      console.error('Error saving last post time:', err)
    }
  }

  // Khởi tạo auto posting schedule (mỗi giờ = 3600000ms)
  const startAutoPosting = () => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }

    // Kiểm tra xem có cần post ngay không (chỉ khi đã qua 1 giờ)
    setTimeout(() => {
      if (autoPostEnabled.value && shouldPostNow()) {
        performAutoPost()
      } else {
        console.log('Skipping initial post - not enough time has passed')
      }
    }, 5000) // Kiểm tra sau 5 giây

    // Schedule post mỗi giờ
    intervalId.value = setInterval(() => {
      if (autoPostEnabled.value && shouldPostNow()) {
        performAutoPost()
      }
    }, 3600000) // 1 hour = 3600000ms

    console.log('Auto news posting started - will post every hour (when needed)')
  }

  // Dừng auto posting
  const stopAutoPosting = () => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
    console.log('Auto news posting stopped')
  }

  // Toggle auto posting on/off
  const toggleAutoPosting = () => {
    autoPostEnabled.value = !autoPostEnabled.value
    
    if (autoPostEnabled.value) {
      startAutoPosting()
    } else {
      stopAutoPosting()
    }
    
    console.log('Auto posting', autoPostEnabled.value ? 'enabled' : 'disabled')
  }

  // Manual trigger cho testing
  const triggerManualPost = async () => {
    try {
      await performAutoPost()
      console.log('Manual news post triggered successfully')
    } catch (err) {
      console.error('Error in manual post:', err)
      showError(err, 'post')
    }
  }

  // Lifecycle hooks
  onMounted(async () => {
    // Load last post time từ localStorage
    try {
      const lastPostTimeStr = localStorage.getItem('lastNewsPostTime')
      if (lastPostTimeStr) {
        lastPostTime.value = new Date(lastPostTimeStr)
      }
    } catch (err) {
      console.error('Error loading last post time:', err)
    }

    // Chỉ start auto posting nếu có API key
    if (NEWS_API_KEY && NEWS_API_KEY !== 'your_newsapi_key_here') {
      // Load News Bot info trước khi bắt đầu auto posting
      await loadNewsBotInfo()
      startAutoPosting()
    } else {
      console.warn('NewsAPI key not configured - auto posting disabled')
    }
  })

  onUnmounted(() => {
    stopAutoPosting()
  })

  // Get status info
  const getAutoPostStatus = () => {
    return {
      enabled: autoPostEnabled.value,
      isLoading: isLoading.value,
      lastPostTime: lastPostTime.value,
      hasApiKey: !!NEWS_API_KEY && NEWS_API_KEY !== 'your_newsapi_key_here',
      error: error.value,
      newsBot: newsBot.value
    }
  }

  return {
    isLoading,
    error,
    lastPostTime,
    autoPostEnabled,
    newsBot,
    fetchLatestNews,
    createNewsPost,
    performAutoPost,
    startAutoPosting,
    stopAutoPosting,
    toggleAutoPosting,
    triggerManualPost,
    loadNewsBotInfo,
    shouldPostNow,
    isArticleAlreadyPosted,
    isArticleRecent,
    getRecentNewsBotPosts,
    getAutoPostStatus
  }
}