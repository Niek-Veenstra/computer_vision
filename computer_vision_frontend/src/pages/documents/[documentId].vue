<script setup lang="ts">
defineOptions({ name: 'DocumentPage' })
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeftIcon,
  CheckIcon,
  FileQuestionIcon,
  ScanLineIcon,
  SquareIcon,
  Trash2Icon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ScanSession } from '@/domain/scan-session'
import {
  createScanSession,
  deleteScanSession,
  listScanSessions,
  stopScanSession,
} from '@/fetch/scan-sessions'
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
const activeTab = ref('edit')
const selectedScannerId = ref('')
const startingSession = ref(false)
const loadingSessions = ref(true)
const stoppingSessionId = ref<string | null>(null)
const confirmingDeleteSessionId = ref<string | null>(null)
const deletingSessionId = ref<string | null>(null)
const sessionError = ref('')
const scanSessions = ref<ScanSession[]>([])

const availableScanners = computed(() =>
  scannersStore.scanners.filter((scanner) => scanner.revokedAt === null),
)
const activeSession = computed(
  () => scanSessions.value.find((session) => session.status === 'active') ?? null,
)

watch(activeTab, (tab, previousTab) => {
  if (previousTab === 'edit' && tab === 'sessions' && document.value) {
    void store.saveNow(document.value.id)
  }
})

