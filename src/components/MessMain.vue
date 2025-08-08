<!--
src/components/MessMain.vue
Component chính hiển thị nội dung tin nhắn của người dùng được chọn
Logic:
- Hiển thị danh sách tin nhắn giữa current user và selected partner
- Form gửi tin nhắn mới với emoji picker
- Auto scroll to bottom khi có tin nhắn mới
- Real-time updates với Realtime Database listener
- Message status: sent/received, read/unread
-->
<template>
  <div class="mess-main">
    <!-- No conversation selected -->
    <div v-if="!selectedPartnerId" class="no-conversation">
      <div class="no-conversation-content">
        <div class="message-icon"></div>
        <h3 class="no-conversation-title">{{ getText('selectConversation') }}</h3>
        <p class="no-conversation-text">{{ getText('chooseConversationToStart') }}</p>
      </div>
    </div>

    <!-- Active conversation -->
    <div v-else class="conversation-container">
      <!-- Conversation header -->
      <div class="conversation-header">
        <div class="partner-info">
          <div 
            class="partner-avatar"
            :style="{ backgroundImage: partnerInfo?.partnerAvatar ? `url(${partnerInfo.partnerAvatar})` : '' }"
          ></div>
          <div class="partner-details">
            <h3 class="partner-name">{{ partnerInfo?.partnerName || getText('unknownUser') }}</h3>
            <span class="online-status">{{ getText('online') }}</span>
          </div>
        </div>
      </div>

      <!-- Messages list -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="isLoadingMessages" class="loading-messages">
          {{ getText('loading') }}...
        </div>
        
        <div v-else-if="messages.length === 0" class="no-messages">
          <div class="no-messages-icon"></div>
          <p>{{ getText('noMessagesYet') }}</p>
          <p class="no-messages-hint">{{ getText('sendFirstMessage') }}</p>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-item"
            :class="{
              'message-sent': message.senderId === currentUserId,
              'message-received': message.senderId !== currentUserId
            }"
          >
            <div class="message-bubble">
              <div class="message-content">{{ message.content }}</div>
              <div class="message-meta">
                <span class="message-time">{{ formatMessageTime(message.timestamp) }}</span>
                <div 
                  v-if="message.senderId === currentUserId"
                  class="message-status"
                  :class="getMessageStatusClass(message)"
                  :title="getMessageStatusTooltip(message)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message input -->
      <div class="message-input-container">
        <div class="message-input-wrapper">
          <textarea
            v-model="newMessage"
            ref="messageInput"
            :placeholder="getText('typeMessage')"
            class="message-input"
            rows="1"
            @keypress.enter.exact="handleSendMessage"
            @input="adjustTextareaHeight"
            maxlength="1000"
          ></textarea>
          
          <div class="input-actions">
            <!-- Emoji picker -->
            <div class="emoji-container">
              <button
                class="emoji-btn"
                @click="toggleEmojiPicker"
                :disabled="isSending"
              >
                <div class="emoji-icon">😊</div>
              </button>
              
              <!-- Emoji picker dropdown -->
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
            
            <!-- Send button -->
            <button
              class="send-btn"
              @click="handleSendMessage"
              :disabled="!canSendMessage || isSending"
            >
              <div class="send-icon"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useMessages } from '@/composables/useMessages'
import { useLanguage } from '@/composables/useLanguage'
import { useErrorHandler } from '@/composables/useErrorHandler'

