/*
src/services/postClassificationService.js - Fixed Service Layer
Service tích hợp hệ thống phân loại vào Firestore
FIXED: Loại bỏ duplicate KEYWORD_DICTIONARY, sử dụng centralized algorithm
Logic:
- Import classification từ usePostClassification composable
- Không duplicate keywords hoặc algorithm
- Service layer chỉ quản lý Firestore operations
- Classification logic được centralized tại composable
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

// =============================================================================
// POST CLASSIFICATION SERVICE CLASS (No duplicate algorithms)
// =============================================================================

export class PostClassificationService {
  constructor() {
    // Import classification algorithm từ centralized composable
    const { classifyPost, getAvailableCategories } = usePostClassification()
    this.classifyPost = classifyPost
    this.getAvailableCategories = getAvailableCategories
    this.isProcessing = false
  }

  // =============================================================================
  // REAL-TIME CLASSIFICATION FOR NEW POSTS
  // =============================================================================

  /**
   * Classify một post mới và update Tags field
   * Sử dụng centralized classification algorithm
   */
  async classifyAndUpdatePost(postId, caption) {
    if (!postId || !caption) {
      return null
    }

    try {
      // Sử dụng centralized classification từ composable
      const classificationResults = this.classifyPost(caption)
      
      if (!classificationResults || classificationResults.length === 0) {
        return null
      }

      // Extract tags từ classification results
      const tags = classificationResults.map(result => result.tag)

      // Update post với Tags field
      const postRef = doc(db, 'posts', postId)
      await updateDoc(postRef, {
        Tags: tags
      })

      return {
        postId,
        tags,
        classificationResults
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
   * Classify tất cả posts chưa có Tags
   * Sử dụng centralized algorithm để đảm bảo consistency
   */
  async classifyExistingPosts(batchSize = 20) {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    
    try {
      // Query posts chưa có Tags field hoặc Tags = null
      const postsCollection = collection(db, 'posts')
      const unclassifiedQuery = query(
        postsCollection,
        where('Tags', '==', null),
        limit(batchSize)
      )
      
      const querySnapshot = await getDocs(unclassifiedQuery)
      
      if (querySnapshot.empty) {
        return
      }

      const posts = []
      querySnapshot.forEach(doc => {
        const data = doc.data()
        if (data.Caption && data.Caption.trim()) {
          posts.push({
            id: doc.id,
            Caption: data.Caption
          })
        }
      })

      if (posts.length === 0) {
        return
      }

      // Classify từng post sử dụng centralized algorithm
      const results = []
      for (const post of posts) {
        const classificationResults = this.classifyPost(post.Caption)
        if (classificationResults && classificationResults.length > 0) {
          const tags = classificationResults.map(result => result.tag)
          results.push({
            postId: post.id,
            tags
          })
        }
      }

      // Update Firestore với batch writes
      await this.updatePostsWithTags(results)

      return results

    } catch (error) {
      console.error('Error in batch classification:', error)
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Update multiple posts với Tags field sử dụng batch writes
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
            batch.update(postRef, {
              Tags: result.tags
            })
          }
        })
        
        await batch.commit()
      }

    } catch (error) {
      console.error('Error updating posts with tags:', error)
      throw error
    }
  }

  // =============================================================================
  // UTILITY METHODS (Sử dụng centralized data)
  // =============================================================================

  /**
   * Get classification statistics
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
   * Re-classify posts sử dụng updated algorithm
   */
  async reclassifyPosts(batchSize = 50) {
    try {
      const postsCollection = collection(db, 'posts')
      const postsQuery = query(
        postsCollection,
        limit(batchSize)
      )
      
      const querySnapshot = await getDocs(postsQuery)
      
      if (querySnapshot.empty) {
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

      // Re-classify sử dụng current algorithm
      const results = []
      for (const post of posts) {
        const classificationResults = this.classifyPost(post.Caption)
        if (classificationResults && classificationResults.length > 0) {
          const tags = classificationResults.map(result => result.tag)
          results.push({
            postId: post.id,
            tags
          })
        }
      }

      await this.updatePostsWithTags(results)

      return results

    } catch (error) {
      console.error('Error in reclassification:', error)
      throw error
    }
  }

  /**
   * Get available categories từ centralized source
   */
  getCategories() {
    return this.getAvailableCategories()
  }

  /**
   * Preview classification cho testing
   */
  previewClassification(caption) {
    try {
      const results = this.classifyPost(caption)
      return {
        tags: results.map(r => r.tag),
        confidence: results.map(r => r.confidence),
        hasResults: results.length > 0
      }
    } catch (error) {
      console.error('Preview classification error:', error)
      return {
        tags: [],
        confidence: [],
        hasResults: false
      }
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const postClassificationService = new PostClassificationService()

// =============================================================================
// INTEGRATION HELPER FUNCTIONS (Simplified)
// =============================================================================

/**
 * Helper function để integrate vào createPost flow
 */
export const classifyNewPost = async (postId, caption) => {
  return await postClassificationService.classifyAndUpdatePost(postId, caption)
}

/**
 * Helper function để chạy batch classification
 */
export const runBatchClassification = async (batchSize = 20) => {
  return await postClassificationService.classifyExistingPosts(batchSize)
}

/**
 * Helper function để get stats
 */
export const getClassificationStats = async () => {
  return await postClassificationService.getClassificationStats()
}