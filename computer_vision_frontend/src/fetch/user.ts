import { type UseFetchOptions } from '@vueuse/core'
import { useFetch } from './instance'
import type { DateValue } from '@internationalized/date'

type CreateUserRequestBody = {
  firstName: string
  lastName: string
  email: string
  password: string
  birthDate: DateValue
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
