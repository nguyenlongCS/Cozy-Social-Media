<!--
View trang chủ
Tổng hợp tất cả components để tạo thành layout hoàn chỉnh
Logic quản lý ngôn ngữ (toggle giữa vi/en)
-->
<template>
  <div class="home">
    <div class="header">
      <NavLeft :currentLanguage="currentLanguage" />
      <NavMid />
      <NavRight :currentLanguage="currentLanguage" @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <Left :currentLanguage="currentLanguage" />
      <Main />
      <Right />
    </div>
    <Footer />
  </div>
</template>

<script>
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import Left from '@/components/Left.vue'
import Main from '@/components/Main.vue'
import Right from '@/components/Right.vue'
import Footer from '@/components/Footer.vue'

export default {
  name: 'Home',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    Left,
    Main,
    Right,
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