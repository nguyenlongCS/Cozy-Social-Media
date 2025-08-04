<!--
src/view/Profile.vue - Fixed Layout Size to Match Home Page
View trang profile - Hiển thị và chỉnh sửa thông tin user với ProfileHomeRight
Logic:
- Load và hiển thị thông tin user từ Firestore users collection
- Form chỉnh sửa thông tin: UserName, Bio, Gender
- Upload và thay đổi Avatar
- Save thay đổi vào Firestore
- Sử dụng ProfileHomeRight thay vì HomeRight cho profile-specific features
- FIXED: Layout size to match Home page exactly
-->
<template>
  <div class="profile-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft />
      <ProfileMain />
      <ProfileHomeRight />
    </div>
    <Footer />
  </div>
</template>

<script>
import NavLeft from '@/components/NavLeft.vue'
import NavMid from '@/components/NavMid.vue'
import NavRight from '@/components/NavRight.vue'
import HomeLeft from '@/components/HomeLeft.vue'
import Footer from '@/components/Footer.vue'
import ProfileMain from '@/components/ProfileMain.vue'
import ProfileHomeRight from '@/components/ProfileHomeRight.vue'
import { useLanguage } from '@/composables/useLanguage'

// Import Firebase để đảm bảo được khởi tạo
import '@/firebase/config'

export default {
  name: 'ProfilePage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    Footer,
    ProfileMain,
    ProfileHomeRight // Updated component
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
/* FIXED: Match Home page layout exactly */
.profile-page {
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
  background: #2B2D42;
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