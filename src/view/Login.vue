<!--
View trang đăng nhập - Refactored with theme initialization
Logic: 
- Sử dụng composables để quản lý language và theme
- Import Firebase config để đảm bảo auth hoạt động
- Initialize theme từ localStorage khi component mount
-->
<template>
  <div class="login">
    <div class="header">
      <NavLeft :currentLanguage="currentLanguage" />
      <NavMid />
      <NavRight :currentLanguage="currentLanguage" @toggle-language="handleToggleLanguage" />
    </div>
    <div class="body">
      <LoginLeft :currentLanguage="currentLanguage" />
      <LoginMain :currentLanguage="currentLanguage" />
      <LoginRight :currentLanguage="currentLanguage" />
    </div>
    <Footer />
  </div>
</template>

<script>
import { onMounted } from 'vue'
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import LoginLeft from '@/components/LoginLeft.vue'
import LoginMain from '@/components/LoginMain.vue'
import LoginRight from '@/components/LoginRight.vue'
import Footer from '@/components/Footer.vue'
import { useLanguage } from '@/composables/useLanguage'
import { useTheme } from '@/composables/useTheme'

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
    const { currentLanguage, toggleLanguage } = useLanguage()
    const { initTheme } = useTheme()

    const handleToggleLanguage = () => {
      toggleLanguage()
    }

    // Initialize theme khi component mount
    onMounted(() => {
      initTheme()
    })

    return {
      currentLanguage,
      handleToggleLanguage
    }
  }
}
</script>