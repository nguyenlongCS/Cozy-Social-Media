<!--
src/components/HomeRight.vue - Updated with Fixed Caption Display
Component sidebar bên phải - Chi tiết bài post với caption không xuống hàng
Logic:
- Hiển thị Caption, likes, comments của post hiện tại với fields mới
- Caption không xuống hàng, hiển thị liên tiếp với ellipsis nếu quá dài
- Load và hiển thị comments với structure mới (CommentID, PostID, UserID, UserName, etc.)
- Form thêm comment mới với emoji picker dropdown
- Hiển thị avatar bên trái comment-author cho mỗi comment
- Sử dụng fields mới: PostID, UserName, Avatar, Caption, Created, Content
-->
<template>
  <div class="right">
    <div v-if="post && post.PostID" class="post-details">
      <!-- Caption section -->
      <div class="caption-section">
        <h3 class="section-title">{{ getText('caption') }}</h3>
        <p class="caption-text">{{ post.Caption || getText('noCaption') }}</p>
      </div>

      <!-- Likes section - READ ONLY -->
      <div class="likes-section">
        <div class="likes-info">
          <div class="like-display">
            <div class="like-icon"></div>
          </div>
          <span class="likes-count">{{ post.likes || 0 }} {{ getText('likes') }}</span>
        </div>
      </div>

      <!-- Comments section -->
      <div class="comments-section">
        <h3 class="section-title">{{ getText('comments') }} ({{ comments.length }})</h3>
        
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
            :key="comment.CommentID"
            class="comment-item"
          >
            <div class="comment-header">
              <div class="comment-avatar" :style="{ backgroundImage: comment.Avatar ? `url(${comment.Avatar})` : '' }"></div>
              <div class="comment-meta">
                <div class="comment-author">{{ comment.UserName }}</div>
                <div class="comment-time">{{ formatCommentTime(comment.Created) }}</div>
              </div>
            </div>
            <div class="comment-text">{{ comment.Content }}</div>
          </div>
        </div>

        <!-- Add comment form -->
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
            <div class="emoji-container">
              <button 
                class="emoji-btn"
                @click="toggleEmojiPicker"
                :disabled="isLoading"
              >
                <div class="emoji-icon">😊</div>
              </button>
              
              <!-- Emoji Picker Dropdown -->
              <div v-if="showEmojiPicker" class="emoji-picker">
                <div class="emoji-grid">
                  <button 
                    v-for="emoji in emojiList" 
                    :key="emoji"
                    class="emoji-option"
                    @click="selectEmoji(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>
            
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

    <div v-else class="no-post">
      {{ getText('selectPost') }}
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue'
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
    const { addComment, getPostComments } = useFirestore()
    const { showError } = useErrorHandler()

    // Reactive data - Loại bỏ like-related states
    const comments = ref([])
    const newComment = ref('')
    const isLoading = ref(false)
    const isLoadingComments = ref(false)
    const showEmojiPicker = ref(false)

    // Emoji list for picker
    const emojiList = [
      '😊', '😂', '❤️', '😍', '👍', '👏', '🔥', '💯', 
      '😎', '🤔', '😮', '😢', '😡', '🥰', '🤗', '🎉',
      '💪', '👌', '✨', '🌟', '💖', '💕', '🙏', '👀'
    ]

    // Methods - Loại bỏ handleLike
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
        if (diffInMinutes <= 1) {
          return getText('justNow')
        }
        return `${diffInMinutes}${getText('minutesAgo')}`
      } else if (diffInHours < 24) {
        return `${diffInHours}${getText('hoursAgo')}`
      } else {
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays}${getText('daysAgo')}`
      }
    }

    const loadComments = async () => {
      if (!props.post.PostID) {
        comments.value = []
        return
      }

      isLoadingComments.value = true
      console.log('Loading comments for PostID:', props.post.PostID)

      try {
        const postComments = await getPostComments(props.post.PostID)
        comments.value = postComments
        console.log('Loaded comments:', postComments)
      } catch (error) {
        console.error('Error loading comments:', error)
        if (error.code !== 'permission-denied' && error.code !== 'unauthenticated') {
          showError(error, 'loadComments')
        }
        comments.value = []
      } finally {
        isLoadingComments.value = false
      }
    }

    const handleAddComment = async () => {
      if (!user.value || !props.post.PostID || !newComment.value.trim()) {
        return
      }

      isLoading.value = true
      console.log('Adding comment for PostID:', props.post.PostID)

      try {
        const commentData = {
          postId: props.post.PostID,
          text: newComment.value.trim(),
          authorId: user.value.uid,
          createdAt: new Date()
        }

        console.log('Comment data:', commentData)
        
        const savedComment = await addComment(commentData)
        console.log('Comment saved successfully:', savedComment)
        
        newComment.value = ''
        showEmojiPicker.value = false // Đóng emoji picker sau khi comment
        await loadComments()

      } catch (error) {
        console.error('Error adding comment:', error)
        showError(error, 'comment')
      } finally {
        isLoading.value = false
      }
    }

    // Toggle emoji picker visibility
    const toggleEmojiPicker = () => {
      showEmojiPicker.value = !showEmojiPicker.value
    }

    // Select emoji và thêm vào comment input
    const selectEmoji = (emoji) => {
      newComment.value += emoji
      showEmojiPicker.value = false // Đóng picker sau khi chọn
    }

    // Close emoji picker khi click outside
    const handleClickOutside = (event) => {
      const emojiContainer = event.target.closest('.emoji-container')
      if (!emojiContainer && showEmojiPicker.value) {
        showEmojiPicker.value = false
      }
    }

    // Watchers
    watch(() => props.post, (newPost) => {
      console.log('Post changed:', newPost)
      if (newPost && newPost.PostID) {
        loadComments()
      } else {
        comments.value = []
      }
      // Đóng emoji picker khi chuyển post
      showEmojiPicker.value = false
    }, { immediate: true, deep: true })

    // Lifecycle hooks
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      user,
      comments,
      newComment,
      isLoading,
      isLoadingComments,
      showEmojiPicker,
      emojiList,
      getText,
      formatCommentTime,
      handleAddComment,
      toggleEmojiPicker,
      selectEmoji
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
  /* UPDATED: Caption hiển thị đầy đủ nội dung - có thể xuống hàng */
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
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

.like-display {
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.like-icon {
  width: 1.25rem;
  height: 1.25rem;
  background: url('@/icons/like.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
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

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.comment-avatar {
  width: 1.5rem;
  height: 1.5rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid rgba(255, 235, 124, 0.3);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.comment-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.comment-author {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--theme-color);
}

.comment-time {
  font-size: 0.625rem;
  color: rgba(255, 235, 124, 0.6);
}

.comment-text {
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(255, 235, 124, 0.9);
  word-wrap: break-word;
  margin-left: 2rem; /* Indent text để align với avatar */
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

/* Emoji Container với Relative Positioning */
.emoji-container {
  position: relative;
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
  background: url('@/icons/send.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
}

/* Emoji Picker Dropdown */
.emoji-picker {
  position: absolute;
  bottom: 2.25rem; /* Hiển thị phía trên emoji button */
  right: 0;
  width: 12rem;
  max-height: 8rem;
  background: #2B2D42;
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-radius: 0.5rem;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3);
  z-index: 10;
  overflow: hidden;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.125rem;
  padding: 0.5rem;
  max-height: 7rem;
  overflow-y: auto;
}

.emoji-grid::-webkit-scrollbar {
  width: 0.25rem;
}

.emoji-grid::-webkit-scrollbar-track {
  background: rgba(255, 235, 124, 0.1);
  border-radius: 0.125rem;
}

.emoji-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 235, 124, 0.3);
  border-radius: 0.125rem;
}

.emoji-option {
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: transparent;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.emoji-option:hover {
  background: rgba(255, 235, 124, 0.2);
  transform: scale(1.1);
}

.login-prompt {
  border-top: 1px solid rgba(255, 235, 124, 0.2);
  padding-top: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.6);
}
</style>