export default {
  name: 'MessMain',
  props: {
    selectedPartnerId: {
      type: String,
      default: null
    },
    partnerInfo: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['message-sent', 'conversation-updated'],
  setup(props, { emit }) {
    const { user } = useAuth()
    const { 
      currentMessages: messages,
      isLoading: isLoadingMessages,
      sendMessage,
      getConversationMessages,
      markMessagesAsRead,
      markMessageAsDelivered,
      setupMessagesListener,
      cleanupListeners
    } = useMessages()
    const { getText } = useLanguage()
    const { showError } = useErrorHandler()

    // Reactive state
    const newMessage = ref('')
    const isSending = ref(false)
    const showEmojiPicker = ref(false)
    const messagesContainer = ref(null)
    const messageInput = ref(null)

    // Emoji list
    const emojiList = [
      '😊', '😂', '❤️', '😍', '👍', '👏', '🔥', '💯',
      '😎', '🤔', '😮', '😢', '😡', '🥰', '🤗', '🎉',
      '💪', '👌', '✨', '🌟', '💖', '💕', '🙏', '👀'
    ]

    // Computed properties
    const currentUserId = computed(() => user.value?.uid)
    
    const canSendMessage = computed(() => {
      return newMessage.value.trim().length > 0 && props.selectedPartnerId && currentUserId.value
    })

    // Auto-resize textarea
    const adjustTextareaHeight = async () => {
      await nextTick()
      if (messageInput.value) {
        messageInput.value.style.height = 'auto'
        const scrollHeight = messageInput.value.scrollHeight
        const maxHeight = 120 // Max 4 lines
        const newHeight = Math.min(scrollHeight, maxHeight)
        messageInput.value.style.height = newHeight + 'px'
        
        if (scrollHeight > maxHeight) {
          messageInput.value.style.overflowY = 'auto'
        } else {
          messageInput.value.style.overflowY = 'hidden'
        }
      }
    }

    // Scroll to bottom of messages
    const scrollToBottom = async () => {
      await nextTick()
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    // Get message status class
    const getMessageStatusClass = (message) => {
      if (message.isRead) {
        return 'status-read'
      } else if (message.isDelivered) {
        return 'status-delivered'
      } else {
        return 'status-sent'
      }
    }

    // Get message status tooltip
    const getMessageStatusTooltip = (message) => {
      if (message.isRead) {
        return getText('messageRead')
      } else if (message.isDelivered) {
        return getText('messageDelivered')
      } else {
        return getText('messageSent')
      }
    }
    const formatMessageTime = (timestamp) => {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      const now = new Date()
      const diffInMs = now - date
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      
      if (diffInHours < 24) {
        // Same day - show time only
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffInHours < 24 * 7) {
        // This week - show day and time
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      } else {
        // Older - show date and time
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }
    }

    // Send message
    const handleSendMessage = async (event) => {
      if (event?.preventDefault) event.preventDefault()
      
      if (!canSendMessage.value || isSending.value) return

      const messageContent = newMessage.value.trim()
      if (!messageContent) return

      isSending.value = true

      try {
        await sendMessage(currentUserId.value, props.selectedPartnerId, messageContent)
        
        newMessage.value = ''
        showEmojiPicker.value = false
        
        await nextTick()
        adjustTextareaHeight()
        scrollToBottom()
        
        emit('message-sent')
        emit('conversation-updated')
      } catch (error) {
        showError(error, 'message')
      } finally {
        isSending.value = false
      }
    }

    // Emoji picker methods
    const toggleEmojiPicker = () => {
      showEmojiPicker.value = !showEmojiPicker.value
    }

    const selectEmoji = (emoji) => {
      newMessage.value += emoji
      showEmojiPicker.value = false
      adjustTextareaHeight()
    }

    // Click outside handler
    const handleClickOutside = (event) => {
      const emojiContainer = event.target.closest('.emoji-container')
      if (!emojiContainer && showEmojiPicker.value) {
        showEmojiPicker.value = false
      }
    }

    // Load conversation messages
    const loadConversationMessages = async () => {
      if (!props.selectedPartnerId || !currentUserId.value) {
        return
      }

      try {
        await getConversationMessages(currentUserId.value, props.selectedPartnerId)
        
        // Mark messages as read khi mở conversation
        await markMessagesAsRead(currentUserId.value, props.selectedPartnerId)
        
        setTimeout(scrollToBottom, 100)
        emit('conversation-updated')
      } catch (error) {
        console.error('Error loading conversation messages:', error)
        showError(error, 'loadMessages')
      }
    }

    // Setup real-time listener
    const setupRealtimeListener = () => {
      if (props.selectedPartnerId && currentUserId.value) {
        setupMessagesListener(currentUserId.value, props.selectedPartnerId)
      }
    }

    // Watchers
    watch(() => props.selectedPartnerId, async (newPartnerId, oldPartnerId) => {
      if (newPartnerId && currentUserId.value) {
        cleanupListeners()
        await loadConversationMessages()
        setupRealtimeListener()
      } else {
        cleanupListeners()
      }
    }, { immediate: true })

    watch(messages, (newMessages) => {
      setTimeout(scrollToBottom, 100)
    }, { deep: true, flush: 'post' })

    watch(currentUserId, (newUserId) => {
      if (newUserId && props.selectedPartnerId) {
        setupRealtimeListener()
      }
    })

    // Lifecycle
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
      if (props.selectedPartnerId && currentUserId.value) {
        loadConversationMessages()
        setupRealtimeListener()
      }
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
      cleanupListeners()
    })

    return {
      messages,
      isLoadingMessages,
      newMessage,
      isSending,
      showEmojiPicker,
      messagesContainer,
      messageInput,
      emojiList,
      currentUserId,
      canSendMessage,
      getText,
      adjustTextareaHeight,
      handleSendMessage,
      toggleEmojiPicker,
      selectEmoji,
      formatMessageTime,
      getMessageStatusClass,
      getMessageStatusTooltip
    }
  }
}
</script>

