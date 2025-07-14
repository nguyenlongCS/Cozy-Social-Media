<!--
Component navigation giữa header
Chứa 3 button: profile, home, message
-->
<template>
  <div class="nav-mid">
    <button class="profile-button btn"></button>
    <button class="friends-button btn"></button>
    <button class="home-button btn"></button>
    <button class="mess-button btn"></button>
    <button class="notification-button btn"></button>
  </div>
</template>

<script>
export default {
  name: 'NavMid'
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
  gap: 1.25rem;
  border-radius: 0.9375rem;
}

.home-button, .profile-button, .mess-button, .friends-button, .notification-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.home-button {
  background: url('src/icons/home.png') center/cover var(--theme-color);
}

.friends-button {
  background: url('src/icons/friends.png') center/cover var(--theme-color);
}

.profile-button {
  background: url('src/icons/profile.png') center/cover var(--theme-color);
}

.mess-button {
  background: url('src/icons/mess.png') center/cover var(--theme-color);
}

.notification-button {
  background: url('src/icons/notification.png') center/cover var(--theme-color);
}

.home-button:hover, .profile-button:hover, .mess-button:hover, .friends-button:hover, .notification-button:hover {
  transform: scale(1.15);
  background-color: #2B2D42;
}
</style>