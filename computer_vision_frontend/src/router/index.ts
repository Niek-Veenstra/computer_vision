import Documents from '@/pages/DocumentsPage.vue'
import Exporter from '@/pages/ExporterPage.vue'
import Home from '@/pages/HomePage.vue'
import Login from '@/pages/LoginPage.vue'
import Settings from '@/pages/SettingsPage.vue'
import Signup from '@/pages/SignupPage.vue'
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
