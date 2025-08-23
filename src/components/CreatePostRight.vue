<!--
src/components/CreatePostRight.vue - Simplified
Component sidebar bên phải trang CreatePost để nhập content/nội dung bài viết (tùy chọn)
Logic: 
- Nhập content dài (tùy chọn - không bắt buộc)
- Auto-resize textarea khi nhập content
- Content có thể để trống
- Emit content lên parent component
- Layout đơn giản không có preview và hints
-->
<template>
  <div class="createpost-right">
    <!-- Content Section -->
    <div class="content-section">
      <h3 class="section-title">{{ getText('postContent') }} ({{ getText('optional') }})</h3>
      
      <div class="content-input-container">
        <textarea 
          v-model="content"
          ref="contentTextarea"
          :placeholder="getText('writeContent')"
          class="content-input"
          rows="10"
          @input="handleContentInput"
          maxlength="2000"
        ></textarea>
        
        <div class="content-counter">
          <span :class="{ 'limit-warning': content.length >= 1900 }">
            {{ content.length }}/2000
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'CreatePostRight',
  emits: ['content-changed'],
  setup(props, { emit }) {
    const { getText } = useLanguage()
    const content = ref('')
    const contentTextarea = ref(null)

    // Auto-resize textarea khi nhập content
    const adjustTextareaHeight = async () => {
      await nextTick()
      if (contentTextarea.value) {
        contentTextarea.value.style.height = 'auto'
        const scrollHeight = contentTextarea.value.scrollHeight
        const maxHeight = 400 // Max height cho content textarea
        const newHeight = Math.min(scrollHeight, maxHeight)
        contentTextarea.value.style.height = newHeight + 'px'
        contentTextarea.value.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
      }
    }

    // Handle content input
    const handleContentInput = () => {
      adjustTextareaHeight()
      emit('content-changed', content.value.trim())
    }

    // Watch content để emit changes
    watch(content, (newContent) => {
      emit('content-changed', newContent.trim())
    })

    return {
      content,
      contentTextarea,
      getText,
      handleContentInput,
      adjustTextareaHeight
    }
  }
}
</script>

<style scoped>
.createpost-right {
  width: 22.13%;
  height: 100%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  color: var(--theme-color);
  font-size: 0.875rem;
  overflow: hidden;
  padding: 1rem;
}

/* Content Section */
.content-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0 0 0.75rem 0;
}

.content-input-container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-input {
  flex: 1;
  background: var(--theme-color-10);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--theme-color);
  outline: none;
  resize: none;
  line-height: 1.5;
  min-height: 200px;
  max-height: 400px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  font-family: inherit;
}

.content-input:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0.25rem var(--theme-color-20);
}

.content-input::placeholder {
  color: var(--theme-color);
  opacity: 0.6;
}

.content-counter {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  opacity: 0.7;
}

.limit-warning {
  color: #ff6b6b !important;
  font-weight: 600;
}

/* Scrollbar styles */
.content-input::-webkit-scrollbar {
  width: 0.25rem;
}

.content-input::-webkit-scrollbar-track {
  background: var(--theme-color-10);
}

.content-input::-webkit-scrollbar-thumb {
  background: var(--theme-color-20);
  border-radius: 0.125rem;
}

.content-input::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
}
</style>