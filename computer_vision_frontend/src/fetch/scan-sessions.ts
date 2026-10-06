import type { UseFetchOptions } from '@vueuse/core'
import type { ScanSession } from '@/domain/scan-session'
import { useFetch } from './instance'

const authenticatedFetchOptions: UseFetchOptions = {
  immediate: false,
  beforeFetch({ options }) {
    const token = localStorage.getItem('token')
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return { options: { ...options, headers } }
  },
}

export function createScanSession(documentId: string, scannerId: string) {
  return useFetch(
    `/documents/${encodeURIComponent(documentId)}/scan-sessions`,
    {},
    authenticatedFetchOptions,
  )
    .post({ scannerId })
    .json<ScanSession>()
}

export function listScanSessions(documentId: string) {
  return useFetch(
    `/documents/${encodeURIComponent(documentId)}/scan-sessions`,
    {},
    authenticatedFetchOptions,
  )
    .get()
    .json<ScanSession[]>()
}

export function stopScanSession(documentId: string, sessionId: string) {
  return useFetch(
    `/documents/${encodeURIComponent(documentId)}/scan-sessions/${encodeURIComponent(sessionId)}`,
    {},
    authenticatedFetchOptions,
  )
    .patch({ status: 'completed' })
    .json<ScanSession>()
}

export function deleteScanSession(documentId: string, sessionId: string) {
  return useFetch(
    `/documents/${encodeURIComponent(documentId)}/scan-sessions/${encodeURIComponent(sessionId)}`,
    {},
    authenticatedFetchOptions,
  ).delete()
}
