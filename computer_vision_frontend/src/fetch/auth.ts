import type { UseFetchOptions } from '@vueuse/core'
import { useFetch } from './instance'

type AuthenticationRequestBody = {
  email: string
  password: string
}
export function postAuthentication(body: AuthenticationRequestBody, options?: UseFetchOptions) {
  return useFetch('/auth/authenticate', options ?? {})
    .post(body)
    .json()
}
