/*
src/composables/usePostActions.js - Refactored
Post actions: delete, hide, download, report
Logic: Post management với ownership validation và batch operations
*/
import { ref } from 'vue'
import { 
  getFirestore, 
  doc, 
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore'
import app from '@/firebase/config'
import { useErrorHandler } from './useErrorHandler'
import { useLanguage } from './useLanguage'

const db = getFirestore(app, 'social-media-db')

export function usePostActions() {
  const isLoading = ref(false)
  const { showError, showSuccess } = useErrorHandler()
  const { getText } = useLanguage()

  // Check post ownership
  const checkPostOwnership = (post, currentUserId) => {
    if (!currentUserId) {
      throw new Error('NOT_AUTHENTICATED')
    }
    if (post.UserID !== currentUserId) {
      throw new Error('PERMISSION_DENIED')
    }
    return true
  }

  // Delete post completely (post + comments + likes)
  const deletePost = async (post, currentUserId) => {
    if (!post?.PostID) {
      throw new Error('INVALID_POST')
    }

    checkPostOwnership(post, currentUserId)
    isLoading.value = true

    try {
      // Get all related data
      const [commentsSnapshot, likesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'comments'), where('PostID', '==', post.PostID))),
        getDocs(query(collection(db, 'likes'), where('PostID', '==', post.PostID)))
      ])

      // Batch delete
      const batch = writeBatch(db)

      // Add post to batch
      batch.delete(doc(db, 'posts', post.PostID))

      // Add comments to batch
      commentsSnapshot.forEach(commentDoc => {
        batch.delete(doc(db, 'comments', commentDoc.id))
      })

      // Add likes to batch
      likesSnapshot.forEach(likeDoc => {
        batch.delete(doc(db, 'likes', likeDoc.id))
      })

      await batch.commit()
      showSuccess('deletePost')
      return true

    } catch (error) {
      showError(error, 'deletePost')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Hide post (soft delete)
  const hidePost = async (post, currentUserId) => {
    if (!post?.PostID) {
      throw new Error('INVALID_POST')
    }

    checkPostOwnership(post, currentUserId)
    isLoading.value = true

    try {
      const postRef = doc(db, 'posts', post.PostID)
      await updateDoc(postRef, {
        Hidden: true,
        HiddenAt: new Date()
      })

      showSuccess('hidePost')
      return true

    } catch (error) {
      showError(error, 'hidePost')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Download post media
  const downloadPostMedia = async (post) => {
    if (!post) {
      throw new Error('INVALID_POST')
    }

    try {
      const mediaItems = []
      
      // Collect media URLs
      if (post.mediaItems?.length > 0) {
        mediaItems.push(...post.mediaItems)
      } else if (post.MediaURL) {
        mediaItems.push({
          url: post.MediaURL,
          type: post.MediaType || 'image'
        })
      }

      if (mediaItems.length === 0) {
        showError({ message: 'NO_MEDIA_TO_DOWNLOAD' }, 'download')
        return
      }

      // Download each media file
      for (let i = 0; i < mediaItems.length; i++) {
        const media = mediaItems[i]
        await downloadFile(media.url, `post_${post.PostID}_${i + 1}`)
      }

      showSuccess('downloadMedia')

    } catch (error) {
      showError(error, 'download')
    }
  }

  // Helper function to download file
  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(link.href)
    } catch (error) {
      throw error
    }
  }

  // Report post (placeholder)
  const reportPost = async (post) => {
    alert(getText('reportComingSoon'))
  }

  return {
    isLoading,
    deletePost,
    hidePost,
    downloadPostMedia,
    reportPost
  }
}