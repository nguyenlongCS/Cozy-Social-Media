<!--
Component sidebar bên trái
Chứa các button: Tạo Bài Đăng, Khám Phá, Cài Đặt
-->
<template>
  <div class="menu">
    <button class="btn">
      {{ currentLanguage === 'vi' ? 'Tạo Bài Đăng' : 'Create Post' }}
    </button>
    <button class="btn">
      {{ currentLanguage === 'vi' ? 'Khám Phá' : 'Explore' }}
    </button>
    <button class="btn">
      {{ currentLanguage === 'vi' ? 'Cài Đặt' : 'Settings' }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'Menu',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  }
}
</script>

<style scoped>
.menu {
  width: 22.13%;
  background: #2B2D42;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2.5rem;
  gap: 1.25rem;
}

.menu .btn {
  width: 11.25rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.3125rem;
  font-size: 0.875rem;
}
</style>