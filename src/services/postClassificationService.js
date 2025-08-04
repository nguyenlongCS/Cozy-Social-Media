/*
src/services/postClassificationService.js - Simplified
Service tích hợp hệ thống phân loại vào Firestore với cấu trúc đơn giản
Logic:
- Tích hợp usePostClassification vào quy trình tạo post
- Tự động classify và lưu chỉ Tags vào Firestore
- Loại bỏ ClassificationVersion và ClassifiedAt fields
- Batch processing cho posts hiện có
- Background classification không ảnh hưởng UX
- Tách biệt hoàn toàn khỏi logic UI hiện tại
*/

import { 
  getFirestore, 
  doc, 
  updateDoc, 
  collection, 
  getDocs,
  query,
  where,
  limit,
  writeBatch
} from 'firebase/firestore'
import app from '@/firebase/config'
import { usePostClassification } from '@/composables/usePostClassification'

// Initialize Firestore
const db = getFirestore(app, 'social-media-db')

export class PostClassificationService {
  constructor() {
    const { classifyPost, classifyMultiplePosts } = usePostClassification()
    this.classifyPost = classifyPost
    this.classifyMultiplePosts = classifyMultiplePosts
    this.isProcessing = false
  }

  // =============================================================================
  // REAL-TIME CLASSIFICATION FOR NEW POSTS
  // =============================================================================

  /**
   * Classify một post mới và update Tags field (đơn giản)
   * Được gọi sau khi post được tạo thành công
   */
  async classifyAndUpdatePost(postId, caption) {
    if (!postId || !caption) {
      console.warn('PostClassificationService: Missing postId or caption')
      return null
    }

    try {
      console.log('Classifying post:', postId)
      
      // Classify caption
      const classificationResult = this.classifyPost(caption)
      
      if (!classificationResult || classificationResult.length === 0) {
        console.log('No tags classified for post:', postId)
        return null
      }

      // Extract chỉ tên tags (không lưu confidence scores)
      const tags = classificationResult.map(result => result.tag)
      
      // Update post với Tags field đơn giản
      const postRef = doc(db, 'posts', postId)
      await updateDoc(postRef, {
        Tags: tags
      })

      console.log('Post classified successfully:', {
        postId,
        tags,
        confidence: classificationResult.map(r => r.confidence)
      })

      return {
        postId,
        tags,
        classificationResult
      }

    } catch (error) {
      console.error('Error classifying post:', error)
      // Không throw error để không ảnh hưởng đến flow tạo post
      return null
    }
  }

  // =============================================================================
  // BATCH CLASSIFICATION FOR EXISTING POSTS
  // =============================================================================

