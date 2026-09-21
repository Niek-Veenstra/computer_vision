import type { NavigationGuard } from 'vue-router'

export const requireToken: NavigationGuard = (to) => {
  if (to.name === 'login' || to.name === 'register') return true

  const token = localStorage.getItem('token')
  if (token?.trim()) return true

  return { name: 'login', query: { redirect: to.fullPath } }
}
