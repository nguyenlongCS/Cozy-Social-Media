<!--
src/components/HomeRight.vue - Refactored
Component sidebar bên phải hiển thị chi tiết bài post
Logic:
- Hiển thị caption, likes, comments của post hiện tại
- Form thêm comment với emoji picker
- Theme support qua CSS variables
- Auto-scroll comments list
- Business logic đã được tách ra composables
-->
<template>
  <div class="right" :style="themeStyles">
    <div v-if="post && post.PostID" class="post-details">
      <!-- Caption section -->
      <div class="caption-section">
        <h3 class="section-title">{{ getText('caption') }}</h3>
        <p class="caption-text">{{ post.Caption || getText('noCaption') }}</p>
        
        <!-- Tags display -->
        <div v-if="post.Tags && post.Tags.length > 0" class="tags-container">
          <div 
            v-for="tag in post.Tags" 
            :key="tag"
            class="tag-pill"
          >
            {{ tag }}
          </div>
        </div>
      </div>

      <!-- Likes section -->
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
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useFirestore } from '@/composables/useFirestore'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useTheme } from '@/composables/useTheme'

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
    const { currentTheme } = useTheme()

    // Reactive state
    const comments = ref([])
    const newComment = ref('')
    const isLoading = ref(false)
    const isLoadingComments = ref(false)
    const showEmojiPicker = ref(false)

    // Theme styles
    const themeStyles = computed(() => ({
      '--current-theme-color': currentTheme.value,
      '--theme-color-20': `${currentTheme.value}33`,
      '--theme-color-10': `${currentTheme.value}1A`,
      '--theme-color-05': `${currentTheme.value}0D`,
    }))

    // Emoji list
    const emojiList = [
      '😊', '😂', '❤️', '😍', '👍', '👏', '🔥', '💯', 
      '😎', '🤔', '😮', '😢', '😡', '🥰', '🤗', '🎉',
      '💪', '👌', '✨', '🌟', '💖', '💕', '🙏', '👀'
    ]

    // Format comment time
    const formatCommentTime = (timestamp) => {
      if (!timestamp) return ''
      
      let date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else {
        date = timestamp instanceof Date ? timestamp : new Date(timestamp)
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

    // Load comments
    const loadComments = async () => {
      if (!props.post.PostID) {
        comments.value = []
        return
      }

      isLoadingComments.value = true

      try {
        const postComments = await getPostComments(props.post.PostID)
        comments.value = postComments
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

    // Handle add comment
    const handleAddComment = async () => {
      if (!user.value || !props.post.PostID || !newComment.value.trim()) return

      isLoading.value = true

      try {
        const commentData = {
          postId: props.post.PostID,
          text: newComment.value.trim(),
          authorId: user.value.uid,
          createdAt: new Date()
        }
        
        await addComment(commentData)
        
        newComment.value = ''
        showEmojiPicker.value = false
        await loadComments()

      } catch (error) {
        console.error('Error adding comment:', error)
        showError(error, 'comment')
      } finally {
        isLoading.value = false
      }
    }

    // Emoji picker methods
    const toggleEmojiPicker = () => {
      showEmojiPicker.value = !showEmojiPicker.value
    }

    const selectEmoji = (emoji) => {
      newComment.value += emoji
      showEmojiPicker.value = false
    }

    // Click outside handler
    const handleClickOutside = (event) => {
      const emojiContainer = event.target.closest('.emoji-container')
      if (!emojiContainer && showEmojiPicker.value) {
        showEmojiPicker.value = false
      }
    }

    // Watchers
    watch(() => props.post, (newPost) => {
      if (newPost && newPost.PostID) {
        loadComments()
      } else {
        comments.value = []
      }
      showEmojiPicker.value = false
    }, { immediate: true, deep: true })

    // Lifecycle
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
      themeStyles,
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
  color: var(--current-theme-color, var(--theme-color));
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
  color: var(--theme-color-20, rgba(255, 235, 124, 0.6));
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--current-theme-color, var(--theme-color));
  margin-bottom: 0.5rem;
}

.caption-section {
  border-bottom: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.2));
  padding-bottom: 0.75rem;
}

.caption-text {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--current-theme-color, rgba(255, 235, 124, 0.9));
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  margin-bottom: 0.75rem;
  opacity: 0.9;
}

/* Tags styling */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.tag-pill {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--theme-color-10, rgba(255, 235, 124, 0.15));
  border: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.4));
  border-radius: 1rem;
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--current-theme-color, var(--theme-color));
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tag-pill:hover {
  background: var(--theme-color-20, rgba(255, 235, 124, 0.25));
  border-color: var(--current-theme-color, rgba(255, 235, 124, 0.6));
  transform: scale(1.05);
}

.likes-section {
  border-bottom: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.2));
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
  color: var(--current-theme-color, rgba(255, 235, 124, 0.8));
  opacity: 0.8;
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

.loading-comments, .no-comments {
  color: var(--theme-color-20, rgba(255, 235, 124, 0.6));
  font-size: 0.75rem;
  text-align: center;
  padding: 1rem 0;
}

.comment-item {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: var(--theme-color-05, rgba(255, 235, 124, 0.05));
  border-radius: 0.5rem;
  border-left: 2px solid var(--theme-color-20, rgba(255, 235, 124, 0.3));
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
  background: url('@/icons/user.png') center/cover var(--current-theme-color, var(--theme-color));
  border: 0.125rem solid var(--theme-color-20, rgba(255, 235, 124, 0.3));
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
  color: var(--current-theme-color, var(--theme-color));
}

.comment-time {
  font-size: 0.625rem;
  color: var(--theme-color-20, rgba(255, 235, 124, 0.6));
}

.comment-text {
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--current-theme-color, rgba(255, 235, 124, 0.9));
  word-wrap: break-word;
  margin-left: 2rem;
  opacity: 0.9;
}

.add-comment {
  border-top: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.2));
  padding-top: 0.75rem;
}

.comment-input {
  width: 100%;
  height: 2rem;
  background: var(--theme-color-10, rgba(255, 235, 124, 0.1));
  border: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.3));
  border-radius: 1rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--current-theme-color, var(--theme-color));
  outline: none;
  margin-bottom: 0.5rem;
}

.comment-input::placeholder {
  color: var(--theme-color-20, rgba(255, 235, 124, 0.6));
}

.comment-input:focus {
  border-color: var(--current-theme-color, var(--theme-color));
  box-shadow: 0 0 0.25rem var(--theme-color-20, rgba(255, 235, 124, 0.3));
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.emoji-container {
  position: relative;
}

.emoji-btn, .send-btn {
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 50%;
  background: var(--theme-color-10, rgba(255, 235, 124, 0.1));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.emoji-btn:hover:not(:disabled), .send-btn:hover:not(:disabled) {
  background: var(--theme-color-20, rgba(255, 235, 124, 0.2));
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

.emoji-picker {
  position: absolute;
  bottom: 2.25rem;
  right: 0;
  width: 12rem;
  max-height: 8rem;
  background: #2B2D42;
  border: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.3));
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
  background: var(--theme-color-20, rgba(255, 235, 124, 0.2));
  transform: scale(1.1);
}

.login-prompt {
  border-top: 1px solid var(--theme-color-20, rgba(255, 235, 124, 0.2));
  padding-top: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--theme-color-20, rgba(255, 235, 124, 0.6));
}
</style>