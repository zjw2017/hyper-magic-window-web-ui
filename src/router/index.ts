import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  // history: createWebHistory(import.meta.env.BASE_URL),
  history: createWebHashHistory(),
  routes: [
    // {
    //   path: '/',
    //   redirect: '/home'
    // },
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/autoui',
      name: 'autoui',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AutoUIView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SettingsView.vue')
    },
    {
      path: '/embedded-webview',
      name: 'embedded-webview',
      component: () => import('../views/EmbeddedWebView.vue')
    }
  ]
})

export default router
