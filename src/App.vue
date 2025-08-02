<!--
src/App.vue - Simplified
Main App component
Logic:
- Simple app wrapper without auto posting logic
- Auto posting được xử lý bởi Cloud Functions 24/7
- Client không cần quản lý background tasks
-->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
@import './assets/main.css';
</style>