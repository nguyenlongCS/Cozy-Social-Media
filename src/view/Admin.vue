<!--
src/view/Admin.vue - FIXED: Sửa logic redirect không mong muốn
View trang admin với layout tương tự Home page
Logic:
- Layout: Header + Body (HomeLeft + AdminMain + AdminRight) + Footer
- Kiểm tra quyền admin trước khi hiển thị
- FIXED: Không redirect về login khi đã đăng nhập, chỉ hiện access denied
- Access denied nếu không phải admin nhưng vẫn ở trang admin
- Match Home page layout size exactly
-->
<template>
  <div class="admin-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft />
      
      <!-- Admin Access Denied - FIXED: Chỉ hiện khi user đã login nhưng không phải admin -->
      <div v-if="user && !isAdmin && !isLoading" class="access-denied">
        <div class="access-denied-content">
          <div class="denied-icon">🚫</div>
          <h3 class="denied-title">{{ getText('accessDenied') }}</h3>
          <p class="denied-message">{{ getText('adminAccessRequired') }}</p>
          <button class="back-btn btn" @click="goHome">
            {{ getText('backToHome') }}
          </button>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-else-if="isLoading" class="admin-loading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">{{ getText('verifyingAdminAccess') }}...</div>
        </div>
      </div>
      
      <!-- Login Required - FIXED: Hiện khi chưa đăng nhập -->
      <div v-else-if="!user" class="access-denied">
        <div class="access-denied-content">
          <div class="denied-icon">🔐</div>
          <h3 class="denied-title">{{ getText('loginRequired') }}</h3>
          <p class="denied-message">{{ getText('loginToUseFeature') }}</p>
          <button class="back-btn btn" @click="goToLogin">
            {{ getText('login') }}
          </button>
        </div>
      </div>
      
      <!-- Admin Dashboard -->
      <AdminMain v-else />
      
      <!-- Admin Right Panel - REMOVED admin help và info -->
      <div class="admin-right">
        <!-- Empty right panel -->
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import HomeLeft from '@/components/HomeLeft.vue'
import Footer from '@/components/Footer.vue'
import AdminMain from '@/components/AdminMain.vue'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useAdmin } from '@/composables/useAdmin'

// Import Firebase để đảm bảo được khởi tạo
import '@/firebase/config'

export default {
  name: 'AdminPage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    Footer,
    AdminMain
  },
  setup() {
    const router = useRouter()
    const { user } = useAuth()
    const { toggleLanguage, getText } = useLanguage()
    const { isAdmin, isLoading, initializeAdmin } = useAdmin()

    // Navigation
    const goHome = () => {
      router.push('/')
    }

    // FIXED: Thêm function navigate to login
    const goToLogin = () => {
      router.push('/login')
    }

    // Utility
    const getCurrentDate = () => {
      return new Date().toLocaleDateString('vi-VN')
    }

    // FIXED: Bỏ logic redirect tự động
    // Lifecycle
    onMounted(async () => {
      // Initialize admin check nếu user đã login
      if (user.value) {
        await initializeAdmin()
      }
    })

    // FIXED: Watch user changes để check admin status
    watch(user, async (newUser) => {
      if (newUser) {
        await initializeAdmin()
      }
    }, { immediate: false })

    return {
      user,
      isAdmin,
      isLoading,
      toggleLanguage,
      getText,
      goHome,
      goToLogin,
      getCurrentDate
    }
  }
}
</script>

<style scoped>
/* Match Home page layout exactly */
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
  justify-content: space-between;
  background: #2B2D42;
  padding: 0 1rem;
}

.access-denied, .admin-loading {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
}

.access-denied-content, .loading-content {
  text-align: center;
  padding: 2rem;
}

.denied-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.denied-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0 0 1rem 0;
}

.denied-message {
  font-size: 0.875rem;
  color: var(--theme-color);
  opacity: 0.8;
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

.back-btn {
  width: 8rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.375rem;
  background: var(--theme-color);
  color: #2B2D42;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0.25rem 0.5rem var(--theme-color-20);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--theme-color-20);
  border-top: 3px solid var(--theme-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 0.875rem;
  color: var(--theme-color);
  opacity: 0.8;
}

.admin-right {
  width: 22.13%;
  height: 100%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  color: var(--theme-color);
  font-size: 0.875rem;
  overflow: hidden;
  padding: 1rem;
  gap: 1.5rem;
}

.admin-help {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 1rem;
}

.help-title, .info-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0 0 0.75rem 0;
}

.help-item {
  margin-bottom: 1rem;
}

.help-item strong {
  display: block;
  font-size: 0.75rem;
  color: var(--theme-color);
  margin-bottom: 0.25rem;
}

.help-item p {
  font-size: 0.625rem;
  color: var(--theme-color);
  opacity: 0.8;
  line-height: 1.4;
  margin: 0;
}

.admin-info {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item span:first-child {
  color: var(--theme-color);
  opacity: 0.8;
}

.info-item span:last-child {
  color: var(--theme-color);
  font-weight: 600;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>