/*
functions/classificationService.js - Server-side Classification Service
Service phân loại bài viết cho Cloud Functions (Node.js environment)
Logic:
- Port keyword matching algorithm từ client-side sang server-side
- Không phụ thuộc vào Vue composables
- Tương thích với Cloud Functions Node.js runtime
- Cùng logic và categories với client-side classification
- Lightweight và optimized cho server environment
*/

// =============================================================================
// CONSTANTS - KEYWORD DICTIONARY
// =============================================================================

// 19 danh mục được định sẵn (same as client-side)
const CATEGORIES = [
  'Thể thao', 'Phim ảnh', 'Âm nhạc', 'Trò chơi', 'Ăn uống',
  'Học tập & Giáo dục', 'Chính trị', 'Kinh tế', 'Pháp luật', 'Môi trường',
  'Giao thông', 'Đời sống', 'Công nghệ', 'Y tế & Sức khỏe', 'Tôn giáo',
  'Quân sự', 'Giải trí', 'Du lịch', 'Thời trang'
]

// Dictionary Keywords với trọng số (same as client-side)
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

  'Trò chơi': {
    primary: {
      vi: ['game', 'trò chơi', 'điện tử', 'mobile game', 'pc game', 'console', 'esports'],
      en: ['game', 'gaming', 'video game', 'mobile game', 'pc game', 'console', 'esports']
    },
    secondary: {
      vi: ['gameplay', 'streamer', 'tournament', 'online', 'offline', 'update'],
      en: ['gameplay', 'streamer', 'tournament', 'online', 'offline', 'update']
    },
    brands: ['PlayStation', 'Xbox', 'Nintendo', 'Steam', 'Mobile Legends', 'PUBG', 'FIFA'],
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

  'Học tập & Giáo dục': {
    primary: {
      vi: ['học tập', 'giáo dục', 'trường học', 'đại học', 'sinh viên', 'giáo viên', 'bài học', 'khóa học'],
      en: ['education', 'learning', 'school', 'university', 'student', 'teacher', 'lesson', 'course']
    },
    secondary: {
      vi: ['thi cử', 'điểm số', 'bằng cấp', 'scholarship', 'online learning'],
      en: ['exam', 'grade', 'degree', 'scholarship', 'online learning']
    },
    brands: ['Harvard', 'MIT', 'Coursera', 'Udemy', 'Khan Academy'],
    weight: 1.0
  },

  'Chính trị': {
    primary: {
      vi: ['chính trị', 'chính phủ', 'tổng thống', 'thủ tướng', 'quốc hội', 'bầu cử', 'chính sách'],
      en: ['politics', 'government', 'president', 'prime minister', 'parliament', 'election', 'policy']
    },
    secondary: {
      vi: ['đảng phái', 'biểu tình', 'ngoại giao', 'luật pháp'],
      en: ['political party', 'protest', 'diplomacy', 'legislation']
    },
    brands: [],
    weight: 1.0
  },

  'Kinh tế': {
    primary: {
      vi: ['kinh tế', 'tài chính', 'ngân hàng', 'chứng khoán', 'đầu tư', 'bitcoin', 'crypto', 'GDP'],
      en: ['economy', 'finance', 'bank', 'stock market', 'investment', 'bitcoin', 'cryptocurrency', 'GDP']
    },
    secondary: {
      vi: ['lạm phát', 'tỷ giá', 'xuất khẩu', 'nhập khẩu', 'startup'],
      en: ['inflation', 'exchange rate', 'export', 'import', 'startup']
    },
    brands: ['Vietcombank', 'Techcombank', 'Tesla', 'Apple', 'Google'],
    weight: 1.0
  },

  'Pháp luật': {
    primary: {
      vi: ['pháp luật', 'luật sư', 'tòa án', 'thẩm phán', 'án tử', 'vi phạm', 'tội phạm'],
      en: ['law', 'lawyer', 'court', 'judge', 'crime', 'violation', 'legal']
    },
    secondary: {
      vi: ['bản án', 'kháng cáo', 'bồi thường', 'hợp đồng'],
      en: ['verdict', 'appeal', 'compensation', 'contract']
    },
    brands: [],
    weight: 1.0
  },

  'Môi trường': {
    primary: {
      vi: ['môi trường', 'ô nhiễm', 'khí hậu', 'biến đổi khí hậu', 'xanh', 'tái chế', 'năng lượng sạch'],
      en: ['environment', 'pollution', 'climate', 'climate change', 'green', 'recycle', 'clean energy']
    },
    secondary: {
      vi: ['bảo vệ', 'sinh thái', 'rừng', 'đại dương'],
      en: ['protection', 'ecosystem', 'forest', 'ocean']
    },
    brands: ['Greenpeace', 'WWF'],
    weight: 1.0
  },

  'Giao thông': {
    primary: {
      vi: ['giao thông', 'xe ô tô', 'xe máy', 'tàu hỏa', 'máy bay', 'tắc đường', 'tai nạn'],
      en: ['traffic', 'car', 'motorcycle', 'train', 'airplane', 'traffic jam', 'accident']
    },
    secondary: {
      vi: ['đường phố', 'cầu đường', 'sân bay', 'ga tàu'],
      en: ['street', 'bridge', 'airport', 'train station']
    },
    brands: ['Toyota', 'Honda', 'BMW', 'Mercedes', 'Grab', 'Uber'],
    weight: 1.0
  },

  'Đời sống': {
    primary: {
      vi: ['đời sống', 'gia đình', 'tình yêu', 'hôn nhân', 'con cái', 'bạn bè', 'hạnh phúc'],
      en: ['lifestyle', 'family', 'love', 'marriage', 'children', 'friends', 'happiness']
    },
    secondary: {
      vi: ['cuộc sống', 'sinh hoạt', 'thói quen', 'mẹo hay'],
      en: ['life', 'daily routine', 'habit', 'life tips']
    },
    brands: [],
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
  },

  'Y tế & Sức khỏe': {
    primary: {
      vi: ['y tế', 'sức khỏe', 'bác sĩ', 'bệnh viện', 'thuốc', 'vaccine', 'covid', 'bệnh tật'],
      en: ['health', 'doctor', 'hospital', 'medicine', 'vaccine', 'covid', 'disease', 'medical']
    },
    secondary: {
      vi: ['điều trị', 'phòng khám', 'xét nghiệm', 'chăm sóc'],
      en: ['treatment', 'clinic', 'test', 'healthcare']
    },
    brands: ['WHO', 'Pfizer', 'Johnson'],
    weight: 1.0
  },

  'Tôn giáo': {
    primary: {
      vi: ['tôn giáo', 'phật giáo', 'thiên chúa giáo', 'hồi giáo', 'cầu nguyện', 'chùa', 'nhà thờ'],
      en: ['religion', 'buddhism', 'christianity', 'islam', 'prayer', 'temple', 'church']
    },
    secondary: {
      vi: ['đức tin', 'tâm linh', 'thiền định'],
      en: ['faith', 'spiritual', 'meditation']
    },
    brands: [],
    weight: 1.0
  },

  'Quân sự': {
    primary: {
      vi: ['quân sự', 'quân đội', 'chiến tranh', 'vũ khí', 'lính', 'tướng', 'quốc phòng'],
      en: ['military', 'army', 'war', 'weapon', 'soldier', 'general', 'defense']
    },
    secondary: {
      vi: ['huấn luyện', 'căn cứ', 'chiến lược'],
      en: ['training', 'base', 'strategy']
    },
    brands: [],
    weight: 1.0
  },

  'Giải trí': {
    primary: {
      vi: ['giải trí', 'show tv', 'reality show', 'talk show', 'variety show', 'ca nhạc', 'hài kịch'],
      en: ['entertainment', 'tv show', 'reality show', 'talk show', 'variety show', 'comedy', 'fun']
    },
    secondary: {
      vi: ['vui vẻ', 'thư giãn', 'nghỉ ngơi'],
      en: ['fun', 'relax', 'leisure']
    },
    brands: ['VTV', 'HTV', 'YouTube', 'TikTok'],
    weight: 1.0
  },

  'Du lịch': {
    primary: {
      vi: ['du lịch', 'khách sạn', 'resort', 'tour', 'nghỉ dưỡng', 'điểm đến', 'hành trình'],
      en: ['travel', 'hotel', 'resort', 'tour', 'vacation', 'destination', 'journey']
    },
    secondary: {
      vi: ['check in', 'review địa điểm', 'ăn chơi'],
      en: ['check in', 'location review', 'sightseeing']
    },
    brands: ['Booking.com', 'Agoda', 'Airbnb', 'Expedia'],
    weight: 1.0
  },

  'Thời trang': {
    primary: {
      vi: ['thời trang', 'quần áo', 'giày dép', 'phụ kiện', 'mẫu', 'thiết kế', 'style'],
      en: ['fashion', 'clothes', 'shoes', 'accessories', 'model', 'design', 'style']
    },
    secondary: {
      vi: ['outfit', 'trend', 'shopping', 'sale'],
      en: ['outfit', 'trend', 'shopping', 'sale']
    },
    brands: ['Zara', 'H&M', 'Uniqlo', 'Chanel', 'Gucci', 'Nike'],
    weight: 1.0
  }
}

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const SCORING_WEIGHTS = {
  primary: 10,      // Từ khóa chính
  secondary: 5,     // Từ khóa phụ
  brands: 8,        // Thương hiệu
  exact_match: 1.5, // Khớp chính xác
  partial_match: 1.0, // Khớp một phần
  minimum_confidence: 0.3 // Ngưỡng tối thiểu để assign tag
}