onMounted(async () => {
  const [loaded] = await Promise.all([
    store.loadOne(route.params.documentId),
    scannersStore.load(),
    loadScanSessions(),
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

function sessionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function scannerName(scannerId: string) {
  return (
    scannersStore.scanners.find((scanner) => scanner.id === scannerId)?.name ??
    'Unknown scanner'
  )
}

function sessionStatusLabel(status: ScanSession['status']) {
  if (status === 'active') return 'Active'
  return 'Stopped'
}

async function loadScanSessions() {
  loadingSessions.value = true
  sessionError.value = ''
  try {
    const request = listScanSessions(route.params.documentId)
    await request.execute()
    if (request.error.value) throw request.error.value
    if (!request.data.value) throw new Error('The scan-session response was empty.')
    scanSessions.value = request.data.value
  } catch (error) {
    sessionError.value = sessionErrorMessage(error, 'Could not load the scan session.')
  } finally {
    loadingSessions.value = false
  }
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
  try {
    await store.saveNow(document.value.id)
    const request = createScanSession(document.value.id, selectedScannerId.value)
    await request.execute()
    if (request.error.value) throw request.error.value
    if (!request.data.value) throw new Error('The scan-session response was empty.')
    scanSessions.value.unshift(request.data.value)
  } catch (error) {
    sessionError.value = sessionErrorMessage(error, 'Could not start the scan session.')
  } finally {
    startingSession.value = false
  }
}

async function stopActiveScanSession() {
  if (!document.value || !activeSession.value || stoppingSessionId.value) return
  const sessionId = activeSession.value.id
  stoppingSessionId.value = sessionId
  sessionError.value = ''
  try {
    const request = stopScanSession(document.value.id, sessionId)
    await request.execute()
    if (request.error.value) throw request.error.value
    if (!request.data.value) throw new Error('The scan-session response was empty.')
    const index = scanSessions.value.findIndex((session) => session.id === sessionId)
    if (index !== -1) scanSessions.value[index] = request.data.value
  } catch (error) {
    sessionError.value = sessionErrorMessage(error, 'Could not stop the scan session.')
  } finally {
    stoppingSessionId.value = null
  }
}

async function deleteCompletedScanSession(session: ScanSession) {
  if (
    !document.value ||
    session.status === 'active' ||
    confirmingDeleteSessionId.value !== session.id ||
    deletingSessionId.value
  ) {
    return
  }

  deletingSessionId.value = session.id
  sessionError.value = ''
  try {
    const request = deleteScanSession(document.value.id, session.id)
    await request.execute()
    if (request.error.value) throw request.error.value
    scanSessions.value = scanSessions.value.filter((item) => item.id !== session.id)
    confirmingDeleteSessionId.value = null
  } catch (error) {
    sessionError.value = sessionErrorMessage(error, 'Could not delete the scan session.')
  } finally {
    deletingSessionId.value = null
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
      <Tabs v-model="activeTab" :unmount-on-hide="false" class="gap-4">
        <TabsList class="grid w-full grid-cols-2 border sm:w-96" aria-label="Document sections">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="sessions">
            Scan sessions
            <span class="rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
              {{ scanSessions.length }}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" class="space-y-6">
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
        </TabsContent>

        <TabsContent value="sessions" class="space-y-6">
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
                <Select
                  v-model="selectedScannerId"
                  :disabled="startingSession || !!stoppingSessionId || !!activeSession"
                >
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
                  :disabled="
                    !selectedScannerId ||
                    startingSession ||
                    loadingSessions ||
                    !!stoppingSessionId ||
                    !!activeSession
                  "
                  @click="startScanSession"
                >
                  {{ startingSession ? 'Starting session...' : 'Start scan session' }}
                </Button>
              </div>
              <p v-if="loadingSessions" class="mt-3 text-sm text-muted-foreground" role="status">
                Checking the current scan session...
              </p>
              <div
                v-else-if="activeSession"
                class="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Scan session active
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ scannerName(activeSession.scannerId) }} · Started
                    {{ formatDateTime(activeSession.createdAt) }}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="!!stoppingSessionId"
                  @click="stopActiveScanSession"
                >
                  <SquareIcon aria-hidden="true" />
                  {{ stoppingSessionId ? 'Stopping...' : 'Stop session' }}
                </Button>
              </div>
              <p v-else class="mt-3 text-sm text-muted-foreground" role="status">
                No active scan session for this document.
              </p>
              <p v-if="scannersStore.loadError" class="mt-3 text-sm text-destructive" role="alert">
                {{ scannersStore.loadError }}
              </p>
              <p v-if="sessionError" class="mt-3 text-sm text-destructive" role="alert">
                {{ sessionError }}
              </p>
              <p
                v-if="
                  !scannersStore.loading &&
                  !availableScanners.length &&
                  !activeSession &&
                  !loadingSessions
                "
                class="mt-3 text-sm text-muted-foreground"
              >
                Create an active scanner before starting a session.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="session-history-heading"
          class="overflow-hidden rounded-xl border bg-card shadow-xs"
        >
          <div class="flex items-center justify-between border-b px-4 py-3 sm:px-5">
            <div>
              <h2 id="session-history-heading" class="font-semibold">Session history</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Scan sessions started for this document. Deleting a session keeps results
                already written to the document.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              :disabled="loadingSessions"
              @click="loadScanSessions"
            >
              Refresh
            </Button>
          </div>
          <p v-if="loadingSessions" class="p-5 text-sm text-muted-foreground" role="status">
            Loading scan sessions...
          </p>
          <p v-else-if="!scanSessions.length" class="p-5 text-sm text-muted-foreground">
            No scan sessions have been started for this document.
          </p>
          <ul v-else class="divide-y">
            <li
              v-for="session in scanSessions"
              :key="session.id"
              class="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ scannerName(session.scannerId) }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Started {{ formatDateTime(session.createdAt) }}
                  <span v-if="session.completedAt">
                    · Ended {{ formatDateTime(session.completedAt) }}
                  </span>
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="w-fit rounded-full border px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400':
                      session.status === 'active',
                    'border-border bg-muted text-muted-foreground': session.status !== 'active',
                  }"
                >
                  {{ sessionStatusLabel(session.status) }}
                </span>
                <template v-if="session.status !== 'active'">
                  <div
                    v-if="confirmingDeleteSessionId === session.id"
                    class="flex items-center gap-2"
                  >
                    <span class="text-xs text-muted-foreground">Delete this session?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      :disabled="!!deletingSessionId"
                      @click="deleteCompletedScanSession(session)"
                    >
                      {{ deletingSessionId === session.id ? 'Deleting...' : 'Delete' }}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      :disabled="!!deletingSessionId"
                      @click="confirmingDeleteSessionId = null"
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button
                    v-else
                    variant="ghost"
                    size="icon-sm"
                    :disabled="!!deletingSessionId"
                    :aria-label="`Delete scan session from ${formatDateTime(session.createdAt)}`"
                    title="Delete scan session"
                    @click="confirmingDeleteSessionId = session.id"
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </template>
              </div>
            </li>
          </ul>
        </section>
        </TabsContent>
      </Tabs>
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
