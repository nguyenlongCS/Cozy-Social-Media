<!--
src/components/Footer.vue
Component footer
Hiển thị hướng dẫn cuộn và thông báo cuộn quá nhanh
Logic:
- Hiển thị "Cuộn để xem bài viết tiếp theo" 
- Nhận props scrollTooFast để hiển thị cảnh báo
- Chuyển đổi ngôn ngữ thông qua useLanguage
-->
<template>
  <div class="footer">
    <div class="footer-content">
      {{ getText('scrollToNext') }}
    </div>
    <div v-if="scrollTooFast" class="scroll-warning">
      {{ getText('scrollTooFast') }}
    </div>
  </div>
</template>

<script>
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'Footer',
  props: {
    scrollTooFast: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const { getText } = useLanguage()

    return {
      getText
    }
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

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(0.625rem); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-0.625rem); }
}
</style>