<!--
src/view/Friends.vue
View trang Friends với layout tương tự Home page
Logic:
- Layout: Header + Body (HomeLeft + FriendMain + FriendRight) + Footer
- Xử lý communication giữa FriendMain và FriendRight
- Truyền activeTab từ FriendRight xuống FriendMain
- Handle data updates để refresh counters
- Match Home page layout size exactly
-->
<template>
  <div class="friends-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft />
      <FriendMain 
        :activeTab="activeTab"
        @data-updated="handleDataUpdated"
      />
      <FriendRight 
        ref="friendRightRef"
        @tab-changed="handleTabChanged"
      />
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
import FriendMain from '@/components/FriendMain.vue'
import FriendRight from '@/components/FriendRight.vue'
import Footer from '@/components/Footer.vue'
import { useLanguage } from '@/composables/useLanguage'

// Import Firebase để đảm bảo được khởi tạo
import '@/firebase/config'

export default {
  name: 'FriendsPage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    FriendMain,
    FriendRight,
    Footer
  },
  setup() {
    const { toggleLanguage } = useLanguage()
    const activeTab = ref('friends')
    const friendRightRef = ref(null)

    // Handle tab change từ FriendRight
    const handleTabChanged = (tab) => {
      activeTab.value = tab
      console.log('Active tab changed:', tab)
    }

    // Handle data update từ FriendMain để refresh counters
    const handleDataUpdated = () => {
      console.log('Data updated, refreshing counters')
      // Call updateCounts method on FriendRight component
      if (friendRightRef.value && friendRightRef.value.updateCounts) {
        friendRightRef.value.updateCounts()
      }
    }

    return {
      toggleLanguage,
      activeTab,
      friendRightRef,
      handleTabChanged,
      handleDataUpdated
    }
  }
}
</script>

<style scoped>
/* Match Home page layout exactly */
.friends-page {
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