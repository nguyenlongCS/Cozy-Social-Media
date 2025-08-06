<!--
src/components/Footer.vue - Refactored
Component footer với post counter và scroll warning
Logic: 
- Hiển thị hướng dẫn cuộn với opacity fade
- Post counter ở góc phải
- Scroll warning animation
-->
<template>
  <div class="footer">
    <div class="footer-content">
      {{ getText('scrollToNext') }}
    </div>
    <div v-if="scrollTooFast" class="scroll-warning">
      {{ getText('scrollTooFast') }}
    </div>
    
    <div v-if="totalPosts > 0" class="post-counter">
      {{ currentPostIndex + 1 }}/{{ totalPosts }}
    </div>
  </div>
</template>

<script>
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'AppFooter',
  props: {
    scrollTooFast: {
      type: Boolean,
      default: false
    },
    currentPostIndex: {
      type: Number,
      default: 0
    },
    totalPosts: {
      type: Number,
      default: 0
    }
  },
  setup() {
    const { getText } = useLanguage()
    return { getText }
  }
}
</script>

<style scoped>
.footer {
  width: 100%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 -0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  color: #000;
  font-size: 0.875rem;
  font-weight: 500;
  position: relative;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.footer:hover {
  opacity: 1;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-warning {
  position: absolute;
  bottom: 0.3125rem;
  font-size: 0.75rem;
  color: #d32f2f;
  font-weight: 600;
  animation: fadeInOut 2s ease-in-out;
}

.post-counter {
  position: absolute;
  bottom: 0.5rem;
  right: 1rem;
  font-size: 0.75rem;
  color: #000;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  backdrop-filter: blur(2px);
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(0.625rem); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-0.625rem); }
}
</style>