// =============================================================================
// TEXT PREPROCESSING
// =============================================================================

function preprocessText(text) {
  if (!text || typeof text !== 'string') return ''

  return text
    .toLowerCase()
    .trim()
    // Loại bỏ dấu câu và ký tự đặc biệt
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
    // Chuẩn hóa khoảng trắng
    .replace(/\s+/g, ' ')
    // Loại bỏ stopwords cơ bản
    .replace(/\b(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were|và|với|của|tại|trong|trên)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// =============================================================================
// KEYWORD MATCHING ALGORITHM
// =============================================================================

function findKeywordMatches(text, keywords) {
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

    // Partial match (từ khóa có nhiều từ)
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

// =============================================================================
// MAIN CLASSIFICATION FUNCTION
// =============================================================================

function classifyPost(caption) {
  if (!caption || typeof caption !== 'string') {
    return []
  }

  try {
    const categoryScores = {}

    // Tính điểm cho từng category
    CATEGORIES.forEach(category => {
      const categoryData = KEYWORD_DICTIONARY[category]
      if (!categoryData) return

      let totalScore = 0

      // Primary keywords (Vietnamese)
      if (categoryData.primary?.vi) {
        const matches = findKeywordMatches(caption, categoryData.primary.vi)
        totalScore += matches.reduce((sum, match) =>
          sum + (match.score * SCORING_WEIGHTS.primary), 0
        )
      }

      // Primary keywords (English)
      if (categoryData.primary?.en) {
        const matches = findKeywordMatches(caption, categoryData.primary.en)
        totalScore += matches.reduce((sum, match) =>
          sum + (match.score * SCORING_WEIGHTS.primary), 0
        )
      }

      // Secondary keywords (Vietnamese)
      if (categoryData.secondary?.vi) {
        const matches = findKeywordMatches(caption, categoryData.secondary.vi)
        totalScore += matches.reduce((sum, match) =>
          sum + (match.score * SCORING_WEIGHTS.secondary), 0
        )
      }

      // Secondary keywords (English)
      if (categoryData.secondary?.en) {
        const matches = findKeywordMatches(caption, categoryData.secondary.en)
        totalScore += matches.reduce((sum, match) =>
          sum + (match.score * SCORING_WEIGHTS.secondary), 0
        )
      }

      // Brand keywords
      if (categoryData.brands?.length > 0) {
        const matches = findKeywordMatches(caption, categoryData.brands)
        totalScore += matches.reduce((sum, match) =>
          sum + (match.score * SCORING_WEIGHTS.brands), 0
        )
      }

      // Apply category weight
      totalScore *= categoryData.weight

      // Calculate confidence score (0-1)
      const maxPossibleScore = 100 // Estimated max score
      const confidence = Math.min(totalScore / maxPossibleScore, 1)

      if (confidence >= SCORING_WEIGHTS.minimum_confidence) {
        categoryScores[category] = {
          score: totalScore,
          confidence: confidence
        }
      }
    })

    // Sort by confidence và lấy tất cả tag có confidence >= threshold
    const sortedCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b.confidence - a.confidence)
      .map(([category, data]) => ({
        tag: category,
        confidence: Math.round(data.confidence * 100) / 100
      }))


    console.log('Server-side classification result:', {
      caption: caption.substring(0, 100) + '...',
      tags: sortedCategories
    })

    // Return just the tag names (consistent with client-side)
    return sortedCategories.map(result => result.tag)

  } catch (error) {
    console.error('Error in server-side post classification:', error)
    return []
  }
}

// =============================================================================
// EXPORT FOR CLOUD FUNCTIONS
// =============================================================================

module.exports = {
  classifyPost,
  CATEGORIES,
  preprocessText,
  findKeywordMatches
}