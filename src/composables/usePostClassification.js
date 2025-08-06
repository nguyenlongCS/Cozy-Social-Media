/*
src/composables/usePostClassification.js - Refactored
Automatic post classification với keyword matching
Logic: Dictionary-based classification cho 19 categories với scoring system
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

  // Keyword dictionary với trọng số
  const KEYWORD_DICTIONARY = {
    'Thể thao': {
      primary: {
        vi: ['bóng đá', 'tennis', 'bóng rổ', 'bóng chuyền', 'bơi lội', 'marathon', 'olympic', 'thể thao', 'gym', 'fitness'],
        en: ['football', 'soccer', 'tennis', 'basketball', 'volleyball', 'swimming', 'marathon', 'olympics', 'sports', 'gym', 'fitness']
      },
      secondary: {
        vi: ['tập luyện', 'huấn luyện viên', 'sân vận động', 'giải đấu', 'vô địch', 'thể hình', 'yoga', 'chạy bộ'],
        en: ['training', 'coach', 'stadium', 'tournament', 'champion', 'workout', 'yoga', 'running']
      },
      brands: ['Nike', 'Adidas', 'Puma', 'FIFA', 'UEFA', 'NBA', 'Premier League'],
      weight: 1.0
    },
    'Phim ảnh': {
      primary: {
        vi: ['phim', 'điện ảnh', 'rạp chiếu', 'oscar', 'hollywood', 'diễn viên', 'đạo diễn', 'trailer'],
        en: ['movie', 'film', 'cinema', 'oscar', 'hollywood', 'actor', 'actress', 'director', 'trailer']
      },
      secondary: {
        vi: ['premiere', 'box office', 'kịch bản', 'hậu kỳ', 'casting', 'quay phim'],
        en: ['premiere', 'box office', 'script', 'post production', 'casting', 'filming']
      },
      brands: ['Netflix', 'Disney', 'Marvel', 'Warner Bros', 'Sony Pictures', 'Universal'],
      weight: 1.0
    },
    'Âm nhạc': {
      primary: {
        vi: ['âm nhạc', 'ca sĩ', 'nhạc sĩ', 'concert', 'album', 'bài hát', 'nhạc pop', 'nhạc rock'],
        en: ['music', 'singer', 'musician', 'concert', 'album', 'song', 'pop music', 'rock music']
      },
      secondary: {
        vi: ['liveshow', 'tour diễn', 'thu âm', 'sáng tác', 'lyrics', 'melody'],
        en: ['live show', 'tour', 'recording', 'compose', 'lyrics', 'melody']
      },
      brands: ['Spotify', 'Apple Music', 'YouTube Music', 'Grammy', 'Billboard'],
      weight: 1.0
    },
    'Ăn uống': {
      primary: {
        vi: ['món ăn', 'nhà hàng', 'quán ăn', 'nấu ăn', 'recipe', 'đầu bếp', 'thức ăn', 'đồ uống'],
        en: ['food', 'restaurant', 'cooking', 'recipe', 'chef', 'meal', 'drink', 'cuisine']
      },
      secondary: {
        vi: ['ngon', 'delicious', 'food review', 'menu', 'buffet', 'fastfood'],
        en: ['delicious', 'tasty', 'food review', 'menu', 'buffet', 'fast food']
      },
      brands: ['KFC', 'McDonald', 'Pizza Hut', 'Starbucks', 'Grab Food', 'Baemin'],
      weight: 1.0
    },
    'Công nghệ': {
      primary: {
        vi: ['công nghệ', 'smartphone', 'laptop', 'máy tính', 'AI', 'internet', 'app', 'software'],
        en: ['technology', 'smartphone', 'laptop', 'computer', 'AI', 'internet', 'app', 'software']
      },
      secondary: {
        vi: ['phần mềm', 'phần cứng', 'code', 'programming', 'website'],
        en: ['software', 'hardware', 'coding', 'programming', 'website']
      },
      brands: ['Apple', 'Samsung', 'Google', 'Microsoft', 'iPhone', 'Android'],
      weight: 1.0
    }
  }

  // Scoring weights
  const SCORING_WEIGHTS = {
    primary: 10,
    secondary: 5,
    brands: 8,
    exact_match: 1.5,
    partial_match: 1.0,
    minimum_confidence: 0.3
  }

  // Text preprocessing
  const preprocessText = (text) => {
    if (!text || typeof text !== 'string') return ''
    
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were|và|với|của|tại|trong|trên)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Keyword matching
  const findKeywordMatches = (text, keywords) => {
    const matches = []
    const processedText = preprocessText(text)
    
    keywords.forEach(keyword => {
      const processedKeyword = preprocessText(keyword)
      
      // Exact match
      if (processedText.includes(processedKeyword)) {
        matches.push({
          keyword: keyword,
          type: 'exact',
          score: SCORING_WEIGHTS.exact_match
        })
        return
      }
      
      // Partial match
      const keywordWords = processedKeyword.split(' ')
      if (keywordWords.length > 1) {
        const matchedWords = keywordWords.filter(word => 
          processedText.includes(word) && word.length > 2
        )
        
        if (matchedWords.length >= Math.ceil(keywordWords.length / 2)) {
          matches.push({
            keyword: keyword,
            type: 'partial',
            score: SCORING_WEIGHTS.partial_match * (matchedWords.length / keywordWords.length)
          })
        }
      }
    })
    
    return matches
  }

  // Main classification function
  const classifyPost = (caption) => {
    if (!caption || typeof caption !== 'string') return []

    isClassifying.value = true

    try {
      const categoryScores = {}

      // Calculate scores for each category
      CATEGORIES.forEach(category => {
        const categoryData = KEYWORD_DICTIONARY[category]
        if (!categoryData) return

        let totalScore = 0

        // Primary keywords (Vietnamese + English)
        ['vi', 'en'].forEach(lang => {
          if (categoryData.primary?.[lang]) {
            const matches = findKeywordMatches(caption, categoryData.primary[lang])
            totalScore += matches.reduce((sum, match) => 
              sum + (match.score * SCORING_WEIGHTS.primary), 0
            )
          }
        })

        // Secondary keywords (Vietnamese + English)
        ['vi', 'en'].forEach(lang => {
          if (categoryData.secondary?.[lang]) {
            const matches = findKeywordMatches(caption, categoryData.secondary[lang])
            totalScore += matches.reduce((sum, match) => 
              sum + (match.score * SCORING_WEIGHTS.secondary), 0
            )
          }
        })

        // Brand keywords
        if (categoryData.brands?.length > 0) {
          const matches = findKeywordMatches(caption, categoryData.brands)
          totalScore += matches.reduce((sum, match) => 
            sum + (match.score * SCORING_WEIGHTS.brands), 0
          )
        }

        // Apply category weight và calculate confidence
        totalScore *= categoryData.weight
        const confidence = Math.min(totalScore / 100, 1)

        if (confidence >= SCORING_WEIGHTS.minimum_confidence) {
          categoryScores[category] = {
            score: totalScore,
            confidence: confidence
          }
        }
      })

      // Return top 3 categories sorted by confidence
      return Object.entries(categoryScores)
        .sort(([,a], [,b]) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(([category, data]) => ({
          tag: category,
          confidence: Math.round(data.confidence * 100) / 100
        }))

    } catch (error) {
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