/*
src/composables/usePostClassification.js - Refactored
Automatic post classification với keyword matching
Logic: Dictionary-based classification cho 19 categories
*/
import { ref } from 'vue'

export function usePostClassification() {
  const isClassifying = ref(false)

  // 19 predefined categories
  const CATEGORIES = [
    'Thể thao', 'Phim ảnh', 'Âm nhạc', 'Trò chơi', 'Ăn uống',
    'Học tập & Giáo dục', 'Chính trị', 'Kinh tế', 'Pháp luật', 'Môi trường',
    'Giao thông', 'Đời sống', 'Công nghệ', 'Y tế & Sức khỏe', 'Tôn giáo',
    'Quân sự', 'Giải trí', 'Du lịch', 'Thời trang'
  ]

  // Simplified keyword dictionary
  const KEYWORD_DICTIONARY = {
    'Thể thao': {
      keywords: ['bóng đá', 'tennis', 'bóng rổ', 'gym', 'fitness', 'football', 'soccer', 'sports'],
      weight: 1.0
    },
    'Phim ảnh': {
      keywords: ['phim', 'điện ảnh', 'oscar', 'hollywood', 'movie', 'film', 'cinema'],
      weight: 1.0
    },
    'Âm nhạc': {
      keywords: ['âm nhạc', 'ca sĩ', 'concert', 'album', 'music', 'singer', 'song'],
      weight: 1.0
    },
    'Ăn uống': {
      keywords: ['món ăn', 'nhà hàng', 'nấu ăn', 'food', 'restaurant', 'cooking'],
      weight: 1.0
    },
    'Công nghệ': {
      keywords: ['công nghệ', 'smartphone', 'laptop', 'AI', 'technology', 'app'],
      weight: 1.0
    }
  }

  // Text preprocessing
  const preprocessText = (text) => {
    if (!text || typeof text !== 'string') return ''
    
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Main classification function
  const classifyPost = (caption) => {
    if (!caption || typeof caption !== 'string') return []

    isClassifying.value = true

    try {
      const processedText = preprocessText(caption)
      const categoryScores = {}

      CATEGORIES.forEach(category => {
        const categoryData = KEYWORD_DICTIONARY[category]
        if (!categoryData) return

        let score = 0
        const keywords = categoryData.keywords || []

        keywords.forEach(keyword => {
          if (processedText.includes(preprocessText(keyword))) {
            score += 10 * categoryData.weight
          }
        })

        const confidence = Math.min(score / 100, 1)
        if (confidence >= 0.3) {
          categoryScores[category] = { score, confidence }
        }
      })

      return Object.entries(categoryScores)
        .sort(([,a], [,b]) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(([category, data]) => ({
          tag: category,
          confidence: Math.round(data.confidence * 100) / 100
        }))
    } catch {
      return []
    } finally {
      isClassifying.value = false
    }
  }

  // Batch classification
  const classifyMultiplePosts = async (posts) => {
    if (!Array.isArray(posts)) return []

    const results = []
    
    for (const post of posts) {
      if (post.Caption) {
        const tags = classifyPost(post.Caption)
        results.push({
          postId: post.PostID || post.id,
          tags: tags.map(t => t.tag),
          confidence: tags.reduce((sum, t) => sum + t.confidence, 0) / Math.max(tags.length, 1)
        })
      } else {
        results.push({
          postId: post.PostID || post.id,
          tags: [],
          confidence: 0
        })
      }
    }

    return results
  }

  return {
    isClassifying,
    CATEGORIES,
    classifyPost,
    classifyMultiplePosts,
    preprocessText
  }
}