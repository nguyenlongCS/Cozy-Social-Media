/*
src/composables/useDiscover.js
Composable quản lý logic cho trang Discover
Logic:
- Load posts và sắp xếp theo lượt like giảm dần
- Identify trending posts (posts có nhiều like trong tuần qua)
- Filter posts chỉ lấy những bài có media
- Business logic tách biệt khỏi UI component
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  orderBy,
  where,
  limit
} from 'firebase/firestore'
import app from '@/firebase/config'

const db = getFirestore(app, 'social-media-db')

export function useDiscover() {
  const posts = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Load posts cho Discover page (đơn giản hóa để tránh composite index)
  const loadDiscoverPosts = async (limitCount = 100) => {
    isLoading.value = true
    error.value = null

    try {
      // Query đơn giản chỉ với 1 điều kiện để tránh composite index
      const postsQuery = query(
        collection(db, 'posts'),
        where('MediaURL', '!=', null),
        limit(limitCount * 3) // Lấy nhiều hơn để có đủ data sau khi filter và sort
      )

      const querySnapshot = await getDocs(postsQuery)
      const postsData = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        
        // Filter và validate posts có media
        if (data.MediaURL && data.MediaURL.trim() && !data.Hidden) {
          postsData.push({
            PostID: doc.id,
            ...data,
            likes: data.likes || 0,
            mediaCount: data.mediaCount || (data.MediaURL ? 1 : 0),
            isTrending: false // Sẽ được set sau
          })
        }
      })

      // Sort theo likes giảm dần sau khi lấy data
      postsData.sort((a, b) => b.likes - a.likes)
      
      // Giới hạn số lượng posts cuối cùng
      posts.value = postsData.slice(0, limitCount)
      
      console.log(`Loaded ${posts.value.length} posts for discover, sorted by likes`)
      
      return posts.value
    } catch (err) {
      error.value = err
      console.error('Error loading discover posts:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Identify trending posts (posts được tạo trong tuần qua và có nhiều like nhất)
  const identifyTrendingPosts = async () => {
    if (posts.value.length === 0) return

    try {
      // Tính toán ngày một tuần trước
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      // Query posts được TẠO trong tuần qua (mới nhất)
      const trendingQuery = query(
        collection(db, 'posts'),
        where('Created', '>=', oneWeekAgo),
        limit(200) // Lấy đủ posts trong tuần
      )

      const querySnapshot = await getDocs(trendingQuery)
      const weeklyPosts = []

      // Collect posts được tạo trong tuần qua và có media
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.MediaURL && data.MediaURL.trim() && !data.Hidden) {
          weeklyPosts.push({
            PostID: doc.id,
            likes: data.likes || 0,
            MediaURL: data.MediaURL,
            Created: data.Created
          })
        }
      })

      console.log(`Found ${weeklyPosts.length} posts created in the last week`)

      if (weeklyPosts.length === 0) {
        console.log('No posts found in the last week')
        return
      }

      // Sắp xếp posts tuần qua theo likes GIẢM DẦN, sau đó theo Created date cho posts cùng likes
      weeklyPosts.sort((a, b) => {
        if (b.likes !== a.likes) {
          return b.likes - a.likes // Sort by likes descending
        }
        // Nếu cùng likes, sort by Created date (newer first)
        const dateA = a.Created?.toDate ? a.Created.toDate() : new Date(a.Created)
        const dateB = b.Created?.toDate ? b.Created.toDate() : new Date(b.Created)
        return dateB - dateA
      })
      
      // Tính toán trending threshold thông minh hơn
      const maxTrendingPosts = Math.min(15, Math.max(5, Math.ceil(weeklyPosts.length * 0.5))) // 50% posts tuần qua hoặc 5-15 posts
      
      // Lấy tất cả posts có likes >= 1 (loại bỏ threshold cứng)
      const trendingWeeklyPosts = weeklyPosts
        .filter(post => post.likes >= 5) // Chỉ cần ít nhất 5 like
        .slice(0, maxTrendingPosts) // Lấy top posts
      
      const trendingPostIds = new Set(trendingWeeklyPosts.map(post => post.PostID))

      console.log(`Selected ${trendingWeeklyPosts.length} trending posts from this week:`)
      trendingWeeklyPosts.forEach((post, index) => {
        console.log(`${index + 1}. Post ${post.PostID.slice(-4)}: ${post.likes} likes`)
      })

      // Mark trending posts trong current posts list
      posts.value.forEach(post => {
        post.isTrending = trendingPostIds.has(post.PostID)
      })

      // Sắp xếp lại: TRENDING POSTS LÊN ĐẦU, sau đó normal posts
      const trendingPosts = posts.value.filter(post => post.isTrending)
      const normalPosts = posts.value.filter(post => !post.isTrending)

      // Cả trending và normal đều sorted by likes giảm dần, secondary sort by Created
      const sortByLikesAndDate = (a, b) => {
        if (b.likes !== a.likes) {
          return b.likes - a.likes
        }
        // Secondary sort by Created date for same likes
        const dateA = a.Created?.toDate ? a.Created.toDate() : new Date(a.Created || 0)
        const dateB = b.Created?.toDate ? b.Created.toDate() : new Date(b.Created || 0)
        return dateB - dateA
      }

      posts.value = [
        ...trendingPosts.sort(sortByLikesAndDate),
        ...normalPosts.sort(sortByLikesAndDate)
      ]

      console.log(`✅ Final order: ${trendingPosts.length} trending posts first, then ${normalPosts.length} normal posts`)
      console.log('First 10 posts order:')
      posts.value.slice(0, 10).forEach((post, index) => {
        console.log(`${index + 1}. ${post.isTrending ? '🔥' : '📷'} Post ${post.PostID.slice(-4)} - ${post.likes} likes ${post.isTrending ? '(TRENDING)' : ''}`)
      })
      
    } catch (err) {
      console.error('Error identifying trending posts:', err)
      
      // Fallback: mark ALL posts có likes >= 1 trong top 10 as trending
      const fallbackTrendingCount = Math.min(10, posts.value.length)
      
      posts.value.forEach(post => {
        post.isTrending = false
      })
      
      posts.value
        .filter(post => post.likes >= 1)
        .slice(0, fallbackTrendingCount)
        .forEach(post => {
          post.isTrending = true
        })
        
      console.log(`Fallback: marked top ${fallbackTrendingCount} posts with likes >= 1 as trending`)
    }
  }

  // Get posts by category (có thể dùng sau này)
  const getPostsByCategory = async (category, limitCount = 50) => {
    isLoading.value = true
    
    try {
      const categoryQuery = query(
        collection(db, 'posts'),
        where('Tags', 'array-contains', category),
        where('MediaURL', '!=', null),
        orderBy('MediaURL'),
        orderBy('likes', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(categoryQuery)
      const categoryPosts = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.MediaURL && data.MediaURL.trim()) {
          categoryPosts.push({
            PostID: doc.id,
            ...data,
            likes: data.likes || 0,
            mediaCount: data.mediaCount || 1
          })
        }
      })

      return categoryPosts
    } catch (err) {
      console.error('Error getting posts by category:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Search posts by keyword
  const searchPosts = async (keyword, limitCount = 30) => {
    if (!keyword || keyword.trim().length === 0) {
      return []
    }

    isLoading.value = true

    try {
      // Simple text search trong caption
      const searchQuery = query(
        collection(db, 'posts'),
        where('MediaURL', '!=', null),
        orderBy('MediaURL'),
        orderBy('likes', 'desc'),
        limit(100) // Lấy nhiều hơn để filter
      )

      const querySnapshot = await getDocs(searchQuery)
      const searchResults = []
      const searchTerm = keyword.toLowerCase()

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const caption = (data.Caption || '').toLowerCase()
        
        if (data.MediaURL && caption.includes(searchTerm)) {
          searchResults.push({
            PostID: doc.id,
            ...data,
            likes: data.likes || 0,
            mediaCount: data.mediaCount || 1
          })
        }
      })

      // Sort by relevance và likes
      searchResults.sort((a, b) => b.likes - a.likes)
      
      return searchResults.slice(0, limitCount)
    } catch (err) {
      console.error('Error searching posts:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Get posts statistics cho discover
  const getDiscoverStats = async () => {
    try {
      const statsQuery = query(
        collection(db, 'posts'),
        where('MediaURL', '!=', null),
        orderBy('MediaURL')
      )

      const querySnapshot = await getDocs(statsQuery)
      let totalLikes = 0
      let totalPosts = 0
      const categoryStats = {}

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        totalPosts++
        totalLikes += data.likes || 0

        // Count by tags
        if (data.Tags && Array.isArray(data.Tags)) {
          data.Tags.forEach(tag => {
            categoryStats[tag] = (categoryStats[tag] || 0) + 1
          })
        }
      })

      return {
        totalPosts,
        totalLikes,
        avgLikes: totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0,
        categoryStats: Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .reduce((obj, [tag, count]) => ({ ...obj, [tag]: count }), {})
      }
    } catch (err) {
      console.error('Error getting discover stats:', err)
      return null
    }
  }

  // Refresh posts
  const refreshPosts = async () => {
    await loadDiscoverPosts()
    await identifyTrendingPosts()
  }

  return {
    posts,
    isLoading,
    error,
    loadDiscoverPosts,
    identifyTrendingPosts,
    getPostsByCategory,
    searchPosts,
    getDiscoverStats,
    refreshPosts
  }
}