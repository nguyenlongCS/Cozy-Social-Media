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

<style scoped>
.home {
  width: 100%;
  max-width: 79.0625rem;
  height: 39.4375rem;
  display: flex;
  flex-direction: column;
  background: #2B2D42;
}

.header {
  width: 100%;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  background: #2B2D42;
}

.body {
  width: 100%;
  height: 32.44rem;
  display: flex;
  justify-content: space-between;
  background: #2B2D42;
}
</style>