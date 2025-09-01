<!--
src/components/AdminMainFullscreen.vue - FINAL: Clean admin dashboard
Component admin dashboard fullscreen với charts và quản lý đầy đủ
Logic:
- CLEANED: Loại bỏ tất cả debug logs
- Fullscreen layout với grid responsive
- Dashboard stats cards + biểu đồ Chart.js
- Tab switching: Dashboard, Users, Posts, Analytics
- Search và delete functionality
- Charts: Line, Doughnut, Bar cho analytics
-->
<template>
  <div class="admin-main-fullscreen">
    <!-- Tab Navigation -->
    <div class="admin-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'dashboard' }" @click="setActiveTab('dashboard')">
        {{ getText('dashboard') }}
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'users' }" @click="setActiveTab('users')">
        {{ getText('manageUsers') }} ({{ allUsers.length }})
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'posts' }" @click="setActiveTab('posts')">
        {{ getText('managePosts') }} ({{ allPosts.length }})
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'analytics' }" @click="setActiveTab('analytics')">
        {{ getText('analytics') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="admin-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ getText('loading') }}...</div>
    </div>

    <!-- Dashboard Tab -->
    <div v-else-if="activeTab === 'dashboard'" class="admin-content dashboard-content">
      <!-- Stats Cards -->
      <div class="dashboard-stats">
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

      <!-- Charts Grid -->
      <div class="charts-grid">
        <div class="chart-card">
          <h4 class="chart-title">{{ getText('userGrowth') }}</h4>
          <canvas id="usersChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">{{ getText('postsDistribution') }}</h4>
          <canvas id="postsChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">{{ getText('engagementChart') }}</h4>
          <canvas id="engagementChart" width="400" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">{{ getText('topUsersChart') }}</h4>
          <canvas id="topUsersChart" width="400" height="200"></canvas>
        </div>
      </div>
    </div>

    <!-- Users Management Tab -->
    <div v-else-if="activeTab === 'users'" class="admin-content">
      <div class="search-section">
        <input v-model="userSearchTerm" type="text" class="search-input" :placeholder="getText('searchUsers')"
          @input="handleUserSearch">
        <button v-if="userSearchTerm.length > 0" class="clear-search-btn" @click="clearUserSearch">×</button>
      </div>

      <div class="list-container">
        <div v-if="displayedUsers.length === 0 && userSearchTerm.trim()" class="no-results">
          {{ getText('noUsersFound') }}
        </div>
        <div v-else>
          <h4 class="list-title">
            {{ userSearchTerm.trim() ? getText('searchResults') : getText('allUsers') }} ({{ displayedUsers.length }})
          </h4>
          <div v-for="user in displayedUsers" :key="user.id" class="item">
            <div class="item-info">
              <div class="avatar" :style="{ backgroundImage: user.Avatar ? `url(${user.Avatar})` : '' }"></div>
              <div class="details">
                <div class="name">{{ user.UserName || getText('unknownUser') }}</div>
                <div class="email">{{ user.Email }}</div>
                <div class="date">{{ getText('joinedOn') }}: {{ formatAdminDate(user.Created) }}</div>
              </div>
            </div>
            <div class="actions">
              <button class="delete-btn" @click="handleDeleteUser(user)" :disabled="isLoading">
                {{ getText('deleteUser') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Posts Management Tab -->
    <div v-else-if="activeTab === 'posts'" class="admin-content">
      <div class="search-section">
        <input v-model="postSearchTerm" type="text" class="search-input" :placeholder="getText('searchPosts')"
          @input="handlePostSearch">
        <button v-if="postSearchTerm.length > 0" class="clear-search-btn" @click="clearPostSearch">×</button>
      </div>

      <div class="list-container">
        <div v-if="displayedPosts.length === 0 && postSearchTerm.trim()" class="no-results">
          {{ getText('noPostsFound') }}
        </div>
        <div v-else>
          <h4 class="list-title">
            {{ postSearchTerm.trim() ? getText('searchResults') : getText('allPosts') }} ({{ displayedPosts.length }})
          </h4>
          <div v-for="post in displayedPosts" :key="post.id" class="item">
            <div class="item-info">
              <div class="media" :style="{ backgroundImage: post.MediaURL ? `url(${post.MediaURL})` : '' }"></div>
              <div class="details">
                <div class="name">{{ post.Caption || getText('noCaption') }}</div>
                <div class="email">{{ getText('by') }}: {{ post.UserName || getText('unknownUser') }}</div>
                <div class="date">
                  {{ post.likes || 0 }} {{ getText('likes') }} • {{ post.comments || 0 }} {{ getText('comments') }}
                  <br>{{ formatAdminDate(post.Created) }}
                </div>
              </div>
            </div>
            <div class="actions">
              <button class="delete-btn" @click="handleDeletePost(post)" :disabled="isLoading">
                {{ getText('deletePost') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-else-if="activeTab === 'analytics'" class="admin-content">
      <div class="analytics-grid">
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
          <div class="analytics-item">
            <span>{{ getText('activeUsers') }}:</span>
            <span class="analytics-value">{{ getActiveUsers() }}</span>
          </div>
        </div>

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
          <div class="analytics-item">
            <span>{{ getText('postsToday') }}:</span>
            <span class="analytics-value">{{ getPostsToday() }}</span>
          </div>
        </div>

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
          <div class="analytics-item">
            <span>{{ getText('engagementRate') }}:</span>
            <span class="analytics-value">{{ getEngagementRate() }}%</span>
          </div>
        </div>

        <div class="analytics-card">
          <h4>{{ getText('systemAnalytics') }}</h4>
          <div class="analytics-item">
            <span>{{ getText('version') }}:</span>
            <span class="analytics-value">1.0.0</span>
          </div>
          <div class="analytics-item">
            <span>{{ getText('lastUpdate') }}:</span>
            <span class="analytics-value">{{ getCurrentDate() }}</span>
          </div>
          <div class="analytics-item">
            <span>{{ getText('uptime') }}:</span>
            <span class="analytics-value">99.9%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useAdmin } from '@/composables/useAdmin'
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore'
import app from '@/firebase/config'

const db = getFirestore(app, 'social-media-db')

export default {
  name: 'AdminMainFullscreen',
  setup() {
    const { getText } = useLanguage()
    const {
      isLoading, dashboardStats, totalInteractions, avgInteractionsPerPost,
      deleteUserAccount, deletePost, searchUsers, searchPosts, formatAdminDate
    } = useAdmin()

    // State
    const activeTab = ref('dashboard')
    const userSearchTerm = ref('')
    const postSearchTerm = ref('')
    const userSearchResults = ref([])
    const postSearchResults = ref([])
    const searchTimeout = ref(null)
    const allUsers = ref([])
    const allPosts = ref([])
    const charts = ref({})

    // Computed
    const displayedUsers = computed(() =>
      userSearchTerm.value.trim() && userSearchResults.value.length > 0
        ? userSearchResults.value : allUsers.value
    )

    const displayedPosts = computed(() =>
      postSearchTerm.value.trim() && postSearchResults.value.length > 0
        ? postSearchResults.value : allPosts.value
    )

    // Data Loading
    const loadData = async () => {
      try {
        const [usersSnapshot, postsSnapshot, likesSnapshot, commentsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'users'), orderBy('Created', 'desc'))),
          getDocs(query(collection(db, 'posts'), orderBy('Created', 'desc'))),
          getDocs(collection(db, 'likes')),
          getDocs(collection(db, 'comments'))
        ])

        // Update stats
        dashboardStats.value.totalUsers = usersSnapshot.size
        dashboardStats.value.totalPosts = postsSnapshot.size
        dashboardStats.value.totalLikes = likesSnapshot.size
        dashboardStats.value.totalComments = commentsSnapshot.size

        // Update lists
        allUsers.value = []
        allPosts.value = []

        usersSnapshot.forEach(doc => allUsers.value.push({ id: doc.id, ...doc.data() }))
        postsSnapshot.forEach(doc => allPosts.value.push({ id: doc.id, ...doc.data() }))
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    // Charts
    const loadChartJS = () => {
      return new Promise((resolve) => {
        if (window.Chart) return resolve(true)
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
      })
    }

    const initializeCharts = async () => {
      if (!(await loadChartJS()) || !window.Chart) return
      await nextTick()

      // Destroy existing charts first
      Object.values(charts.value).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy()
        }
      })
      charts.value = {}

      const chartConfig = {
        responsive: true,
        plugins: { legend: { labels: { color: '#32CD32' } } },
        scales: { x: { ticks: { color: '#32CD32' } }, y: { ticks: { color: '#32CD32' } } }
      }

      // Users Growth Chart
      const usersCtx = document.getElementById('usersChart')
      if (usersCtx) {
        charts.value.users = new window.Chart(usersCtx, {
          type: 'line',
          data: {
            labels: getLast30DaysLabels(),
            datasets: [{
              label: getText('newUsers'),
              data: getUserGrowthData(),
              borderColor: '#32CD32',
              backgroundColor: 'rgba(255, 235, 124, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#32CD32' } } },
            scales: {
              x: { ticks: { color: '#32CD32' } },
              y: { ticks: { color: '#32CD32' }, beginAtZero: true }
            }
          }
        })
      }

      // Posts Distribution Chart
      const postsCtx = document.getElementById('postsChart')
      if (postsCtx) {
        charts.value.posts = new window.Chart(postsCtx, {
          type: 'doughnut',
          data: {
            labels: [getText('imagePosts'), getText('videoPosts')],
            datasets: [{
              data: getPostsDistributionData(),
              backgroundColor: ['#32CD32', '#8D99AE']
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#32CD32' } } }
          }
        })
      }


      // Engagement Chart
      const engagementCtx = document.getElementById('engagementChart')
      if (engagementCtx) {
        charts.value.engagement = new window.Chart(engagementCtx, {
          type: 'bar',
          data: {
            labels: [getText('likes'), getText('comments')],
            datasets: [{
              label: getText('engagementData'),
              data: [dashboardStats.value.totalLikes, dashboardStats.value.totalComments],
              backgroundColor: ['#32CD32', '#2B2D42']
            }]
          },
          options: chartConfig
        })
      }

      // Top Users Chart
      const topUsersCtx = document.getElementById('topUsersChart')
      if (topUsersCtx) {
        const topUsersData = getTopUsersData()
        if (topUsersData.labels.length > 0) {
          charts.value.topUsers = new window.Chart(topUsersCtx, {
            type: 'bar',
            data: {
              labels: topUsersData.labels,
              datasets: [{
                label: getText('posts'),
                data: topUsersData.data,
                backgroundColor: '#32CD32'
              }]
            },
            options: {
              responsive: true,
              indexAxis: 'y',
              plugins: { legend: { labels: { color: '#32CD32' } } },
              scales: {
                x: { ticks: { color: '#32CD32' }, beginAtZero: true },
                y: { ticks: { color: '#32CD32' } }
              }
            }
          })
        }
      }
    }

    // Chart Data
    const getLast30DaysLabels = () => {
      const days = []
      for (let i = 29; i >= 0; i -= 5) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        days.push(date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }))
      }
      return days
    }

    const getUserGrowthData = () => {
      const data = new Array(6).fill(0)
      const today = new Date()

      allUsers.value.forEach(user => {
        const userDate = user.Created?.toDate ? user.Created.toDate() : new Date(user.Created || 0)
        const diffDays = Math.floor((today - userDate) / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays < 30) {
          const periodIndex = Math.floor(diffDays / 5)
          if (periodIndex < 6) {
            data[5 - periodIndex]++
          }
        }
      })

      return data
    }

    const getPostsDistributionData = () => {
      let imagePosts = 0, videoPosts = 0

      allPosts.value.forEach(post => {
        if (post.MediaType?.includes('image')) {
          imagePosts++
        } else if (post.MediaType?.includes('video')) {
          videoPosts++
        }
      })

      return [imagePosts, videoPosts]
    }


    const getTopUsersData = () => {
      const userPostCounts = {}
      allPosts.value.forEach(post => {
        const userName = post.UserName || getText('unknownUser')
        userPostCounts[userName] = (userPostCounts[userName] || 0) + 1
      })

      const sortedUsers = Object.entries(userPostCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

      return {
        labels: sortedUsers.map(([name]) => name),
        data: sortedUsers.map(([, count]) => count)
      }
    }

    // Tab Management
    const setActiveTab = (tab) => {
      activeTab.value = tab
      userSearchTerm.value = ''
      postSearchTerm.value = ''
      userSearchResults.value = []
      postSearchResults.value = []

      if (tab === 'dashboard') {
        nextTick(() => initializeCharts())
      }
    }

    // Search
    const handleSearch = (searchTerm, searchFunction, resultsRef) => {
      if (searchTimeout.value) clearTimeout(searchTimeout.value)
      searchTimeout.value = setTimeout(async () => {
        const query = searchTerm.trim()
        resultsRef.value = query ? await searchFunction(query) : []
      }, 300)
    }

    const handleUserSearch = () => handleSearch(userSearchTerm.value, searchUsers, userSearchResults)
    const handlePostSearch = () => handleSearch(postSearchTerm.value, searchPosts, postSearchResults)

    const clearUserSearch = () => {
      userSearchTerm.value = ''
      userSearchResults.value = []
    }

    const clearPostSearch = () => {
      postSearchTerm.value = ''
      postSearchResults.value = []
    }

    // Delete Handlers
    const handleDeleteUser = async (user) => {
      if (!confirm(`${getText('confirmDeleteUser')}: ${user.UserName || user.Email}?`)) return

      try {
        await deleteUserAccount(user.id)
        await loadData()
        updateCharts()
      } catch (error) {
        console.error('Delete user error:', error)
      }
    }

    const handleDeletePost = async (post) => {
      if (!confirm(`${getText('confirmDeletePost')}: ${post.Caption || 'Untitled'}?`)) return

      try {
        await deletePost(post.id)
        await loadData()
        updateCharts()
      } catch (error) {
        console.error('Delete post error:', error)
      }
    }

    // Update Charts
    const updateCharts = () => {
      try {
        if (charts.value.users) {
          charts.value.users.data.datasets[0].data = getUserGrowthData()
          charts.value.users.update()
        }
        if (charts.value.posts) {
          charts.value.posts.data.datasets[0].data = getPostsDistributionData()
          charts.value.posts.update()
        }
        if (charts.value.engagement) {
          charts.value.engagement.data.datasets[0].data = [dashboardStats.value.totalLikes, dashboardStats.value.totalComments]
          charts.value.engagement.update()
        }
        if (charts.value.topUsers) {
          const topUsersData = getTopUsersData()
          charts.value.topUsers.data.labels = topUsersData.labels
          charts.value.topUsers.data.datasets[0].data = topUsersData.data
          charts.value.topUsers.update()
        }
      } catch (error) {
        console.error('Error updating charts:', error)
      }
    }

    // Analytics Helpers
    const getNewUsersToday = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return allUsers.value.filter(user => {
        const userDate = user.Created?.toDate ? user.Created.toDate() : new Date(user.Created || 0)
        return userDate >= today
      }).length
    }

    const getActiveUsers = () => {
      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)
      return allUsers.value.filter(user => {
        const userDate = user.Created?.toDate ? user.Created.toDate() : new Date(user.Created || 0)
        return userDate >= last30Days
      }).length
    }

    const getPostsToday = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return allPosts.value.filter(post => {
        const postDate = post.Created?.toDate ? post.Created.toDate() : new Date(post.Created || 0)
        return postDate >= today
      }).length
    }

    const getEngagementRate = () => {
      return dashboardStats.value.totalPosts === 0 ? 0 :
        Math.round((totalInteractions.value / dashboardStats.value.totalPosts) * 100) / 100
    }

    const getCurrentDate = () => new Date().toLocaleDateString('vi-VN')

    // Lifecycle
    onMounted(async () => {
      await loadData()
      if (activeTab.value === 'dashboard') {
        nextTick(() => initializeCharts())
      }
    })

    return {
      // State
      isLoading, dashboardStats, totalInteractions, avgInteractionsPerPost,
      activeTab, userSearchTerm, postSearchTerm, allUsers, allPosts,
      displayedUsers, displayedPosts,

      // Methods
      getText, formatAdminDate, setActiveTab,
      handleUserSearch, clearUserSearch, handlePostSearch, clearPostSearch,
      handleDeleteUser, handleDeletePost,
      getNewUsersToday, getActiveUsers, getPostsToday, getEngagementRate, getCurrentDate
    }
  }
}
</script>

