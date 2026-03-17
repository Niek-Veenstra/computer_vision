import { defineStore } from 'pinia'

export const useTokenStore = defineStore('token', {
  state: () => ({
    token: null as string | null,
  }),
  actions: {
    setToken(token: string | null) {
      this.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    loadTokenFromStorage() {
      const t = localStorage.getItem('token')
      if (t) this.token = t
    },
  },
})
