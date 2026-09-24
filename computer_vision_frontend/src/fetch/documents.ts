import type { UseFetchOptions } from '@vueuse/core'
import type { JSONContent } from '@tiptap/vue-3'
import type { PortalDocument } from '@/domain/document'
import type {
  DocumentMarkers,
  DocumentMarkerUpdateRequest,
  DocumentMarkerUpdateResult,
} from '@/domain/document-marker'
import { useFetch } from './instance'

function scannerFetchOptions(apiKey: string): UseFetchOptions {
  return {
    immediate: false,
    beforeFetch({ options }) {
      const headers = new Headers(options.headers)
      headers.set('X-Scanner-Key', apiKey)
      return { options: { ...options, headers } }
    },
  }
}

const documentFetchOptions: UseFetchOptions = {
  immediate: false,
  beforeFetch({ options }) {
    const token = localStorage.getItem('token')
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return { options: { ...options, headers } }
  },
}

export function listDocuments() {
  return useFetch('/documents', {}, documentFetchOptions).get().json<PortalDocument[]>()
}

export function getDocument(id: string) {
  return useFetch(`/documents/${encodeURIComponent(id)}`, {}, documentFetchOptions)
    .get()
    .json<PortalDocument>()
}

export function createDocument(title: string, content: JSONContent) {
  return useFetch('/documents', {}, documentFetchOptions)
    .post({ title, content })
    .json<PortalDocument>()
}

export function updateDocument(
  id: string,
  version: number,
  changes: { title?: string; content?: JSONContent },
) {
  return useFetch(`/documents/${encodeURIComponent(id)}`, {}, documentFetchOptions)
    .patch({ version, ...changes })
    .json<PortalDocument>()
}

export function getDocumentMarkers(id: string, scannerApiKey: string) {
  return useFetch(
    `/reader/documents/${encodeURIComponent(id)}/markers`,
    {},
    scannerFetchOptions(scannerApiKey),
  )
    .get()
    .json<DocumentMarkers>()
}

export function updateDocumentMarker(
  id: string,
  scannerApiKey: string,
  markerId: string,
  request: DocumentMarkerUpdateRequest,
) {
  return useFetch(
    `/reader/documents/${encodeURIComponent(id)}/markers/${encodeURIComponent(markerId)}`,
    {},
    scannerFetchOptions(scannerApiKey),
  )
    .patch(request)
    .json<DocumentMarkerUpdateResult>()
}
