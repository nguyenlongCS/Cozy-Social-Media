/*
Router configuration
Định nghĩa routes cho các view: Home, Login và CreatePost
*/
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/view/Home.vue'
import Login from '@/view/Login.vue'
import CreatePost from '@/view/CreatePost.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/createpost',
    name: 'CreatePost',
    component: CreatePost
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router