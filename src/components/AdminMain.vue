<!--
src/components/AdminMain.vue - UPDATED: Hiển thị đầy đủ users và posts
Component admin dashboard hiển thị thống kê và quản lý users/posts
Logic:
- Dashboard với thống kê tổng quan
- Tab switching giữa Users và Posts management
- UPDATED: Hiển thị tất cả users và posts thay vì chỉ recent/top
- Search và delete functionality
- Responsive layout trong admin panel
-->
<template>
  <div class="admin-main">
    <!-- Admin Header -->
    <div class="admin-header">
      <h2 class="admin-title">{{ getText('adminDashboard') }}</h2>
      <div class="admin-user">
        <span class="admin-email">{{ user?.email }}</span>
      </div>
    </div>

    <!-- Dashboard Stats -->
    <div v-if="!isLoading" class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-number">{{ dashboardStats.totalUsers }}</div>
        <div class="stat-label">{{ getText('totalUsers') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ dashboardStats.totalPosts }}</div>
        <div class="stat-label">{{ getText('totalPosts') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ totalInteractions }}</div>
        <div class="stat-label">{{ getText('totalInteractions') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ avgInteractionsPerPost }}</div>
        <div class="stat-label">{{ getText('avgInteractions') }}</div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="admin-tabs">
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'users' }"
        @click="setActiveTab('users')"
      >
        {{ getText('manageUsers') }} ({{ allUsers.length }})
      </button>
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'posts' }"
        @click="setActiveTab('posts')"
      >
        {{ getText('managePosts') }} ({{ allPosts.length }})
      </button>
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'analytics' }"
        @click="setActiveTab('analytics')"
      >
        {{ getText('analytics') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="admin-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ getText('loading') }}...</div>
    </div>

    <!-- Users Management Tab - UPDATED: Hiển thị tất cả users -->
    <div v-else-if="activeTab === 'users'" class="admin-content">
      <div class="search-section">
        <input
          v-model="userSearchTerm"
          type="text"
          class="search-input"
          :placeholder="getText('searchUsers')"
          @input="handleUserSearch"
        >
        <button 
          v-if="userSearchTerm.length > 0"
          class="clear-search-btn"
          @click="clearUserSearch"
        >
          ×
        </button>
      </div>

      <div class="users-list">
        <div v-if="displayedUsers.length === 0 && userSearchTerm.trim()" class="no-results">
          {{ getText('noUsersFound') }}
        </div>
        <div v-else class="all-users">
          <h4 class="list-title">
            {{ userSearchTerm.trim() ? getText('searchResults') : getText('allUsers') }}
            ({{ displayedUsers.length }})
          </h4>
          <div 
            v-for="user in displayedUsers" 
            :key="user.id"
            class="user-item"
          >
            <div class="user-info">
              <div 
                class="user-avatar"
                :style="{ backgroundImage: user.Avatar ? `url(${user.Avatar})` : '' }"
              ></div>
              <div class="user-details">
                <div class="user-name">{{ user.UserName || getText('unknownUser') }}</div>
                <div class="user-email">{{ user.Email }}</div>
                <div class="user-date">{{ getText('joinedOn') }}: {{ formatAdminDate(user.Created) }}</div>
              </div>
            </div>
            <div class="user-actions">
              <button 
                class="delete-user-btn"
                @click="handleDeleteUser(user)"
                :disabled="isLoading"
              >
                {{ getText('deleteUser') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Posts Management Tab - UPDATED: Hiển thị tất cả posts -->
    <div v-else-if="activeTab === 'posts'" class="admin-content">
      <div class="search-section">
        <input
          v-model="postSearchTerm"
          type="text"
          class="search-input"
          :placeholder="getText('searchPosts')"
          @input="handlePostSearch"
        >
        <button 
          v-if="postSearchTerm.length > 0"
          class="clear-search-btn"
          @click="clearPostSearch"
        >
          ×
        </button>
      </div>

      <div class="posts-list">
        <div v-if="displayedPosts.length === 0 && postSearchTerm.trim()" class="no-results">
          {{ getText('noPostsFound') }}
        </div>
        <div v-else class="all-posts">
          <h4 class="list-title">
            {{ postSearchTerm.trim() ? getText('searchResults') : getText('allPosts') }}
            ({{ displayedPosts.length }})
          </h4>
          <div 
            v-for="post in displayedPosts" 
            :key="post.id"
            class="post-item"
          >
            <div class="post-info">
              <div 
                class="post-media"
                :style="{ backgroundImage: post.MediaURL ? `url(${post.MediaURL})` : '' }"
              ></div>
              <div class="post-details">
                <div class="post-caption">{{ post.Caption || getText('noCaption') }}</div>
                <div class="post-author">{{ getText('by') }}: {{ post.UserName || getText('unknownUser') }}</div>
                <div class="post-stats">
                  {{ post.likes || 0 }} {{ getText('likes') }} • 
                  {{ post.comments || 0 }} {{ getText('comments') }}
                </div>
                <div class="post-date">{{ formatAdminDate(post.Created) }}</div>
              </div>
            </div>
            <div class="post-actions">
              <button 
                class="delete-post-btn"
                @click="handleDeletePost(post)"
                :disabled="isLoading"
              >
                {{ getText('deletePost') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-else-if="activeTab === 'analytics'" class="admin-content analytics-content">
      <div class="analytics-grid">
        <!-- User Analytics -->
        <div class="analytics-card">
          <h4>{{ getText('userAnalytics') }}</h4>
          <div class="analytics-item">
            <span>{{ getText('totalUsers') }}:</span>
            <span class="analytics-value">{{ dashboardStats.totalUsers }}</span>
          </div>
          <div class="analytics-item">
            <span>{{ getText('newUsersToday') }}:</span>
            <span class="analytics-value">{{ getNewUsersToday() }}</span>
          </div>
        </div>

        <!-- Post Analytics -->
        <div class="analytics-card">
          <h4>{{ getText('postAnalytics') }}</h4>
          <div class="analytics-item">
            <span>{{ getText('totalPosts') }}:</span>
            <span class="analytics-value">{{ dashboardStats.totalPosts }}</span>
          </div>
          <div class="analytics-item">
            <span>{{ getText('avgInteractions') }}:</span>
            <span class="analytics-value">{{ avgInteractionsPerPost }}</span>
          </div>
        </div>

        <!-- Engagement Analytics -->
        <div class="analytics-card">
          <h4>{{ getText('engagementAnalytics') }}</h4>
          <div class="analytics-item">
            <span>{{ getText('totalLikes') }}:</span>
            <span class="analytics-value">{{ dashboardStats.totalLikes }}</span>
          </div>
          <div class="analytics-item">
            <span>{{ getText('totalComments') }}:</span>
            <span class="analytics-value">{{ dashboardStats.totalComments }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'
import { useAuth } from '@/composables/useAuth'
import { useUsers } from '@/composables/useUsers'
import { useAdmin } from '@/composables/useAdmin'
import { 
  getFirestore, 
  collection, 
  getDocs,
  orderBy,
  query
} from 'firebase/firestore'
import app from '@/firebase/config'

const db = getFirestore(app, 'social-media-db')

export default {
  name: 'AdminMain',
  setup() {
    const router = useRouter()
    const { getText } = useLanguage()
    const { user } = useAuth()
    const { 
      isAdmin,
      isLoading,
      dashboardStats,
      totalInteractions,
      avgInteractionsPerPost,
      loadDashboardStats,
      deleteUserAccount,
      deletePost,
      searchUsers,
      searchPosts,
      formatAdminDate
    } = useAdmin()

    // Reactive state
    const activeTab = ref('users')
    const userSearchTerm = ref('')
    const postSearchTerm = ref('')
    const userSearchResults = ref([])
    const postSearchResults = ref([])
    const searchTimeout = ref(null)
    
    // UPDATED: Load tất cả users và posts
    const allUsers = ref([])
    const allPosts = ref([])

    // UPDATED: Computed để hiển thị users (search results hoặc tất cả)
    const displayedUsers = computed(() => {
      if (userSearchTerm.value.trim() && userSearchResults.value.length > 0) {
        return userSearchResults.value
      }
      return allUsers.value
    })

    // UPDATED: Computed để hiển thị posts (search results hoặc tất cả)
    const displayedPosts = computed(() => {
      if (postSearchTerm.value.trim() && postSearchResults.value.length > 0) {
        return postSearchResults.value
      }
      return allPosts.value
    })

    // UPDATED: Load tất cả users từ Firestore
    const loadAllUsers = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('Created', 'desc')
        )
        const snapshot = await getDocs(usersQuery)
        
        allUsers.value = []
        snapshot.forEach(doc => {
          allUsers.value.push({
            id: doc.id,
            ...doc.data()
          })
        })
      } catch (error) {
        console.error('Error loading all users:', error)
        allUsers.value = []
      }
    }

    // UPDATED: Load tất cả posts từ Firestore
    const loadAllPosts = async () => {
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('Created', 'desc')
        )
        const snapshot = await getDocs(postsQuery)
        
        allPosts.value = []
        snapshot.forEach(doc => {
          allPosts.value.push({
            id: doc.id,
            ...doc.data()
          })
        })
      } catch (error) {
        console.error('Error loading all posts:', error)
        allPosts.value = []
      }
    }

    // Tab management
    const setActiveTab = (tab) => {
      activeTab.value = tab
      // Clear search when switching tabs
      userSearchTerm.value = ''
      postSearchTerm.value = ''
      userSearchResults.value = []
      postSearchResults.value = []
    }

    // User search với debounce
    const handleUserSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
      }

      searchTimeout.value = setTimeout(async () => {
        const query = userSearchTerm.value.trim()
        if (query) {
          userSearchResults.value = await searchUsers(query)
        } else {
          userSearchResults.value = []
        }
      }, 300)
    }

    const clearUserSearch = () => {
      userSearchTerm.value = ''
      userSearchResults.value = []
    }

    // Post search với debounce
    const handlePostSearch = () => {
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
      }

      searchTimeout.value = setTimeout(async () => {
        const query = postSearchTerm.value.trim()
        if (query) {
          postSearchResults.value = await searchPosts(query)
        } else {
          postSearchResults.value = []
        }
      }, 300)
    }

    const clearPostSearch = () => {
      postSearchTerm.value = ''
      postSearchResults.value = []
    }

    // Delete handlers - UPDATED: Reload data và dashboard stats sau khi delete
    const handleDeleteUser = async (user) => {
      const confirmed = confirm(`${getText('confirmDeleteUser')}: ${user.UserName || user.Email}?`)
      if (!confirmed) return

      try {
        await deleteUserAccount(user.id)
        // Reload data sau khi delete
        await loadAllData()
      } catch (error) {
        console.error('Delete user error:', error)
      }
    }

    const handleDeletePost = async (post) => {
      const confirmed = confirm(`${getText('confirmDeletePost')}: ${post.Caption || 'Untitled'}?`)
      if (!confirmed) return

      try {
        await deletePost(post.id)
        // Reload data sau khi delete
        await loadAllData()
      } catch (error) {
        console.error('Delete post error:', error)
      }
    }

    // Analytics helpers
    const getNewUsersToday = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      return allUsers.value.filter(user => {
        const userDate = user.Created?.toDate ? user.Created.toDate() : new Date(user.Created || 0)
        return userDate >= today
      }).length
    }

    // UPDATED: Load dashboard stats trực tiếp từ Firestore
    const loadDashboardStatsDirectly = async () => {
      try {
        // Load stats trực tiếp từ Firestore mà không cần check admin
        const [
          usersSnapshot,
          postsSnapshot,
          likesSnapshot,
          commentsSnapshot
        ] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'posts')),
          getDocs(collection(db, 'likes')),
          getDocs(collection(db, 'comments'))
        ])

        // Cập nhật dashboardStats trực tiếp
        dashboardStats.value.totalUsers = usersSnapshot.size
        dashboardStats.value.totalPosts = postsSnapshot.size
        dashboardStats.value.totalLikes = likesSnapshot.size
        dashboardStats.value.totalComments = commentsSnapshot.size

      } catch (error) {
        console.error('Error loading dashboard stats:', error)
        // Set default values nếu có lỗi
        dashboardStats.value.totalUsers = 0
        dashboardStats.value.totalPosts = 0
        dashboardStats.value.totalLikes = 0
        dashboardStats.value.totalComments = 0
      }
    }

    // UPDATED: Load all data - không phụ thuộc vào admin status
    const loadAllData = async () => {
      await Promise.all([
        loadDashboardStatsDirectly(),
        loadAllUsers(),
        loadAllPosts()
      ])
    }

    // Watchers - UPDATED: Đơn giản hóa, chỉ watch user
    watch(user, (newUser) => {
      if (newUser) {
        loadAllData()
      }
    }, { immediate: true })

    // Lifecycle
    onMounted(() => {
      if (user.value) {
        loadAllData()
      }
    })

    return {
      // State
      user,
      isAdmin,
      isLoading,
      dashboardStats,
      totalInteractions,
      avgInteractionsPerPost,
      activeTab,
      userSearchTerm,
      postSearchTerm,
      userSearchResults,
      postSearchResults,
      allUsers,
      allPosts,
      displayedUsers,
      displayedPosts,
      
      // Methods
      getText,
      formatAdminDate,
      setActiveTab,
      handleUserSearch,
      clearUserSearch,
      handlePostSearch,
      clearPostSearch,
      handleDeleteUser,
      handleDeletePost,
      getNewUsersToday
    }
  }
}
</script>

