import { defineStore } from 'pinia'
import type { User } from '@/domain/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
  }),
  actions: {
    setUser(user: User | null) {
      this.user = user
    },
  },
})
