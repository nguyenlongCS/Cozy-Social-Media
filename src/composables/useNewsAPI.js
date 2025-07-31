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

  // Check xem article đã được post chưa (để tránh duplicate)
  const isArticleAlreadyPosted = (article, recentPosts) => {
    if (!recentPosts || recentPosts.length === 0) return false
    
    // Check bằng URL hoặc title
    return recentPosts.some(post => {
      const postCaption = post.Caption || ''
      return postCaption.includes(article.url) || postCaption.includes(article.title)
    })
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
      lastPostTime.value = new Date()
      
      return savedPost
    } catch (err) {
      console.error('Error creating news post:', err)
      throw err
    }
  }

  // Auto post tin tức mới nhất (chạy mỗi giờ)
  const performAutoPost = async () => {
    if (!autoPostEnabled.value) {
      console.log('Auto posting is disabled')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      console.log('Performing auto news post...')
      
      // Fetch latest news
      const articles = await fetchLatestNews('technology', 3)
      
      if (!articles || articles.length === 0) {
        console.log('No news articles found')
        return
      }

      // Lấy bài viết đầu tiên có hình ảnh (ưu tiên)
      let selectedArticle = articles.find(article => article.urlToImage) || articles[0]
      
      // Validate article
      if (!selectedArticle.title || !selectedArticle.url) {
        console.log('Invalid article structure, skipping')
        return
      }

      // TODO: Check duplicate posts (có thể implement sau)
      // const recentPosts = await getRecentPosts(10)
      // if (isArticleAlreadyPosted(selectedArticle, recentPosts)) {
      //   console.log('Article already posted, skipping')
      //   return
      // }

      // Tạo post
      await createNewsPost(selectedArticle)
      
      console.log('Auto news post completed successfully')
      
    } catch (err) {
      console.error('Error during auto post:', err)
      error.value = err
      
      // Không hiển thị error alert cho auto posting để không spam user
      // chỉ log error
    } finally {
      isLoading.value = false
    }
  }

  // Khởi tạo auto posting schedule (mỗi giờ = 3600000ms)
  const startAutoPosting = () => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }

    // Post ngay lập tức lần đầu (sau 10 giây để app khởi động)
    setTimeout(() => {
      if (autoPostEnabled.value) {
        performAutoPost()
      }
    }, 10000)

    // Schedule post mỗi giờ
    intervalId.value = setInterval(() => {
      if (autoPostEnabled.value) {
        performAutoPost()
      }
    }, 3600000) // 1 hour = 3600000ms

    console.log('Auto news posting started - will post every hour')
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
    getAutoPostStatus
  }
}