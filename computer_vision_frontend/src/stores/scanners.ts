import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UseFetchReturn } from '@vueuse/core'
import type { Scanner } from '@/domain/scanner'
import { createScanner, listScanners, revokeScanner, rotateScannerKey } from '@/fetch/scanners'

async function resultOf<T>(request: UseFetchReturn<T>): Promise<T> {
  await request.execute()
  if (request.error.value) throw request.error.value
  if (request.data.value === null) throw new Error('The scanner response was empty.')
  return request.data.value
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

export const useScannersStore = defineStore('scanners', () => {
  const scanners = ref<Scanner[]>([])
  const loading = ref(false)
  const creating = ref(false)
  const busyId = ref<string | null>(null)
  const loadError = ref('')
  const createError = ref('')
  const actionErrors = ref<Record<string, string>>({})

  function upsert(scanner: Scanner) {
    const index = scanners.value.findIndex((item) => item.id === scanner.id)
    if (index === -1) scanners.value.unshift(scanner)
    else scanners.value[index] = scanner
  }

  async function load() {
    if (loading.value) return
    loading.value = true
    loadError.value = ''
    scanners.value = []
    try {
      scanners.value = await resultOf(listScanners())
    } catch (error) {
      loadError.value = messageOf(error)
    } finally {
      loading.value = false
    }
  }

  async function create(name: string) {
    if (creating.value) return null
    creating.value = true
    createError.value = ''
    try {
      const result = await resultOf(createScanner(name.trim()))
      upsert(result.scanner)
      return result
    } catch (error) {
      createError.value = messageOf(error)
      return null
    } finally {
      creating.value = false
    }
  }

  async function rotateKey(id: string) {
    if (busyId.value) return null
    busyId.value = id
    actionErrors.value[id] = ''
    try {
      const result = await resultOf(rotateScannerKey(id))
      upsert(result.scanner)
      return result
    } catch (error) {
      actionErrors.value[id] = messageOf(error)
      return null
    } finally {
      busyId.value = null
    }
  }

  async function revoke(id: string) {
    if (busyId.value) return false
    busyId.value = id
    actionErrors.value[id] = ''
    try {
      const request = revokeScanner(id)
      await request.execute()
      if (request.error.value) throw request.error.value
      const scanner = scanners.value.find((item) => item.id === id)
      if (scanner) scanner.revokedAt = new Date().toISOString()
      return true
    } catch (error) {
      actionErrors.value[id] = messageOf(error)
      return false
    } finally {
      busyId.value = null
    }
  }

  return {
    scanners,
    loading,
    creating,
    busyId,
    loadError,
    createError,
    actionErrors,
    load,
    create,
    rotateKey,
    revoke,
  }
})
