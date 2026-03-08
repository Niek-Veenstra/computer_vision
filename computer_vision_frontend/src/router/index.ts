import Documents from '@/pages/Documents.vue'
import Exporter from '@/pages/Exporter.vue'
import Home from '@/pages/Home.vue'
import Login from '@/pages/Login.vue'
import Settings from '@/pages/Settings.vue'
import Signup from '@/pages/Signup.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/login',
      component: Login,
      name: 'login',
    },
    {
      path: '/register',
      component: Signup,
      name: 'register',
    },
    {
      path: '/home',
      component: Home,
    },
    {
      path: '/documents',
      component: Documents,
    },
    {
      path: '/exporter',
      component: Exporter,
    },
    {
      path: '/settings',
      component: Settings,
    },
  ],
})

router.beforeEach((to, from) => {})

export default router
