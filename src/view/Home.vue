<!--
src/view/Home.vue
View trang chủ
Logic: 
- Nhận showScrollWarning từ HomeMain component
- Truyền scrollTooFast prop xuống Footer component
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
      <HomeMain @scroll-warning="handleScrollWarning" />
      <HomeRight />
    </div>
    <Footer :scrollTooFast="scrollWarning" />
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
  name: 'Home',
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

    // Handle scroll warning từ HomeMain
    const handleScrollWarning = (isWarning) => {
      scrollWarning.value = isWarning
    }

    return {
      toggleLanguage,
      scrollWarning,
      handleScrollWarning
    }
  }
}
</script>