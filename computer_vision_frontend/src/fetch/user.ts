import { useFetch, type UseFetchOptions } from '@vueuse/core'

type CreateUserRequestBody = {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

export function createUser(body: CreateUserRequestBody, options?: UseFetchOptions) {
  return useFetch('/auth/authenticate', options ?? {})
    .post(body)
    .json()
}
