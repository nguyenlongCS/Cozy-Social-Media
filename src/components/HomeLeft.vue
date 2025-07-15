<!--
Component sidebar bên trái - Refactored
Logic: 
- Sử dụng composables để quản lý language
- Chứa các button: Tạo Bài Đăng, Khám Phá, Cài Đặt
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
import { watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

export default {
  name: 'Menu',
  props: {
    currentLanguage: {
      type: String,
      default: 'vi'
    }
  },
  setup(props) {
    const { getText, syncWithProp } = useLanguage()

    // Sync với prop changes
    watch(() => props.currentLanguage, (newLang) => {
      syncWithProp(newLang)
    }, { immediate: true })

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