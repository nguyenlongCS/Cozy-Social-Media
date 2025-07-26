<!--
Component logo sidebar bên trái trang login - Refactored
Logic: Loại bỏ props không sử dụng
-->
<template>
  <div class="logo">
  </div>
</template>

<script>
export default {
  name: 'Logo'
}
</script>

<style scoped>
.logo {
  width: 22.13%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2.5rem;
  gap: 1.25rem;
}
</style>