<style scoped>
.admin-main-fullscreen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.admin-tabs {
  display: flex;
  border-bottom: 1px solid var(--theme-color-20);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: transparent;
  border: none;
  color: var(--theme-color);
  font-size: 0.875rem;
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
  border-bottom: 3px solid var(--theme-color);
}

.admin-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  min-height: 0;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: var(--theme-color-10);
  transform: translateY(-2px);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--theme-color);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--theme-color);
  opacity: 0.8;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.chart-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.75rem;
  padding: 1.5rem;
  min-height: 300px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 1rem 0;
  text-align: center;
}

.admin-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  color: var(--theme-color);
  font-size: 1rem;
}

.search-section {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  height: 3rem;
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.5rem;
  padding: 0 1rem;
  font-size: 0.875rem;
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
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: rgba(255, 0, 0, 0.3);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
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
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 1rem 0;
}

.no-results {
  text-align: center;
  color: var(--theme-color);
  opacity: 0.6;
  padding: 3rem;
  font-size: 1rem;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.item:hover {
  background: var(--theme-color-10);
  border-color: var(--theme-color);
  transform: translateX(5px);
}

.item-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.avatar,
.media {
  width: 3rem;
  height: 3rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color-20);
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.media {
  border-radius: 0.5rem;
  background-image: none;
  background-color: var(--theme-color-20);
}

.details {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email {
  font-size: 0.875rem;
  color: var(--theme-color);
  opacity: 0.8;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date {
  font-size: 0.75rem;
  color: var(--theme-color);
  opacity: 0.6;
}

.actions {
  flex-shrink: 0;
}

.delete-btn {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: rgba(255, 0, 0, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover:not(:disabled) {
  background: rgba(255, 0, 0, 0.2);
  transform: scale(1.05);
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.analytics-card {
  background: var(--theme-color-05);
  border: 1px solid var(--theme-color-20);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.analytics-card h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color);
  margin: 0 0 1rem 0;
}

.analytics-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--theme-color);
}

.analytics-value {
  font-weight: 600;
  color: var(--theme-color);
  font-size: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.admin-content::-webkit-scrollbar {
  width: 0.5rem;
}

.admin-content::-webkit-scrollbar-track {
  background: var(--theme-color-10);
}

.admin-content::-webkit-scrollbar-thumb {
  background: var(--theme-color-20);
  border-radius: 0.25rem;
}

.admin-content::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
}

/* Responsive */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
  }
}
</style>