<style scoped>
.admin-main {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--theme-color-10);
  border-bottom: 1px solid var(--theme-color-20);
  flex-shrink: 0;
}

.admin-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0;
}

.admin-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-email {
  font-size: 0.75rem;
  color: var(--theme-color);
  opacity: 0.8;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  padding: 0.75rem;
  flex-shrink: 0;
}

.stat-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 0.5rem;
  text-align: center;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--theme-color);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.625rem;
  color: var(--theme-color);
  opacity: 0.8;
}

.admin-tabs {
  display: flex;
  border-bottom: 1px solid var(--theme-color-20);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 0.5rem;
  background: transparent;
  border: none;
  color: var(--theme-color);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.tab-btn:hover {
  opacity: 1;
  background: var(--theme-color-05);
}

.tab-btn.active {
  opacity: 1;
  background: var(--theme-color-10);
  border-bottom: 2px solid var(--theme-color);
}

.admin-content {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
  min-height: 0;
}

.admin-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--theme-color-20);
  border-top: 2px solid var(--theme-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: var(--theme-color);
  font-size: 0.875rem;
}

.search-section {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  height: 2rem;
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  outline: none;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  border-color: var(--theme-color);
}

.search-input::placeholder {
  color: var(--theme-color);
  opacity: 0.6;
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  border: none;
  background: rgba(255, 0, 0, 0.3);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: rgba(255, 0, 0, 0.5);
  transform: translateY(-50%) scale(1.1);
}

