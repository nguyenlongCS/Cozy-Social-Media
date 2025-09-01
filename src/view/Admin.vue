<template>
  <div class="admin-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <!-- Luôn hiển thị Admin Dashboard -->
      <AdminMainFullscreen />
    </div>
    <Footer />
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import Footer from '@/components/Footer.vue'
import AdminMainFullscreen from '@/components/AdminMain.vue'
import { useLanguage } from '@/composables/useLanguage'

// Import Firebase để đảm bảo được khởi tạo (có thể bỏ nếu không cần)
import '@/firebase/config'

export default {
  name: 'AdminPage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    Footer,
    AdminMainFullscreen
  },
  setup() {
    const router = useRouter()
    const { toggleLanguage, getText } = useLanguage()

    const goHome = () => {
      router.push('/')
    }

    return {
      toggleLanguage,
      getText,
      goHome
    }
  }
}
</script>

<style scoped>
/* Fullscreen admin layout */
.admin-page {
  width: 100vw;
  height: 100vh;
  min-height: 39.4375rem;
  display: flex;
  flex-direction: column;
  background: #2B2D42;
}

.header {
  width: 100%;
  height: 3.5rem;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  background: var(--theme-color);
  flex-shrink: 0;
}

.body {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  background: #2B2D42;
  padding: 1rem;
}
</style>
