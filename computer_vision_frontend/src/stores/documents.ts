import { defineStore } from 'pinia'
import { ref } from 'vue'
import { z } from 'zod'
import type { JSONContent } from '@tiptap/vue-3'
import type { PortalDocument } from '@/domain/document'

const storageKey = 'computer-vision.documents.v1'
const storedDocument = z.object({
  id: z.string(),
  title: z.string(),
  content: z
    .object({ type: z.literal('doc'), content: z.array(z.record(z.string(), z.unknown())) })
    .passthrough(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<PortalDocument[]>([])
  const storageError = ref('')
  let loaded = false
  let storageReadable = true

  function load() {
    if (loaded) return
    loaded = true
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) documents.value = z.array(storedDocument).parse(JSON.parse(saved))
    } catch {
      storageReadable = false
      storageError.value = 'Saved documents could not be loaded. Reload the page to try again.'
    }
  }

  function persist() {
    if (!storageReadable) return false
    try {
      localStorage.setItem(storageKey, JSON.stringify(documents.value))
      storageError.value = ''
      return true
    } catch {
      storageError.value =
        'Your changes could not be saved in this browser. Keep this page open and try saving again.'
      return false
    }
  }

  function create() {
    load()
    if (!storageReadable) return null
    const now = new Date().toISOString()
    const document: PortalDocument = {
      id: crypto.randomUUID(),
      title: 'Untitled document',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      createdAt: now,
      updatedAt: now,
    }
    documents.value.unshift(document)
    persist()
    return document
  }

  function update(id: string, changes: { title?: string; content?: JSONContent }) {
    const document = documents.value.find((item) => item.id === id)
    if (!document) return false
    if (changes.title !== undefined) document.title = changes.title.trim() || 'Untitled document'
    if (changes.content !== undefined) document.content = changes.content
    document.updatedAt = new Date().toISOString()
    return persist()
  }

  return { documents, storageError, load, create, update, persist }
})
