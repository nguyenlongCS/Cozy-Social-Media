<!--
View trang tạo bài đăng (Simplified)
-->
<template>
  <div class="create-post-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft />
      <CreatePostMain />
      <HomeRight />
    </div>
    <Footer />
  </div>
</template>

<script>
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import HomeLeft from '@/components/HomeLeft.vue'
import HomeRight from '@/components/HomeRight.vue'
import Footer from '@/components/Footer.vue'
import CreatePostMain from '@/components/CreatePost.vue'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'CreatePost',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    HomeRight,
    Footer,
    CreatePostMain
  },
  setup() {
    const { toggleLanguage } = useLanguage()

    return {
      toggleLanguage
    }
  }
}
</script>

<style scoped>
.create-post-page {
  width: 100%;
  max-width: 80rem;
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