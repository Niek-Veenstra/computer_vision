import type { UseFetchOptions } from '@vueuse/core'
import type { JSONContent } from '@tiptap/vue-3'
import type { PortalDocument } from '@/domain/document'
import { useFetch } from './instance'

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
