import { type UseFetchOptions } from '@vueuse/core'
import { useFetch } from './instance'
import type { User } from '@/domain/user'

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

export function getUser(id: number) {
  return useFetch(`/users/${id}`).json()
}

export function getCurrentUser() {
  const token = localStorage.getItem('token')
  return useFetch('/users/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).json()
}
