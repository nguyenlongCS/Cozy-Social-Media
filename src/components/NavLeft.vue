<!--
src/components/NavLeft.vue - Refactored
Component navigation bên trái header
Logic: Hiển thị user icon và search input khi không ở trang login
-->
<template>
  <div class="nav-left">
    <div v-if="!isLoginPage" class="icon-user"></div>
    <input 
      v-if="!isLoginPage"
      type="text" 
      class="search" 
      :placeholder="getText('search')"
    >
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'NavLeft',
  setup() {
    const route = useRoute()
    const { getText } = useLanguage()

    const isLoginPage = computed(() => route.name === 'Login')

    return {
      isLoginPage,
      getText
    }
  }
}
</script>

<style scoped>
.nav-left {
  width: 22.13%;
  height: 3.5rem;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.625rem;
  padding-left: 0.625rem;
  border-radius: 0 0.9375rem 0.9375rem 0;
}

.icon-user {
  width: 1.875rem;
  height: 1.875rem;
  background: url('@/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid #000;
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
}

.search {
  width: 11.25rem;
  height: 1.875rem;
  background: var(--theme-color) url('@/icons/search.png') 0.3125rem center/1.25rem no-repeat;
  border: 0.125rem solid #000;
  border-radius: 0.9375rem;
  padding: 0 0.625rem 0 1.875rem;
  font-size: 0.875rem;
  color: #000;
  outline: none;
  transition: box-shadow 0.3s ease;
}

.search:focus {
  box-shadow: 0 0 0.5rem rgba(127, 255, 212, 0.6);
}
</style>