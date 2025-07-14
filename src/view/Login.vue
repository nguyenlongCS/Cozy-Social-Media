<!--
View trang đăng nhập
Hiện tại chỉ là placeholder, chưa có form đăng nhập
-->
<template>
  <div class="login">
    <h1>Login Page</h1>
    <p>This is a placeholder for login page</p>
  </div>
</template>

<script>
export default {
  name: 'Login'
}
</script>

<style scoped>
.login {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #2B2D42;
  color: var(--theme-color);
}

.login h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.login p {
  font-size: 1rem;
}
</style>