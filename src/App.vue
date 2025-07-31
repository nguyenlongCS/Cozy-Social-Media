<!--
src/App.vue - Updated with NewsAPI Integration
Main App component với tích hợp auto news posting
Logic:
- Khởi tạo useNewsAPI để bắt đầu auto posting
- Không thay đổi giao diện, chỉ thêm background logic
- Auto posting chạy ngầm mỗi giờ
-->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useNewsAPI } from '@/composables/useNewsAPI'

export default {
  name: 'App',
  setup() {
    // Khởi tạo NewsAPI auto posting
    const { getAutoPostStatus } = useNewsAPI()

    onMounted(() => {
      // Log status để debug
      const status = getAutoPostStatus()
      console.log('NewsAPI Auto Posting Status:', status)
      
      if (!status.hasApiKey) {
        console.warn('⚠️ NewsAPI key not configured. Please add VITE_NEWS_API_KEY to .env file')
      } else {
        console.log('✅ NewsAPI auto posting initialized successfully')
      }
    })

    return {}
  }
}
</script>

<style>
@import './assets/main.css';
</style>