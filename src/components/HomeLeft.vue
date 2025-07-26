<!--
Component sidebar bên trái - Refactored
Logic: 
- Loại bỏ props và watch logic phức tạp không cần thiết
- Đơn giản hóa component chỉ sử dụng useLanguage trực tiếp
-->
<template>
  <div class="menu">
    <button class="btn">
      {{ getText('createPost') }}
    </button>
    <button class="btn">
      {{ getText('explore') }}
    </button>
    <button class="btn">
      {{ getText('settings') }}
    </button>
  </div>
</template>

<script>
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'Menu',
  setup() {
    const { getText } = useLanguage()

    return {
      getText
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