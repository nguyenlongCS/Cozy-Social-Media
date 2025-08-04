/*
src/composables/usePostActions.js
Composable quản lý các hành động bài viết: xóa, ẩn, tải xuống, báo cáo, chia sẻ
Logic:
- Xóa bài viết hoàn toàn khỏi Firestore (post + comments + likes)
- Ẩn bài viết khỏi Feed (không xóa dữ liệu)
- Tải xuống media của bài viết
- Placeholder cho báo cáo và chia sẻ
- Kiểm tra quyền sở hữu trước khi thực hiện hành động
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

  // Kiểm tra quyền sở hữu bài viết
  const checkPostOwnership = (post, currentUserId) => {
    if (!currentUserId) {
      throw new Error('NOT_AUTHENTICATED')
    }
    if (post.UserID !== currentUserId) {
      throw new Error('PERMISSION_DENIED')
    }
    return true
  }

  // Xóa bài viết hoàn toàn (post + comments + likes)
  const deletePost = async (post, currentUserId) => {
    if (!post?.PostID) {
      throw new Error('INVALID_POST')
    }

    checkPostOwnership(post, currentUserId)
    isLoading.value = true

    try {
      // 1. Xóa tất cả comments của post
      const commentsQuery = query(
        collection(db, 'comments'),
        where('PostID', '==', post.PostID)
      )
      const commentsSnapshot = await getDocs(commentsQuery)

      // 2. Xóa tất cả likes của post
      const likesQuery = query(
        collection(db, 'likes'),
        where('PostID', '==', post.PostID)
      )
      const likesSnapshot = await getDocs(likesQuery)

      // 3. Sử dụng batch để xóa tất cả cùng lúc
      const batch = writeBatch(db)

      // Thêm post vào batch delete
      const postRef = doc(db, 'posts', post.PostID)
      batch.delete(postRef)

      // Thêm comments vào batch delete
      commentsSnapshot.forEach(commentDoc => {
        batch.delete(doc(db, 'comments', commentDoc.id))
      })

      // Thêm likes vào batch delete
      likesSnapshot.forEach(likeDoc => {
        batch.delete(doc(db, 'likes', likeDoc.id))
      })

      // Commit batch delete
      await batch.commit()

      console.log('Post deleted successfully:', {
        postId: post.PostID,
        deletedComments: commentsSnapshot.size,
        deletedLikes: likesSnapshot.size
      })

      showSuccess('deletePost')
      return true

    } catch (error) {
      console.error('Error deleting post:', error)
      showError(error, 'deletePost')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Ẩn bài viết khỏi Feed (soft delete)
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

      console.log('Post hidden successfully:', post.PostID)
      showSuccess('hidePost')
      return true

    } catch (error) {
      console.error('Error hiding post:', error)
      showError(error, 'hidePost')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Tải xuống media của bài viết
  const downloadPostMedia = async (post) => {
    if (!post) {
      throw new Error('INVALID_POST')
    }

    try {
      const mediaItems = []
      
      // Thu thập tất cả media URLs
      if (post.mediaItems && post.mediaItems.length > 0) {
        // Multi-media post
        mediaItems.push(...post.mediaItems)
      } else if (post.MediaURL) {
        // Single media post
        mediaItems.push({
          url: post.MediaURL,
          type: post.MediaType || 'image'
        })
      }

      if (mediaItems.length === 0) {
        showError({ message: 'NO_MEDIA_TO_DOWNLOAD' }, 'download')
        return
      }

      // Download từng media file
      for (let i = 0; i < mediaItems.length; i++) {
        const media = mediaItems[i]
        await downloadFile(media.url, `post_${post.PostID}_${i + 1}`)
      }

      console.log('Downloaded media for post:', post.PostID)
      showSuccess('downloadMedia')

    } catch (error) {
      console.error('Error downloading media:', error)
      showError(error, 'download')
    }
  }

  // Helper function để download file
  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      // Tạo download link
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Cleanup
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error downloading file:', error)
      throw error
    }
  }

  // Báo cáo bài viết (placeholder)
  const reportPost = async (post) => {
    // TODO: Implement report functionality
    console.log('Report post:', post.PostID)
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