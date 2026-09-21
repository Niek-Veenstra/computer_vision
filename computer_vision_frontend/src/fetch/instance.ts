import { createFetch } from '@vueuse/core'
import router from '@/router'
import { useTokenStore } from '@/stores/token'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const instance = createFetch({
  baseUrl: 'http://localhost:3000',
  options: {
    onFetchError({ response, data, error }) {
      const status = response?.status ?? 0

      if (status === 401) {
        useTokenStore().setToken(null)
        const currentRoute = router.currentRoute.value
        if (currentRoute.name !== 'login') {
          void router.replace({
            name: 'login',
            query: currentRoute.name === 'register' ? {} : { redirect: currentRoute.fullPath },
          })
        }
      }

      const serverMessage =
        typeof data === 'object' && data !== null && 'message' in data ? data.message : null
      const message = Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage
      let errorMessage: string
      if (typeof message === 'string') {
        errorMessage = message
      } else if (status === 0) {
        errorMessage = 'Could not connect to the server. Try again.'
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message
      } else {
        errorMessage = 'The request failed. Try again.'
      }

      return { error: new ApiError(status, errorMessage) }
    },
  },
})

export { instance as useFetch }
