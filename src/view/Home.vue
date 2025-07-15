<!--
View trang chủ - Refactored
Logic: 
- Sử dụng composables để quản lý language
- Tổng hợp tất cả components để tạo thành layout hoàn chỉnh
- Import Firebase config để đảm bảo auth hoạt động
-->
<template>
  <div class="home">
    <div class="header">
      <NavLeft :currentLanguage="currentLanguage" />
      <NavMid />
      <NavRight :currentLanguage="currentLanguage" @toggle-language="handleToggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft :currentLanguage="currentLanguage" />
      <HomeMain />
      <HomeRight />
    </div>
    <Footer />
  </div>
</template>

<script>
import { watch } from 'vue'
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
    const { currentLanguage, toggleLanguage } = useLanguage()

    const handleToggleLanguage = () => {
      toggleLanguage()
    }

    return {
      currentLanguage,
      handleToggleLanguage
    }
  }
}
</script>