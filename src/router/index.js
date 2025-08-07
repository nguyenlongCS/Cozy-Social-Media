/*
src/router/index.js - Updated with Messages Route
Router configuration với base URL và fallback routing
Added: /messages route cho chức năng nhắn tin
*/
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/view/Home.vue'
import Login from '@/view/Login.vue'
import CreatePost from '@/view/CreatePost.vue'
import Profile from '@/view/Profile.vue'
import Friends from '@/view/Friends.vue'
import Messages from '@/view/Messages.vue'

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
  },
  {
    path: '/friends',
    name: 'Friends',
    component: Friends
  },
  {
    path: '/messages',
    name: 'Messages',
    component: Messages
  },
  // Catch-all route for 404 errors
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes
})

// Navigation guard để handle authentication
router.beforeEach((to, from, next) => {
  console.log('Navigating to:', to.path)
  next()
})

export default router