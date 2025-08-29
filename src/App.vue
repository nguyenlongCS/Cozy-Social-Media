<!--
src/App.vue 
Main App component với clean mobile device detection và blocker
Logic:
- Tích hợp MobileBlocker component sạch sẽ không debug info
- Block toàn bộ app khi sử dụng mobile với multiple detection methods
- Router view chỉ hiển thị khi không phải mobile
- Clean UI chỉ hiển thị thông báo chính
-->
<template>
  <div id="app">
    <!-- Mobile Blocker - Clean version without debug info -->
    <MobileBlocker />
    
    <!-- Main App - Chỉ hiển thị khi không phải mobile -->
    <router-view v-if="!isMobile" />
  </div>
</template>

<script>
import { useMobileDetector } from '@/composables/useMobileDetector'
import MobileBlocker from '@/components/MobileBlocker.vue'

export default {
  name: 'App',
  components: {
    MobileBlocker
  },
  setup() {
    const { isMobile } = useMobileDetector()
    
    return {
      isMobile
    }
  }
}
</script>

<style>
@import './assets/main.css';
</style>