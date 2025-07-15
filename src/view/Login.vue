<!--
View trang đăng nhập - Refactored
Logic: 
- Sử dụng composables để quản lý language
- Import Firebase config để đảm bảo auth hoạt động
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
import { watch } from 'vue'
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