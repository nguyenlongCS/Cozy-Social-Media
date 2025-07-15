<!--
View trang đăng nhập
Import Firebase config để đảm bảo auth hoạt động
-->
<template>
  <div class="login">
    <div class="header">
      <NavLeft :currentLanguage="currentLanguage" />
      <NavMid />
      <NavRight :currentLanguage="currentLanguage" @toggle-language="toggleLanguage" />
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
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import LoginLeft from '@/components/LoginLeft.vue'
import LoginMain from '@/components/LoginMain.vue'
import LoginRight from '@/components/LoginRight.vue'
import Footer from '@/components/Footer.vue'

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
  data() {
    return {
      currentLanguage: 'vi'
    }
  },
  methods: {
    toggleLanguage() {
      this.currentLanguage = this.currentLanguage === 'vi' ? 'en' : 'vi'
    }
  }
}
</script>