<style scoped>
.mess-main {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* No conversation state */
.no-conversation {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.no-conversation-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.message-icon {
  width: 4rem;
  height: 4rem;
  background: url('@/icons/mess.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
  opacity: 0.6;
}

.no-conversation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0;
}

.no-conversation-text {
  font-size: 0.875rem;
  color: rgba(255, 235, 124, 0.7);
  margin: 0;
}

/* Active conversation */
.conversation-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Conversation header */
.conversation-header {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--theme-color);
  background: #2B2D42;
}

.partner-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.partner-avatar {
  width: 2.5rem;
  height: 2.5rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.partner-details {
  flex: 1;
}

.partner-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 0.125rem 0;
}

.online-status {
  font-size: 0.75rem;
  color: rgba(255, 235, 124, 0.6);
}

/* Messages container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.875rem;
}

.no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 0.5rem;
}

.no-messages-icon {
  width: 3rem;
  height: 3rem;
  background: url('@/icons/mess.png') center/cover;
  filter: brightness(0) saturate(100%) invert(78%) sepia(35%) saturate(348%) hue-rotate(34deg) brightness(105%) contrast(105%);
  opacity: 0.4;
}

.no-messages p {
  color: rgba(255, 235, 124, 0.6);
  font-size: 0.875rem;
  margin: 0;
}

.no-messages-hint {
  font-size: 0.75rem !important;
  opacity: 0.8;
}

/* Messages list */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message-item {
  display: flex;
  align-items: flex-end;
}

.message-item.message-sent {
  justify-content: flex-end;
}

.message-item.message-received {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 0.5rem 0.75rem;
  border-radius: 1rem;
  position: relative;
}

.message-sent .message-bubble {
  background: var(--theme-color);
  color: #2B2D42;
  border-bottom-right-radius: 0.25rem;
}

.message-received .message-bubble {
  background: rgba(255, 235, 124, 0.15);
  color: var(--theme-color);
  border: 1px solid rgba(255, 235, 124, 0.3);
  border-bottom-left-radius: 0.25rem;
}

.message-content {
  font-size: 0.875rem;
  line-height: 1.4;
  word-wrap: break-word;
  white-space: pre-wrap;
  margin-bottom: 0.25rem;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.message-time {
  font-size: 0.625rem;
  opacity: 0.7;
}

.message-sent .message-time {
  color: rgba(43, 45, 66, 0.7);
}

.message-received .message-time {
  color: rgba(255, 235, 124, 0.6);
}

.message-status {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-sent {
  background: rgba(43, 45, 66, 0.5);
  border: 1px solid rgba(43, 45, 66, 0.7);
}

.status-delivered {
  background: #FFA726;
  border: 1px solid #FF9800;
}

.status-read {
  background: #4CAF50;
  border: 1px solid #4CAF50;
}

/* Message input */
.message-input-container {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--theme-color);
  background: #2B2D42;
}

.message-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: #2B2D42;
  border: 1px solid var(--theme-color);
  border-radius: 1.5rem;
  padding: 0.5rem;
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--theme-color);
  font-size: 0.875rem;
  line-height: 1.4;
  resize: none;
  min-height: 1.5rem;
  max-height: 7.5rem;
  overflow-y: hidden;
  padding: 0.25rem 0.5rem;
}

.message-input::placeholder {
  color: rgba(255, 235, 124, 0.6);
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Emoji picker */
.emoji-container {
  position: relative;
}

.emoji-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.emoji-btn:hover:not(:disabled) {
  background: rgba(255, 235, 124, 0.2);
  transform: scale(1.1);
}

.emoji-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.emoji-icon {
  font-size: 1rem;
}

.emoji-picker {
  position: absolute;
  bottom: 2.5rem;
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

/* Send button */
.send-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: var(--theme-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 0.125rem 0.25rem rgba(255, 235, 124, 0.4);
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.send-icon {
  width: 1rem;
  height: 1rem;
  background: url('@/icons/send.png') center/cover;
  filter: brightness(0) saturate(100%) invert(16%) sepia(15%) saturate(1180%) hue-rotate(202deg) brightness(94%) contrast(96%);
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 0.25rem;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(255, 235, 124, 0.1);
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 235, 124, 0.3);
  border-radius: 0.125rem;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 235, 124, 0.5);
}
</style>