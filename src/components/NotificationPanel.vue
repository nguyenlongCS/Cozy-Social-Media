<!--
src/components/NotificationPanel.vue
Component hiển thị dropdown panel thông báo
Logic:
- Hiển thị danh sách notifications với icon, message, time
- Mark as read khi click vào notification
- Mark all as read button
- Empty state khi không có notifications
- Click outside để đóng panel
-->
<template>
  <div class="notification-panel" @click.stop>
    <!-- Header -->
    <div class="panel-header">
      <h3 class="panel-title">{{ getText('notifications') }}</h3>
      <button 
        v-if="unreadCount > 0"
        class="mark-all-btn"
        @click="handleMarkAllAsRead"
        :disabled="isLoading"
      >
        {{ getText('markAllRead') }}
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="panel-loading">
      <div class="loading-spinner"></div>
      <span>{{ getText('loading') }}...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="notifications.length === 0" class="panel-empty">
      <div class="empty-icon">🔔</div>
      <p class="empty-text">{{ getText('noNotifications') }}</p>
    </div>

    <!-- Notifications list -->
    <div v-else class="notifications-list">
      <div
        v-for="notification in recentNotifications"
        :key="notification.id"
        class="notification-item"
        :class="{ unread: !notification.isRead }"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-icon">
          {{ getNotificationIcon(notification.type) }}
        </div>
        
        <div class="notification-content">
          <div class="notification-message">
            {{ notification.message }}
          </div>
          <div class="notification-time">
            {{ formatNotificationTime(notification.createdAt) }}
          </div>
        </div>
        
        <div v-if="!notification.isRead" class="unread-dot"></div>
      </div>
    </div>

    <!-- Footer - Removed -->
    <!-- Không cần footer vì chỉ hiện 10 notifications gần nhất -->
  </div>
</template>

<script>
import { useNotifications } from '@/composables/useNotifications'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'NotificationPanel',
  emits: ['close', 'notification-clicked'],
  setup(props, { emit }) {
    const {
      notifications,
      isLoading,
      unreadCount,
      recentNotifications,
      markAsRead,
      markAllAsRead,
      formatNotificationTime,
      getNotificationIcon
    } = useNotifications()
    
    const { getText } = useLanguage()

    // Handle notification click
    const handleNotificationClick = async (notification) => {
      // Mark as read nếu chưa đọc
      if (!notification.isRead) {
        await markAsRead(notification.id)
      }
      
      // Emit event để parent component xử lý navigation
      emit('notification-clicked', notification)
      
      // Đóng panel
      emit('close')
    }

    // Handle mark all as read
    const handleMarkAllAsRead = async () => {
      await markAllAsRead()
    }

    return {
      notifications,
      isLoading,
      unreadCount,
      recentNotifications,
      getText,
      formatNotificationTime,
      getNotificationIcon,
      handleNotificationClick,
      handleMarkAllAsRead
    }
  }
}
</script>

<style scoped>
.notification-panel {
  position: absolute;
  top: 3.5rem;
  right: 0;
  width: 20rem;
  max-height: 25rem;
  background: #2B2D42;
  border: 0.125rem solid var(--theme-color);
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid var(--theme-color-20);
  background: var(--theme-color-05);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
  margin: 0;
}

.mark-all-btn {
  background: none;
  border: 1px solid var(--theme-color-20);
  color: var(--theme-color);
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mark-all-btn:hover:not(:disabled) {
  background: var(--theme-color-10);
  border-color: var(--theme-color);
}

.mark-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.5rem;
  color: var(--theme-color);
  font-size: 0.75rem;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--theme-color-20);
  border-top: 2px solid var(--theme-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}

.empty-text {
  color: var(--theme-color);
  font-size: 0.75rem;
  opacity: 0.8;
  margin: 0;
}

.notifications-list {
  max-height: 18rem;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  border-bottom: 1px solid var(--theme-color-10);
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.notification-item:hover {
  background: var(--theme-color-05);
}

.notification-item.unread {
  background: var(--theme-color-10);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-icon {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-message {
  font-size: 0.75rem;
  color: var(--theme-color);
  line-height: 1.4;
  margin-bottom: 0.25rem;
  word-wrap: break-word;
}

.notification-time {
  font-size: 0.625rem;
  color: var(--theme-color);
  opacity: 0.6;
}

.unread-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--theme-color);
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 0.5rem;
  margin-top: 0.375rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.notifications-list::-webkit-scrollbar {
  width: 0.25rem;
}

.notifications-list::-webkit-scrollbar-track {
  background: var(--theme-color-10);
}

.notifications-list::-webkit-scrollbar-thumb {
  background: var(--theme-color-20);
  border-radius: 0.125rem;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: var(--theme-color);
}
</style>