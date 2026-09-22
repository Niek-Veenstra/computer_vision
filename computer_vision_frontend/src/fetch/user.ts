import { type UseFetchOptions } from '@vueuse/core'
import { useFetch } from './instance'
import type { User } from '@/domain/user'

const accountFetchOptions: UseFetchOptions = {
  immediate: false,
  beforeFetch({ options }) {
    const token = localStorage.getItem('token')
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return { options: { ...options, headers } }
  },
}

type CreateUserRequestBody = {
  firstName: string
  lastName: string
  email: string
  password: string
  birthDate: string
}

export function createUser(
  { firstName, lastName, email, password, birthDate }: CreateUserRequestBody,
  options?: UseFetchOptions,
) {
  return useFetch('/users', options ?? {})
    .post({ firstName, lastName, email, password, birthDate })
    .json()
}

export function getUser(id: string) {
  return useFetch(`/users/${encodeURIComponent(id)}`).json<User>()
}

export function getCurrentUser() {
  return useFetch('/users/me', {}, accountFetchOptions).get().json<User>()
}

export function updateCurrentUser(body: {
  firstName: string
  lastName: string
  email: string
  logoDataUrl: string | null
}) {
  return useFetch('/users/me', {}, accountFetchOptions).patch(body).json<User>()
}

export function changeCurrentUserPassword(body: { currentPassword: string; newPassword: string }) {
  return useFetch('/users/me/password', {}, accountFetchOptions).patch(body)
}
