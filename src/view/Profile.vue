<!--
src/view/Profile.vue - Updated with ProfileHomeRight
View trang profile - Hiển thị và chỉnh sửa thông tin user với ProfileHomeRight
Logic:
- Load và hiển thị thông tin user từ Firestore users collection
- Form chỉnh sửa thông tin: UserName, Bio, Gender
- Upload và thay đổi Avatar
- Save thay đổi vào Firestore
- Sử dụng ProfileHomeRight thay vì HomeRight cho profile-specific features
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
.profile-page {
  width: 100%;
  max-width: 80rem;
  min-height: 100vh; /* FIXED: Ensure full viewport height */
  display: flex;
  flex-direction: column;
  background: #2B2D42;
}

.header {
  width: 100%;
  height: 3.5rem;
  min-height: 3.5rem; /* FIXED: Prevent header shrinking */
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  background: #2B2D42;
  flex-shrink: 0; /* FIXED: Prevent header from shrinking */
}

.body {
  width: 100%;
  flex: 1; /* FIXED: Take remaining space */
  display: flex;
  justify-content: space-between;
  background: #2B2D42;
  min-height: 0; /* Allow flex children to shrink */
}
</style>