<script setup lang="ts">
defineOptions({ name: 'DocumentPage' })
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftIcon, CheckIcon, FileQuestionIcon, ScanLineIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ScanSession } from '@/domain/scan-session'
import { createScanSession } from '@/fetch/scan-sessions'
import { useDocumentsStore } from '@/stores/documents'
import { useScannersStore } from '@/stores/scanners'
import DocumentEditor from '@/ui/documents/DocumentEditor.vue'

const route = useRoute('document')
const store = useDocumentsStore()
const scannersStore = useScannersStore()
const document = computed(() => store.documents.find((item) => item.id === route.params.documentId))
const title = ref(document.value?.title ?? '')
const loadingDocument = ref(!document.value)
const editorKey = ref(0)
const selectedScannerId = ref('')
const startingSession = ref(false)
const sessionError = ref('')
const activeSession = ref<ScanSession | null>(null)

const availableScanners = computed(() =>
  scannersStore.scanners.filter((scanner) => scanner.revokedAt === null),
)

onMounted(async () => {
  const [loaded] = await Promise.all([
    store.loadOne(route.params.documentId),
    scannersStore.load(),
  ])
  if (loaded) title.value = loaded.title
  if (availableScanners.value.length === 1) {
    selectedScannerId.value = availableScanners.value[0]?.id ?? ''
  }
  loadingDocument.value = false
})

onBeforeUnmount(() => void store.saveNow(route.params.documentId))

function updateTitle(event: Event) {
  title.value = (event.target as HTMLInputElement).value
  if (document.value) store.update(document.value.id, { title: title.value })
}

async function reloadLatest() {
  const latest = await store.reloadOne(route.params.documentId)
  if (latest) {
    title.value = latest.title
    editorKey.value += 1
  }
}

async function startScanSession() {
  if (!document.value || !selectedScannerId.value || startingSession.value) return
  startingSession.value = true
  sessionError.value = ''
  activeSession.value = null
  try {
    await store.saveNow(document.value.id)
    const request = createScanSession(document.value.id, selectedScannerId.value)
    await request.execute()
    if (request.error.value) throw request.error.value
    if (!request.data.value) throw new Error('The scan-session response was empty.')
    activeSession.value = request.data.value
  } catch (error) {
    sessionError.value = error instanceof Error ? error.message : 'Could not start the scan session.'
  } finally {
    startingSession.value = false
  }
}
</script>

<route lang="json">
{ "name": "document", "meta": { "breadcrumb": "Document" } }
</route>

<template>
  <section class="space-y-6">
    <p v-if="loadingDocument" role="status" class="py-12 text-center text-sm text-muted-foreground">
      Loading document…
    </p>
    <template v-else-if="document">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" as-child
          ><RouterLink to="/documents"
            ><ArrowLeftIcon aria-hidden="true" />All documents</RouterLink
          ></Button
        >
        <span
          v-if="store.saveState[document.id] === 'saved'"
          class="flex items-center gap-1.5 text-xs text-muted-foreground"
          role="status"
          ><CheckIcon class="size-3.5" aria-hidden="true" />Saved to server</span
        >
        <span
          v-else-if="store.saveState[document.id] === 'saving'"
          role="status"
          class="text-xs text-muted-foreground"
          >Saving…</span
        >
      </div>
      <div
        v-if="store.saveErrors[document.id]"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      >
        <p role="alert" class="flex-1 text-sm text-destructive">
          {{ store.saveErrors[document.id] }}
        </p>
        <Button
          v-if="store.saveState[document.id] === 'error'"
          variant="outline"
          size="sm"
          @click="store.retrySave(document.id)"
          >Retry saving</Button
        >
        <Button
          v-if="store.saveState[document.id] === 'conflict'"
          variant="outline"
          size="sm"
          @click="reloadLatest"
          >Discard local edits and reload</Button
        >
      </div>
      <section
        aria-labelledby="scan-session-heading"
        class="rounded-xl border bg-card p-4 shadow-xs sm:p-5"
      >
        <div class="flex items-start gap-3">
          <ScanLineIcon class="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <h2 id="scan-session-heading" class="font-semibold">Scan this document</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Assign this document to a scanner. The scanner can access its markers until the
              session is completed.
            </p>
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select v-model="selectedScannerId" :disabled="startingSession">
                <SelectTrigger class="w-full sm:w-72" aria-label="Scanner">
                  <SelectValue placeholder="Select a scanner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="scanner in availableScanners"
                    :key="scanner.id"
                    :value="scanner.id"
                  >
                    {{ scanner.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                :disabled="!selectedScannerId || startingSession || !!activeSession"
                @click="startScanSession"
              >
                {{ startingSession ? 'Starting session...' : 'Start scan session' }}
              </Button>
            </div>
            <p v-if="scannersStore.loadError" class="mt-3 text-sm text-destructive" role="alert">
              {{ scannersStore.loadError }}
            </p>
            <p v-else-if="sessionError" class="mt-3 text-sm text-destructive" role="alert">
              {{ sessionError }}
            </p>
            <p v-else-if="activeSession" class="mt-3 text-sm text-emerald-600" role="status">
              Session started. Open the scanner TUI and choose Start session.
            </p>
            <p
              v-else-if="!scannersStore.loading && !availableScanners.length"
              class="mt-3 text-sm text-muted-foreground"
            >
              Create an active scanner before starting a session.
            </p>
          </div>
        </div>
      </section>
      <h1>
        <input
          :value="title"
          aria-label="Document title"
          placeholder="Untitled document"
          maxlength="200"
          class="w-full rounded-md border border-transparent bg-transparent px-2 py-2 text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/30"
          @input="updateTitle"
          @blur="title = document.title"
        />
      </h1>
      <DocumentEditor
        :key="`${document.id}-${editorKey}`"
        :content="document.content"
        :title="document.title"
        @update="store.update(document.id, { content: $event })"
      />
    </template>
    <div v-else class="flex min-h-80 flex-col items-center justify-center text-center">
      <FileQuestionIcon class="mb-4 size-10 text-muted-foreground" aria-hidden="true" />
      <h1 class="text-xl font-semibold">
        {{ store.loadError ? 'Could not open document' : 'Document not found' }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ store.loadError || 'This document is not available on the server.' }}
      </p>
      <Button class="mt-6" variant="outline" as-child
        ><RouterLink to="/documents"
          ><ArrowLeftIcon aria-hidden="true" />Back to documents</RouterLink
        ></Button
      >
    </div>
  </section>
</template>
