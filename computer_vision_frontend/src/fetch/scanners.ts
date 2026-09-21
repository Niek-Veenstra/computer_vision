import type { UseFetchOptions } from '@vueuse/core'
import type { Scanner, ScannerKeyResult } from '@/domain/scanner'
import { useFetch } from './instance'

const scannerFetchOptions: UseFetchOptions = {
  immediate: false,
  beforeFetch({ options }) {
    const token = localStorage.getItem('token')
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return { options: { ...options, headers } }
  },
}

export function listScanners() {
  return useFetch('/scanners', {}, scannerFetchOptions).get().json<Scanner[]>()
}

export function createScanner(name: string) {
  return useFetch('/scanners', {}, scannerFetchOptions)
    .post({ name })
    .json<ScannerKeyResult>()
}

export function rotateScannerKey(id: string) {
  return useFetch(`/scanners/${encodeURIComponent(id)}/rotate-key`, {}, scannerFetchOptions)
    .post()
    .json<ScannerKeyResult>()
}

export function revokeScanner(id: string) {
  return useFetch(`/scanners/${encodeURIComponent(id)}`, {}, scannerFetchOptions).delete()
}
