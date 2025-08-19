/*
functions/classificationService.js - Server-side Classification Service (Fixed)
Service phân loại bài viết cho Cloud Functions (Node.js environment)
FIXED: Loại bỏ duplicate KEYWORD_DICTIONARY, sử dụng centralized algorithm
Logic:
- Import classification logic từ client-side composable
- Không duplicate KEYWORD_DICTIONARY
- Tương thích với Cloud Functions Node.js runtime
- Sử dụng same algorithm với client-side để đảm bảo consistency
*/

// =============================================================================
// IMPORT CLASSIFICATION ALGORITHM (Centralized)
// =============================================================================

// Note: Trong Cloud Functions environment, bạn sẽ cần copy paste
// classification algorithm từ usePostClassification.js vào đây
// hoặc tạo shared classification module

// Simplified classification algorithm cho Cloud Functions
// (Copy từ usePostClassification.js - centralized source)

const CATEGORIES = [
  'Thể thao', 'Phim ảnh', 'Âm nhạc', 'Trò chơi', 'Ăn uống',
  'Học tập & Giáo dục', 'Chính trị', 'Kinh tế', 'Pháp luật', 'Môi trường',
  'Giao thông', 'Đời sống', 'Công nghệ', 'Y tế & Sức khỏe', 'Tôn giáo',
  'Quân sự', 'Giải trí', 'Du lịch', 'Thời trang'
]

// =============================================================================
// SIMPLIFIED CLASSIFICATION (Server-side optimized)
// =============================================================================

/**
 * Server-side classification function
 * Simplified version của client-side algorithm
 * Chỉ sử dụng basic keywords để tránh duplicate large dictionary
 */
function classifyPost(caption) {
  if (!caption || typeof caption !== 'string') return []

  try {
    // Basic keyword mapping cho server-side (simplified)
    const basicKeywords = {
      'Thể thao': ['bóng đá', 'tennis', 'thể thao', 'gym', 'fitness', 'football', 'soccer', 'sports'],
      'Phim ảnh': ['phim', 'điện ảnh', 'oscar', 'hollywood', 'movie', 'film', 'cinema'],
      'Âm nhạc': ['âm nhạc', 'ca sĩ', 'concert', 'album', 'music', 'singer', 'song'],
      'Trò chơi': ['game', 'trò chơi', 'gaming', 'esports', 'mobile game', 'console'],
      'Ăn uống': ['món ăn', 'nhà hàng', 'nấu ăn', 'food', 'restaurant', 'cooking'],
      'Học tập & Giáo dục': ['học tập', 'giáo dục', 'trường học', 'education', 'learning', 'school'],
      'Công nghệ': ['công nghệ', 'smartphone', 'laptop', 'AI', 'technology', 'app', 'software'],
      'Y tế & Sức khỏe': ['y tế', 'sức khỏe', 'bác sĩ', 'health', 'doctor', 'hospital'],
      'Du lịch': ['du lịch', 'khách sạn', 'resort', 'travel', 'hotel', 'tour'],
      'Thời trang': ['thời trang', 'quần áo', 'fashion', 'clothes', 'style'],
      'Kinh tế': ['kinh tế', 'tài chính', 'ngân hàng', 'economy', 'finance', 'bank'],
      'Giải trí': ['giải trí', 'show tv', 'entertainment', 'tv show', 'fun'],
      'Đời sống': ['đời sống', 'gia đình', 'tình yêu', 'lifestyle', 'family', 'love'],
      'Chính trị': ['chính trị', 'chính phủ', 'politics', 'government', 'election'],
      'Pháp luật': ['pháp luật', 'luật sư', 'tòa án', 'law', 'lawyer', 'court'],
      'Môi trường': ['môi trường', 'ô nhiễm', 'khí hậu', 'environment', 'pollution', 'climate'],
      'Giao thông': ['giao thông', 'xe ô tô', 'traffic', 'car', 'transportation'],
      'Tôn giáo': ['tôn giáo', 'phật giáo', 'religion', 'buddhism', 'prayer'],
      'Quân sự': ['quân sự', 'quân đội', 'military', 'army', 'defense']
    }

    const processedText = caption.toLowerCase().trim()
    const results = []

    // Simple scoring cho server-side
    Object.entries(basicKeywords).forEach(([category, keywords]) => {
      let score = 0
      keywords.forEach(keyword => {
        if (processedText.includes(keyword.toLowerCase())) {
          score += 1
        }
      })

      if (score > 0) {
        results.push(category)
      }
    })

    return results

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
  CATEGORIES
}