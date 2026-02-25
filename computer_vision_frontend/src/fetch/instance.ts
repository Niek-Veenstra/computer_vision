import { createFetch } from '@vueuse/core'

const instance = createFetch({
  baseUrl: 'http://localhost:3000',
})

export { instance as useFetch }
