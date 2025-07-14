<!--
Component main content
Chứa post với thông tin user, timestamp, media area và actions
-->
<template>
  <div class="main">
    <div class="user-info">
      <div class="avatar"></div>
      <span class="name">Tên Người Dùng</span>
    </div>
    <div class="timestamp">12:34, 12/07/2025</div>
    <div class="media-area"></div>
    <div class="bottom-bar">
      <span class="caption">Đây là một chú thích mẫu cho bài đăng.</span>
      <div class="actions">
        <button class="like"></button>
        <button class="options-menu"></button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Main'
}
</script>

<style scoped>
.main {
  width: 39.53%;
  height: 26.44rem;
  margin: 3rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 0.9375rem;
  border: 0.125rem solid var(--theme-color);
  background: #2B2D42;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.2);
}

.user-info {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.avatar {
  width: 1.875rem;
  height: 1.875rem;
  background: url('src/icons/user.png') center/cover var(--theme-color);
  border: 0.125rem solid var(--theme-color);
  border-radius: 50%;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
}

.name {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--theme-color);
}

.timestamp {
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  font-size: 0.75rem;
  color: var(--theme-color);
  font-weight: 400;
}

.media-area {
  width: 80%;
  height: 18.75rem;
  background: var(--theme-color) url('src/icons/plus.png') center/3rem no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9375rem;
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);
  color: #000;
  font-size: 1rem;
  font-weight: 500;
}

.bottom-bar {
  position: absolute;
  bottom: 0.625rem;
  left: 0.625rem;
  right: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.caption {
  font-size: 0.75rem;
  max-width: 50%;
  background: var(--theme-color);
  padding: 0.3125rem 0.625rem;
  border-radius: 0.9375rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  color: #000;
}

.actions {
  display: flex;
  gap: 0.625rem;
}

.like, .options-menu {
  width: 1.875rem;
  height: 1.875rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.like {
  background: url('src/icons/like.png') center/cover var(--theme-color);
}

.options-menu {
  background: url('src/icons/options.png') center/cover var(--theme-color);
}

.like:hover, .options-menu:hover {
  transform: scale(1.1);
  box-shadow: 0 0.25rem 0.625rem rgba(0, 0, 0, 0.4);
  background-color: #2B2D42;
}
</style>