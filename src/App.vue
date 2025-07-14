<!--
Main App component chứa router-view để hiển thị các view
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