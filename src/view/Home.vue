<!--
src/view/Home.vue - Updated with Post Counter
View trang chủ với post counter cho Footer
Logic: 
- Nhận showScrollWarning từ HomeMain component
- Nhận currentPost và postStats từ HomeMain để pass sang HomeRight và Footer
- Truyền scrollTooFast và post counter props xuống Footer component
- Xử lý chuyển đổi ngôn ngữ thông qua useLanguage
-->
<template>
  <div class="home">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft />
      <HomeMain 
        @scroll-warning="handleScrollWarning" 
        @current-post-changed="handleCurrentPostChanged"
        @post-stats-changed="handlePostStatsChanged"
      />
      <HomeRight :post="currentPost" />
    </div>
    <Footer 
      :scrollTooFast="scrollWarning"
      :currentPostIndex="postStats.currentIndex"
      :totalPosts="postStats.totalPosts"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import HomeLeft from '@/components/HomeLeft.vue'
import HomeMain from '@/components/HomeMain.vue'
import HomeRight from '@/components/HomeRight.vue'
import Footer from '@/components/Footer.vue'
import { useLanguage } from '@/composables/useLanguage'

// Import Firebase để đảm bảo được khởi tạo
import '@/firebase/config'

export default {
  name: 'HomePage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    HomeMain,
    HomeRight,
    Footer
  },
  setup() {
    const { toggleLanguage } = useLanguage()
    const scrollWarning = ref(false)
    const currentPost = ref({})
    const postStats = ref({
      currentIndex: 0,
      totalPosts: 0
    })

    // Handle scroll warning từ HomeMain
    const handleScrollWarning = (isWarning) => {
      scrollWarning.value = isWarning
    }

    // Handle current post change từ HomeMain
    const handleCurrentPostChanged = (post) => {
      currentPost.value = post
    }

    // Handle post stats change từ HomeMain
    const handlePostStatsChanged = (stats) => {
      postStats.value = stats
    }

    return {
      toggleLanguage,
      scrollWarning,
      currentPost,
      postStats,
      handleScrollWarning,
      handleCurrentPostChanged,
      handlePostStatsChanged
    }
  }
}
</script>