<!--
src/components/NavMid.vue - Updated với Friends Navigation
Component navigation giữa header với icons nhỏ hơn
Logic: Hiển thị 5 navigation buttons khi không ở trang login
Added: Navigation đến trang friends khi click friends-button
UI: Icons được làm nhỏ lại
-->
<template>
  <div class="nav-mid">
    <button v-if="!isLoginPage" class="profile-button btn" @click="goToProfile"></button>
    <button v-if="!isLoginPage" class="friends-button btn" @click="goToFriends"></button>
    <button v-if="!isLoginPage" class="home-button btn" @click="goToHome"></button>
    <button v-if="!isLoginPage" class="mess-button btn"></button>
    <button v-if="!isLoginPage" class="notification-button btn"></button>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'NavMid',
  setup() {
    const router = useRouter()
    const route = useRoute()

    const isLoginPage = computed(() => route.name === 'Login')

    const goToHome = () => {
      router.push('/')
    }

    const goToProfile = () => {
      router.push('/profile')
    }

    const goToFriends = () => {
      router.push('/friends')
    }

    return {
      isLoginPage,
      goToHome,
      goToProfile,
      goToFriends
    }
  }
}
</script>

<style scoped>
.nav-mid {
  width: 39.53%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  border-radius: 0.9375rem;
}

.home-button, .profile-button, .mess-button, .friends-button, .notification-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.home-button {
  background: url('@/icons/home.png') center/1.5rem var(--theme-color); /* UPDATED: Smaller icon */
  background-repeat: no-repeat;
}

.friends-button {
  background: url('@/icons/friends.png') center/1.5rem var(--theme-color); /* UPDATED: Smaller icon */
  background-repeat: no-repeat;
}

.profile-button {
  background: url('@/icons/profile.png') center/1.5rem var(--theme-color); /* UPDATED: Smaller icon */
  background-repeat: no-repeat;
}

.mess-button {
  background: url('@/icons/mess.png') center/1.5rem var(--theme-color); /* UPDATED: Smaller icon */
  background-repeat: no-repeat;
}

.notification-button {
  background: url('@/icons/notification.png') center/1.5rem var(--theme-color); /* UPDATED: Smaller icon */
  background-repeat: no-repeat;
}

.home-button:hover, .profile-button:hover, .mess-button:hover, .friends-button:hover, .notification-button:hover {
  transform: scale(1.15);
  background-color: #2B2D42;
}
</style>