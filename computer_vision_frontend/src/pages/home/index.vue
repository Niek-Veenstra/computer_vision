<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import { computed, onMounted } from 'vue'
import { ArrowRightIcon, ArrowUpRightIcon, FileTextIcon, ScanLineIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { documentText } from '@/domain/document'
import { useDocumentsStore } from '@/stores/documents'
import { useScannersStore } from '@/stores/scanners'

const documents = useDocumentsStore()
const scanners = useScannersStore()

onMounted(() => {
  void documents.load()
  void scanners.load()
})

const recentDocuments = computed(() =>
  [...documents.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4),
)
const activeScanners = computed(() =>
  scanners.scanners
    .filter((scanner) => !scanner.revokedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
)
const recentScanners = computed(() => activeScanners.value.slice(0, 4))

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function formatDate(date: string) {
  return dateFormatter.format(new Date(date))
}
</script>

<route lang="json">
{ "name": "home", "meta": { "breadcrumb": "Home" } }
</route>

<template>
  <div class="space-y-8">
    <header>
      <h1 class="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Pick up a document or manage a scanner from one place.
      </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2">
      <RouterLink
        to="/documents"
        class="group flex items-center justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-foreground/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div>
          <p class="text-sm text-muted-foreground">Documents</p>
          <p class="mt-2 text-3xl font-semibold tabular-nums">{{ documents.documents.length }}</p>
          <p class="mt-1 text-xs text-muted-foreground">View all documents</p>
        </div>
        <span class="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
          <FileTextIcon class="size-5" aria-hidden="true" />
        </span>
      </RouterLink>
      <RouterLink
        to="/scanners"
        class="group flex items-center justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-foreground/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div>
          <p class="text-sm text-muted-foreground">Active scanners</p>
          <p class="mt-2 text-3xl font-semibold tabular-nums">{{ activeScanners.length }}</p>
          <p class="mt-1 text-xs text-muted-foreground">Manage scanners</p>
        </div>
        <span class="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
          <ScanLineIcon class="size-5" aria-hidden="true" />
        </span>
      </RouterLink>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <section aria-labelledby="dashboard-documents" class="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 id="dashboard-documents" class="text-lg font-semibold">Recent documents</h2>
            <p class="mt-1 text-sm text-muted-foreground">Continue where you left off.</p>
          </div>
          <RouterLink to="/documents" class="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
            View all <ArrowRightIcon class="size-4" aria-hidden="true" />
          </RouterLink>
        </div>

        <div v-if="documents.loadError" class="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p role="alert">{{ documents.loadError }}</p>
          <Button variant="outline" size="sm" class="mt-3" @click="documents.load">Retry loading</Button>
        </div>
        <p v-if="documents.loading && !recentDocuments.length" role="status" class="py-10 text-center text-sm text-muted-foreground">
          Loading documents…
        </p>
        <ul v-else-if="recentDocuments.length" class="mt-5 space-y-2">
          <li v-for="document in recentDocuments" :key="document.id">
            <RouterLink
              :to="{ name: 'document', params: { documentId: document.id } }"
              class="group flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileTextIcon class="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium" :title="document.title">{{ document.title }}</span>
                <span class="block truncate text-xs text-muted-foreground">
                  {{ documentText(document.content) || 'Empty document' }}
                </span>
              </span>
              <time :datetime="document.updatedAt" class="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {{ formatDate(document.updatedAt) }}
              </time>
              <ArrowUpRightIcon class="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <div v-else-if="!documents.loadError" class="py-10 text-center">
          <FileTextIcon class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p class="mt-3 text-sm font-medium">No documents yet</p>
          <p class="mt-1 text-sm text-muted-foreground">Create one from the documents page.</p>
          <Button variant="outline" size="sm" as-child class="mt-4">
            <RouterLink to="/documents">Open documents</RouterLink>
          </Button>
        </div>
      </section>

      <section aria-labelledby="dashboard-scanners" class="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 id="dashboard-scanners" class="text-lg font-semibold">Available scanners</h2>
            <p class="mt-1 text-sm text-muted-foreground">Your active scanning devices.</p>
          </div>
          <RouterLink to="/scanners" class="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
            View all <ArrowRightIcon class="size-4" aria-hidden="true" />
          </RouterLink>
        </div>

        <div v-if="scanners.loadError" class="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p role="alert">{{ scanners.loadError }}</p>
          <Button variant="outline" size="sm" class="mt-3" @click="scanners.load">Retry loading</Button>
        </div>
        <p v-if="scanners.loading && !recentScanners.length" role="status" class="py-10 text-center text-sm text-muted-foreground">
          Loading scanners…
        </p>
        <ul v-else-if="recentScanners.length" class="mt-5 space-y-2">
          <li v-for="scanner in recentScanners" :key="scanner.id">
            <RouterLink
              :to="{ name: 'scanner', params: { scannerId: scanner.id } }"
              class="group flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <ScanLineIcon class="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium" :title="scanner.name">{{ scanner.name }}</span>
                <span v-if="scanner.lastSeenAt" class="block truncate text-xs text-muted-foreground">
                  Last seen <time :datetime="scanner.lastSeenAt">{{ formatDate(scanner.lastSeenAt) }}</time>
                </span>
                <span v-else class="block truncate text-xs text-muted-foreground">Never connected</span>
              </span>
              <span class="hidden shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary sm:inline-flex">Active</span>
              <ArrowUpRightIcon class="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <div v-else-if="!scanners.loadError" class="py-10 text-center">
          <ScanLineIcon class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p class="mt-3 text-sm font-medium">No active scanners yet</p>
          <p class="mt-1 text-sm text-muted-foreground">Add a scanner to connect a device.</p>
          <Button variant="outline" size="sm" as-child class="mt-4">
            <RouterLink to="/scanners">Open scanners</RouterLink>
          </Button>
        </div>
      </section>
    </div>
  </div>
</template>