.list-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 0.75rem 0;
}

.no-results {
  text-align: center;
  color: var(--theme-color);
  opacity: 0.6;
  padding: 2rem;
  font-size: 0.875rem;
}

.user-item, .post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.user-item:hover, .post-item:hover {
  background: var(--theme-color-10);
  border-color: var(--theme-color);
}

.user-info, .post-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.user-avatar, .post-media {
  width: 2.5rem;
  height: 2.5rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color-20);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.post-media {
  border-radius: 0.25rem;
  background-image: none;
  background-color: var(--theme-color-20);
}

.user-details, .post-details {
  flex: 1;
  min-width: 0;
}

.user-name, .post-caption {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 0.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email, .post-author {
  font-size: 0.75rem;
  color: var(--theme-color);
  opacity: 0.8;
  margin-bottom: 0.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-date, .post-date, .post-stats {
  font-size: 0.625rem;
  color: var(--theme-color);
  opacity: 0.6;
}

.user-actions, .post-actions {
  flex-shrink: 0;
}

.delete-user-btn, .delete-post-btn {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: rgba(255, 0, 0, 0.9);
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-user-btn:hover:not(:disabled), 
.delete-post-btn:hover:not(:disabled) {
  background: rgba(255, 0, 0, 0.2);
  transform: scale(1.05);
}

.delete-user-btn:disabled, 
.delete-post-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.analytics-content {
  padding: 1rem;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.analytics-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 1rem;
}

.analytics-card h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 0.75rem 0;
}

.analytics-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: var(--theme-color);
}

.analytics-value {
  font-weight: 600;
  color: var(--theme-color);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.admin-content::-webkit-scrollbar {
  width: 0.25rem;
}

.admin-content::-webkit-scrollbar-track {
  background: var(--theme-color-10);
}

.admin-content::-webkit-scrollbar-thumb {
  background: var(--theme-color-20);
  border-radius: 0.125rem;
}

.admin-content::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
}
</style>