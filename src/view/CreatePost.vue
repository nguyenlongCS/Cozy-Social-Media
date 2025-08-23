<!--
src/view/CreatePost.vue - Updated với CreatePostRight
View trang tạo bài đăng với layout size chuẩn và tích hợp CreatePostRight
Logic:
- Layout tương tự Home page với CreatePostMain và CreatePostRight
- Xử lý communication giữa CreatePostMain và CreatePostRight qua content prop
- Handle content change từ CreatePostRight và pass xuống CreatePostMain
- Validation cho cả caption (60 ký tự) và content (2000 ký tự)
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
      <CreatePostMain :postContent="postContent" />
      <CreatePostRight @content-changed="handleContentChanged" />
    </div>
    <Footer />
  </div>
</template>

<script>
import { ref } from 'vue'
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import HomeLeft from '@/components/HomeLeft.vue'
import Footer from '@/components/Footer.vue'
import CreatePostRight from '@/components/CreatePostRight.vue'
import CreatePostMain from '@/components/CreatePost.vue'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'CreatePost',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    Footer,
    CreatePostMain,
    CreatePostRight
  },
  setup() {
    const { toggleLanguage } = useLanguage()
    const postContent = ref('')

    // Handle content change từ CreatePostRight
    const handleContentChanged = (content) => {
      postContent.value = content
    }

    return {
      toggleLanguage,
      postContent,
      handleContentChanged
    }
  }
}
</script>

<style scoped>
/* Match Home page layout exactly */
.create-post-page {
  width: 100vw; /* Use full viewport width like Home */
  height: 100vh; /* Use full viewport height like Home */
  min-height: 39.4375rem; /* Same minimum height as Home */
  display: flex;
  flex-direction: column;
  background: #2B2D42;
}

.header {
  width: 100%;
  height: 3.5rem;
  min-height: 3.5rem; /* Prevent header shrinking */
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  background: var(--theme-color);
  flex-shrink: 0; /* Prevent header from shrinking */
}

.body {
  width: 100%;
  flex: 1; /* Take remaining space like Home */
  min-height: 0; /* Allow flex item co lại nếu cần */
  display: flex;
  justify-content: space-between;
  background: #2B2D42;
  padding: 0 1rem; /* Add padding like Home for responsive spacing */
}
</style>