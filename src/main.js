/*
Entry point của ứng dụng Vue
Khởi tạo Vue app và mount router
*/
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')