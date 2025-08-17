<!--
src/view/News.vue
View trang tin tức với NewsAPI
Logic: Layout header + body với NewsMain component toàn màn hình
-->
<template>
  <div class="news-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <NewsMain />
    </div>
  </div>
</template>

<script>
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import NewsMain from '@/components/NewsMain.vue'
import { useLanguage } from '@/composables/useLanguage'
import '@/firebase/config'

export default {
  name: 'NewsPage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    NewsMain
  },
  setup() {
    const { toggleLanguage } = useLanguage()
    return { toggleLanguage }
  }
}
</script>

<style scoped>
.news-page {
  width: 100vw;
  height: 100vh;
  min-height: 39.4375rem;
  display: flex;
  flex-direction: column;
  background: #2B2D42;
}

.header {
  width: 100%;
  height: 3.5rem;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  background: var(--theme-color);
  flex-shrink: 0;
}

.body {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  background: #2B2D42;
}
</style>