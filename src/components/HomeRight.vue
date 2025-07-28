<!--
src/components/HomeRight.vue
Component sidebar bên phải hiển thị chi tiết bài post
Comment Logic:
- Load comments khi component nhận post từ HomeMain
- Hiển thị danh sách comments với authorName, text, createdAt
- Form nhập comment mới với validation
- Real-time update comments sau khi thêm
- Format thời gian hiển thị (vừa xong, x phút trước, x giờ trước, x ngày trước)
Logic:
- Nhận currentPost từ HomeMain thông qua props
- Hiển thị caption, số lượt like, danh sách comments
- Thanh nhập comment với button thả emoji
- Sử dụng Firestore để lưu và load comments
- Sử dụng Firestore để update số lượt like
- Chỉ hiển thị khi có bài post, ẩn khi không có
-->
<template>
  <div class="right">
    <!-- Hiển thị khi có post -->
    <div v-if="post && post.id" class="post-details">
      <!-- Caption -->
      <div class="caption-section">
        <h3 class="section-title">{{ getText('caption') }}</h3>
        <p class="caption-text">{{ post.caption || getText('noCaption') }}</p>
      </div>

      <!-- Likes -->
      <div class="likes-section">
        <div class="likes-info">
          <button 
            class="like-btn" 
            @click="handleLike" 
            :disabled="isLoading"
            :class="{ liked: isLikedByUser }"
          >
            <div class="like-icon"></div>
          </button>
          <span class="likes-count">{{ post.likes || 0 }} {{ getText('likes') }}</span>
        </div>
      </div>

      <!-- Comments -->
      <div class="comments-section">
        <h3 class="section-title">{{ getText('comments') }} ({{ comments.length }})</h3>
        
        <!-- Comments list -->
        <div class="comments-list">
          <div v-if="isLoadingComments" class="loading-comments">
            {{ getText('loading') }}...
          </div>
          <div v-else-if="comments.length === 0" class="no-comments">
            {{ getText('noComments') }}
          </div>
          <div 
            v-else
            v-for="comment in comments" 
            :key="comment.id"
            class="comment-item"
          >
            <div class="comment-author">{{ comment.authorName }}</div>
            <div class="comment-text">{{ comment.text }}</div>
            <div class="comment-time">{{ formatCommentTime(comment.createdAt) }}</div>
          </div>
        </div>

        <!-- Add comment -->
        <div v-if="user" class="add-comment">
          <input 
            type="text"
            v-model="newComment"
            :placeholder="getText('writeComment')"
            class="comment-input"
            @keypress.enter="handleAddComment"
            maxlength="200"
          >
          <div class="comment-actions">
            <button 
              class="emoji-btn"
              @click="handleAddEmoji"
              :disabled="isLoading"
            >
              <div class="emoji-icon">😊</div>
            </button>
            <button 
              class="send-btn"
              @click="handleAddComment"
              :disabled="!newComment.trim() || isLoading"
            >
              <div class="send-icon"></div>
            </button>
          </div>
        </div>
        <div v-else class="login-prompt">
          {{ getText('loginToComment') }}
        </div>
      </div>
    </div>

    <!-- Hiển thị khi không có post -->
    <div v-else class="no-post">
      {{ getText('selectPost') }}
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useFirestore } from '@/composables/useFirestore'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'HomeRight',
  props: {
    post: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const { user } = useAuth()
    const { getText } = useLanguage()
    const { updatePostLikes, addComment, getPostComments } = useFirestore()
    const { showError } = useErrorHandler()

    // Reactive data
    const comments = ref([])
    const newComment = ref('')
    const isLoading = ref(false)
    const isLoadingComments = ref(false)
    const userLikes = ref(new Set()) // Track which posts user has liked

    // Computed
    const isLikedByUser = computed(() => {
      return user.value && userLikes.value.has(props.post.id)
    })

    // Format comment timestamp
    const formatCommentTime = (timestamp) => {
      if (!timestamp) return ''
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        date = timestamp
      } else {
        date = new Date(timestamp)
      }
      
      const now = new Date()
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60))
        return diffInMinutes <= 1 ? getText('justNow') : `${diffInMinutes}${getText('minutesAgo')}`
      } else if (diffInHours < 24) {
        return `${diffInHours}${getText('hoursAgo')}`
      } else {
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays}${getText('daysAgo')}`
      }
    }

    // Load comments for current post
    const loadComments = async () => {
      if (!props.post.id) {
        comments.value = []
        return
      }

      isLoadingComments.value = true
      console.log('Loading comments for post:', props.post.id)

      try {
        const postComments = await getPostComments(props.post.id)
        comments.value = postComments
        console.log('Loaded comments:', postComments)
      } catch (error) {
        console.error('Error loading comments:', error)
        // Chỉ hiển thị error nếu không phải lỗi authentication
        if (error.code !== 'permission-denied' && error.code !== 'unauthenticated') {
          showError(error, 'loadComments')
        }
        // Set empty array nếu có lỗi
        comments.value = []
      } finally {
        isLoadingComments.value = false
      }
    }

    // Handle like/unlike post
    const handleLike = async () => {
      if (!user.value || !props.post.id) {
        // Không hiển thị error nếu user chưa đăng nhập
        return
      }

      isLoading.value = true

      try {
        const isCurrentlyLiked = isLikedByUser.value
        const newLikeCount = isCurrentlyLiked 
          ? (props.post.likes || 0) - 1 
          : (props.post.likes || 0) + 1

        // Update UI optimistically
        if (isCurrentlyLiked) {
          userLikes.value.delete(props.post.id)
        } else {
          userLikes.value.add(props.post.id)
        }
        
        // Update post likes in parent component (emit event)
        props.post.likes = newLikeCount

        // Update in Firestore
        await updatePostLikes(props.post.id, newLikeCount, user.value.uid, !isCurrentlyLiked)

      } catch (error) {
        console.error('Error updating like:', error)
        showError(error, 'like')
        
        // Revert optimistic update on error
        if (isLikedByUser.value) {
          userLikes.value.delete(props.post.id)
        } else {
          userLikes.value.add(props.post.id)
        }
      } finally {
        isLoading.value = false
      }
    }

    // Handle add comment
    const handleAddComment = async () => {
      if (!user.value || !props.post.id) {
        // Không hiển thị error nếu user chưa đăng nhập
        return
      }

      if (!newComment.value.trim()) {
        return
      }

      isLoading.value = true
      console.log('Adding comment for post:', props.post.id)

      try {
        const commentData = {
          postId: props.post.id,
          text: newComment.value.trim(),
          authorId: user.value.uid,
          authorName: user.value.displayName || user.value.email || getText('user'),
          createdAt: new Date()
        }

        console.log('Comment data:', commentData)
        
        // Lưu comment vào Firestore
        const savedComment = await addComment(commentData)
        console.log('Comment saved successfully:', savedComment)
        
        // Clear input
        newComment.value = ''
        
        // Reload comments sau khi lưu thành công
        await loadComments()

      } catch (error) {
        console.error('Error adding comment:', error)
        showError(error, 'comment')
      } finally {
        isLoading.value = false
      }
    }

    // Handle add emoji
    const handleAddEmoji = () => {
      const emojis = ['😊', '👍', '❤️', '😍', '😂', '🔥', '💯', '👏']
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
      newComment.value += randomEmoji
    }

    // Watch for post changes to load comments
    watch(() => props.post, (newPost) => {
      console.log('Post changed:', newPost)
      if (newPost && newPost.id) {
        loadComments()
      } else {
        comments.value = []
      }
    }, { immediate: true, deep: true }) // Load ngay khi component mount

    return {
      user,
      comments,
      newComment,
      isLoading,
      isLoadingComments,
      isLikedByUser,
      getText,
      formatCommentTime,
      handleLike,
      handleAddComment,
      handleAddEmoji,
      loadComments
    }
  }
}
</script>

<style scoped>
.right {
  width: 22.13%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  color: var(--theme-color);
  font-size: 0.875rem;
  overflow: hidden;
}

.post-details {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
}

.no-post {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
  margin-bottom: 0.5rem;
}

.caption-section {
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
  padding-bottom: 0.75rem;
}

.caption-text {
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(255, 235, 124, 0.9);
  word-wrap: break-word;
}

.likes-section {
  border-bottom: 1px solid rgba(255, 235, 124, 0.2);
  padding-bottom: 0.75rem;
}

.likes-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.like-btn {
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.like-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.like-icon {
  width: 1.25rem;
  height: 1.25rem;
  background: url('src/icons/like.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.like-btn.liked .like-icon {
  filter: brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(7471%) hue-rotate(358deg) brightness(102%) contrast(117%);
}

.likes-count {
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.8);
}

.comments-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 0.75rem;
  padding-right: 0.25rem;
}

.comments-list::-webkit-scrollbar {
  width: 0.25rem;
}

.comments-list::-webkit-scrollbar-track {
  background: rgba(255, 235, 124, 0.1);
  border-radius: 0.125rem;
}

.comments-list::-webkit-scrollbar-thumb {
  background: rgba(255, 235, 124, 0.3);
  border-radius: 0.125rem;
}

.loading-comments, .no-comments {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.75rem;
  text-align: center;
  padding: 1rem 0;
}

.comment-item {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(255, 235, 124, 0.05);
  border-radius: 0.5rem;
  border-left: 2px solid rgba(255, 235, 124, 0.3);
}

.comment-author {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 0.25rem;
}

.comment-text {
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(255, 235, 124, 0.9);
  margin-bottom: 0.25rem;
  word-wrap: break-word;
}

.comment-time {
  font-size: 0.625rem;
  color: rgba(255, 235, 124, 0.6);
}

.add-comment {
  border-top: 1px solid rgba(255, 235, 124, 0.2);
  padding-top: 0.75rem;
}

.comment-input {
  width: 100%;
  height: 2rem;
  background: rgba(255, 235, 124, 0.1);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 1rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  outline: none;
  margin-bottom: 0.5rem;
}

.comment-input::placeholder {
  color: rgba(255, 235, 124, 0.6);
}

.comment-input:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0.25rem rgba(255, 235, 124, 0.3);
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.emoji-btn, .send-btn {
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 235, 124, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.emoji-btn:hover:not(:disabled), .send-btn:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
  transform: scale(1.1);
}

.emoji-btn:disabled, .send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.emoji-icon {
  font-size: 0.875rem;
}

.send-icon {
  width: 1rem;
  height: 1rem;
  background: url('src/icons/send.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

.login-prompt {
  border-top: 1px solid rgba(255, 235, 124, 0.2);
  padding-top: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.6);
}
</style>