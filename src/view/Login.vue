<!--
View trang đăng nhập - Refactored
Logic: 
- Loại bỏ currentLanguage props truyền qua components
- Đơn giản hóa language toggle logic
- Theme initialization đã được xử lý trong useTheme composable
-->
<template>
  <div class="login">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <LoginLeft />
      <LoginMain />
      <LoginRight />
    </div>
    <Footer />
  </div>
</template>

<script>
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import LoginLeft from '@/components/LoginLeft.vue'
import LoginMain from '@/components/LoginMain.vue'
import LoginRight from '@/components/LoginRight.vue'
import Footer from '@/components/Footer.vue'
import { useLanguage } from '@/composables/useLanguage'

// Import Firebase để đảm bảo được khởi tạo
import '@/firebase/config'

export default {
  name: 'Login',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    LoginLeft,
    LoginMain,
    LoginRight,
    Footer
  },
  setup() {
    const { toggleLanguage } = useLanguage()

    return {
      toggleLanguage
    }
  }
}
</script>