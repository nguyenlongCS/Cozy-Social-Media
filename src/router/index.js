/*
src/router/index.js - Updated with Profile Route
Router configuration
Định nghĩa routes cho các view: Home, Login, CreatePost và Profile
*/
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/view/Home.vue'
import Login from '@/view/Login.vue'
import CreatePost from '@/view/CreatePost.vue'
import Profile from '@/view/Profile.vue'

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
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router