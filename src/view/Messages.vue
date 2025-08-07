<!--
src/view/Messages.vue
View trang messages với layout tương tự Home page
Logic:
- Layout: Header + Body (HomeLeft + MessMain + MessRight) + Footer
- Xử lý communication giữa MessMain và MessRight
- Truyền selected conversation từ MessRight xuống MessMain
- Handle conversation updates để refresh data
- Match Home page layout size exactly
-->
<template>
  <div class="messages-page">
    <div class="header">
      <NavLeft />
      <NavMid />
      <NavRight @toggle-language="toggleLanguage" />
    </div>
    <div class="body">
      <HomeLeft />
      <MessMain 
        :selectedPartnerId="selectedConversation.partnerId"
        :partnerInfo="selectedConversation"
        @message-sent="handleMessageSent"
        @conversation-updated="handleConversationUpdated"
      />
      <MessRight 
        @conversation-selected="handleConversationSelected"
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
import MessMain from '@/components/MessMain.vue'
import MessRight from '@/components/MessRight.vue'
import Footer from '@/components/Footer.vue'
import { useLanguage } from '@/composables/useLanguage'

// Import Firebase để đảm bảo được khởi tạo
import '@/firebase/config'

export default {
  name: 'MessagesPage',
  components: {
    NavLeft,
    NavMid,
    NavRight,
    HomeLeft,
    MessMain,
    MessRight,
    Footer
  },
  setup() {
    const { toggleLanguage } = useLanguage()
    const selectedConversation = ref({
      partnerId: null,
      partnerName: '',
      partnerAvatar: ''
    })

    // Handle conversation selection từ MessRight
    const handleConversationSelected = (conversationInfo) => {
      selectedConversation.value = conversationInfo
      console.log('Conversation selected:', conversationInfo)
    }

    // Handle message sent từ MessMain
    const handleMessageSent = () => {
      console.log('Message sent, updating conversations')
      // MessRight sẽ tự động update qua real-time listener
    }

    // Handle conversation updated từ MessMain
    const handleConversationUpdated = () => {
      console.log('Conversation updated')
      // MessRight sẽ tự động update qua real-time listener
    }

    return {
      toggleLanguage,
      selectedConversation,
      handleConversationSelected,
      handleMessageSent,
      handleConversationUpdated
    }
  }
}
</script>

<style scoped>
/* Match Home page layout exactly */
.messages-page {
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