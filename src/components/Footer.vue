<!--
src/components/Footer.vue - Updated with Opacity
Component footer với hiệu ứng làm mờ
Logic: Hiển thị hướng dẫn cuộn và warning khi cuộn quá nhanh với độ mờ
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
  name: 'AppFooter',
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
  /* UPDATED: Làm mờ footer */
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.footer:hover {
  /* UPDATED: Hiển thị rõ hơn khi hover */
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

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(0.625rem); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-0.625rem); }
}
</style>