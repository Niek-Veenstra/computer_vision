import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UseFetchReturn } from '@vueuse/core'
import type { JSONContent } from '@tiptap/vue-3'
import type { PortalDocument } from '@/domain/document'
import { ApiError } from '@/fetch/instance'
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from '@/fetch/documents'

type Changes = { title?: string; content?: JSONContent }
type SaveState = 'saving' | 'saved' | 'error' | 'conflict'

async function executeDocumentFetch<T>(request: UseFetchReturn<T>): Promise<T> {
  await request.execute()
  if (request.error.value) throw request.error.value
  if (request.data.value === null) throw new Error('The document response was empty.')
  return request.data.value
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<PortalDocument[]>([])
  const loading = ref(false)
  const creating = ref(false)
  const loadError = ref('')
  const createError = ref('')
  const saveState = ref<Record<string, SaveState>>({})
  const saveErrors = ref<Record<string, string>>({})

  const pending = new Map<string, Changes>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const saving = new Set<string>()
  let listRequest: Promise<void> | null = null

  function upsert(document: PortalDocument) {
    const index = documents.value.findIndex((item) => item.id === document.id)
    if (index === -1) documents.value.unshift(document)
    else documents.value[index] = document
    if (!saveState.value[document.id]) saveState.value[document.id] = 'saved'
  }

  function load() {
    if (listRequest) return listRequest
    loading.value = true
    loadError.value = ''
    listRequest = executeDocumentFetch(listDocuments())
      .then((result) => {
        const localEdits = documents.value.filter(
          (document) => pending.has(document.id) || saving.has(document.id),
        )
        const editedById = new Map(localEdits.map((document) => [document.id, document]))
        const returnedIds = new Set(result.map((document) => document.id))
        documents.value = [
          ...result.map((document) => editedById.get(document.id) ?? document),
          ...localEdits.filter((document) => !returnedIds.has(document.id)),
        ]
        for (const document of result) {
          if (!saveState.value[document.id]) saveState.value[document.id] = 'saved'
        }
      })
      .catch((error: unknown) => {
        loadError.value = errorMessage(error)
      })
      .finally(() => {
        loading.value = false
        listRequest = null
      })
    return listRequest
  }

  async function loadOne(id: string) {
    const cached = documents.value.find((item) => item.id === id)
    if (cached) return cached
    loadError.value = ''
    try {
      const document = await executeDocumentFetch(getDocument(id))
      upsert(document)
      return document
    } catch (error) {
      loadError.value = errorMessage(error)
      return null
    }
  }

  async function create() {
    if (creating.value) return null
    creating.value = true
    createError.value = ''
    try {
      const document = await executeDocumentFetch(
        createDocument('Untitled document', {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        }),
      )
      upsert(document)
      saveState.value[document.id] = 'saved'
      return document
    } catch (error) {
      createError.value = errorMessage(error)
      return null
    } finally {
      creating.value = false
    }
  }

  function update(id: string, changes: Changes) {
    const document = documents.value.find((item) => item.id === id)
    if (!document) return
    const normalized = {
      ...changes,
      ...(changes.title !== undefined && { title: changes.title.trim() || 'Untitled document' }),
    }
    Object.assign(document, normalized)
    pending.set(id, { ...pending.get(id), ...normalized })
    if (saveState.value[id] === 'conflict') return
    saveState.value[id] = 'saving'
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.set(
      id,
      setTimeout(() => void saveNow(id), 700),
    )
  }

  async function saveNow(id: string) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    if (saving.has(id) || saveState.value[id] === 'conflict') return

    const changes = pending.get(id)
    const document = documents.value.find((item) => item.id === id)
    if (!changes || !document) return
    pending.delete(id)
    saving.add(id)
    saveState.value[id] = 'saving'
    try {
      const saved = await executeDocumentFetch(updateDocument(id, document.version, changes))
      const current = documents.value.find((item) => item.id === id)
      if (current) {
        current.version = saved.version
        current.updatedAt = saved.updatedAt
        current.updatedById = saved.updatedById
        if (!pending.has(id)) Object.assign(current, saved)
      }
      saveErrors.value[id] = ''
      saveState.value[id] = pending.has(id) ? 'saving' : 'saved'
    } catch (error) {
      pending.set(id, { ...changes, ...pending.get(id) })
      const conflict = error instanceof ApiError && error.status === 409
      saveState.value[id] = conflict ? 'conflict' : 'error'
      saveErrors.value[id] = conflict
        ? 'This document changed on the server. Your edits are still on this page. Copy them before reloading the latest version.'
        : errorMessage(error)
    } finally {
      saving.delete(id)
      if (saveState.value[id] === 'saving' && pending.has(id)) void saveNow(id)
    }
  }

  function retrySave(id: string) {
    if (saveState.value[id] !== 'error') return
    saveState.value[id] = 'saving'
    void saveNow(id)
  }

  async function reloadOne(id: string) {
    if (saving.has(id)) return
    try {
      const document = await executeDocumentFetch(getDocument(id))
      pending.delete(id)
      const timer = timers.get(id)
      if (timer) clearTimeout(timer)
      timers.delete(id)
      upsert(document)
      saveErrors.value[id] = ''
      saveState.value[id] = 'saved'
      return document
    } catch (error) {
      saveErrors.value[id] = errorMessage(error)
      return null
    }
  }

  return {
    documents,
    loading,
    creating,
    loadError,
    createError,
    saveState,
    saveErrors,
    load,
    loadOne,
    create,
    update,
    saveNow,
    retrySave,
    reloadOne,
  }
})