  /**
   * Classify tất cả posts chưa có Tags (đơn giản)
   * Chạy trong background, không ảnh hưởng UX
   */
  async classifyExistingPosts(batchSize = 20) {
    if (this.isProcessing) {
      console.log('Classification already in progress')
      return
    }

    this.isProcessing = true
    
    try {
      console.log('Starting batch classification of existing posts...')
      
      // Query posts chưa có Tags field
      const postsCollection = collection(db, 'posts')
      const unclassifiedQuery = query(
        postsCollection,
        where('Tags', '==', null),
        limit(batchSize)
      )
      
      const querySnapshot = await getDocs(unclassifiedQuery)
      
      if (querySnapshot.empty) {
        console.log('No unclassified posts found')
        return
      }

      const posts = []
      querySnapshot.forEach(doc => {
        const data = doc.data()
        if (data.Caption) { // Chỉ classify posts có caption
          posts.push({
            id: doc.id,
            Caption: data.Caption
          })
        }
      })

      if (posts.length === 0) {
        console.log('No posts with caption found for classification')
        return
      }

      console.log(`Found ${posts.length} posts to classify`)

      // Classify trong batches nhỏ để tránh timeout
      const results = []
      const chunkSize = 5

      for (let i = 0; i < posts.length; i += chunkSize) {
        const chunk = posts.slice(i, i + chunkSize)
        const chunkResults = await this.classifyMultiplePosts(chunk)
        results.push(...chunkResults)
        
        // Small delay giữa các batches
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Update Firestore với batch writes (đơn giản)
      await this.updatePostsWithTags(results)

      console.log(`Batch classification completed: ${results.length} posts processed`)
      return results

    } catch (error) {
      console.error('Error in batch classification:', error)
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Update multiple posts với Tags field sử dụng batch writes (đơn giản)
   */
  async updatePostsWithTags(classificationResults) {
    if (!classificationResults || classificationResults.length === 0) {
      return
    }

    try {
      // Firestore batch writes có limit 500 operations
      const batchSize = 500
      
      for (let i = 0; i < classificationResults.length; i += batchSize) {
        const batch = writeBatch(db)
        const chunk = classificationResults.slice(i, i + batchSize)
        
        chunk.forEach(result => {
          if (result.tags && result.tags.length > 0) {
            const postRef = doc(db, 'posts', result.postId)
            // Chỉ update Tags field
            batch.update(postRef, {
              Tags: result.tags
            })
          }
        })
        
        await batch.commit()
        console.log(`Batch ${Math.floor(i/batchSize) + 1} committed: ${chunk.length} posts updated`)
      }

    } catch (error) {
      console.error('Error updating posts with tags:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY METHODS (SIMPLIFIED)
  // =============================================================================

  /**
   * Get classification statistics (đơn giản)
   */
  async getClassificationStats() {
    try {
      const postsCollection = collection(db, 'posts')
      
      // Count total posts
      const totalPostsSnapshot = await getDocs(postsCollection)
      const totalPosts = totalPostsSnapshot.size
      
      // Count classified posts
      const classifiedQuery = query(
        postsCollection,
        where('Tags', '!=', null)
      )
      const classifiedSnapshot = await getDocs(classifiedQuery)
      const classifiedPosts = classifiedSnapshot.size
      
      // Calculate tag distribution
      const tagDistribution = {}
      classifiedSnapshot.forEach(doc => {
        const tags = doc.data().Tags || []
        tags.forEach(tag => {
          tagDistribution[tag] = (tagDistribution[tag] || 0) + 1
        })
      })
      
      return {
        totalPosts,
        classifiedPosts,
        unclassifiedPosts: totalPosts - classifiedPosts,
        classificationRate: Math.round((classifiedPosts / totalPosts) * 100),
        tagDistribution: Object.entries(tagDistribution)
          .sort(([,a], [,b]) => b - a)
          .reduce((obj, [tag, count]) => ({ ...obj, [tag]: count }), {})
      }
      
    } catch (error) {
      console.error('Error getting classification stats:', error)
      return null
    }
  }

  /**
   * Re-classify posts (đơn giản - chỉ update Tags)
   */
  async reclassifyPosts(batchSize = 50) {
    try {
      console.log('Starting reclassification...')
      
      const postsCollection = collection(db, 'posts')
      const postsQuery = query(
        postsCollection,
        limit(batchSize)
      )
      
      const querySnapshot = await getDocs(postsQuery)
      
      if (querySnapshot.empty) {
        console.log('No posts found for reclassification')
        return
      }

      const posts = []
      querySnapshot.forEach(doc => {
        const data = doc.data()
        if (data.Caption) {
          posts.push({
            id: doc.id,
            Caption: data.Caption
          })
        }
      })

      const results = await this.classifyMultiplePosts(posts)
      await this.updatePostsWithTags(results)

      console.log(`Reclassification completed: ${results.length} posts processed`)
      return results

    } catch (error) {
      console.error('Error in reclassification:', error)
      throw error
    }
  }

  /**
   * Validate classification accuracy với manual labels (đơn giản)
   */
  async validateClassification(testCases) {
    if (!Array.isArray(testCases)) {
      console.error('Test cases must be an array')
      return null
    }

    try {
      const results = []
      
      for (const testCase of testCases) {
        const { caption, expectedTags } = testCase
        const classificationResult = this.classifyPost(caption)
        const predictedTags = classificationResult.map(r => r.tag)
        
        // Calculate precision, recall, F1
        const tp = expectedTags.filter(tag => predictedTags.includes(tag)).length
        const fp = predictedTags.filter(tag => !expectedTags.includes(tag)).length
        const fn = expectedTags.filter(tag => !predictedTags.includes(tag)).length
        
        const precision = tp / (tp + fp) || 0
        const recall = tp / (tp + fn) || 0
        const f1 = 2 * (precision * recall) / (precision + recall) || 0
        
        results.push({
          caption: caption.substring(0, 50) + '...',
          expected: expectedTags,
          predicted: predictedTags,
          precision: Math.round(precision * 100) / 100,
          recall: Math.round(recall * 100) / 100,
          f1: Math.round(f1 * 100) / 100
        })
      }
      
      // Calculate overall metrics
      const avgPrecision = results.reduce((sum, r) => sum + r.precision, 0) / results.length
      const avgRecall = results.reduce((sum, r) => sum + r.recall, 0) / results.length
      const avgF1 = results.reduce((sum, r) => sum + r.f1, 0) / results.length
      
      return {
        testResults: results,
        overallMetrics: {
          avgPrecision: Math.round(avgPrecision * 100) / 100,
          avgRecall: Math.round(avgRecall * 100) / 100,
          avgF1: Math.round(avgF1 * 100) / 100
        }
      }
      
    } catch (error) {
      console.error('Error validating classification:', error)
      return null
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const postClassificationService = new PostClassificationService()

// =============================================================================
// INTEGRATION HELPER FUNCTIONS (SIMPLIFIED)
// =============================================================================

/**
 * Helper function để integrate vào createPost flow (đơn giản)
 * Gọi function này sau khi post được tạo thành công
 */
export const classifyNewPost = async (postId, caption) => {
  return await postClassificationService.classifyAndUpdatePost(postId, caption)
}

/**
 * Helper function để chạy batch classification (đơn giản)
 * Có thể gọi từ admin panel hoặc cron job
 */
export const runBatchClassification = async (batchSize = 20) => {
  return await postClassificationService.classifyExistingPosts(batchSize)
}

/**
 * Helper function để get stats (đơn giản)
 */
export const getClassificationStats = async () => {
  return await postClassificationService.getClassificationStats()
}