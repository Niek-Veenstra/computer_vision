<script setup lang="ts">
defineOptions({ name: 'ScannerPage' })

import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftIcon, ScanLineIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useScannersStore } from '@/stores/scanners'

const route = useRoute()
const store = useScannersStore()
const loading = ref(true)
const scanner = computed(() =>
  store.scanners.find((item) => item.id === String(route.params.scannerId)),
)
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

async function loadScanner() {
  loading.value = true
  await store.load()
  loading.value = false
}

onMounted(() => void loadScanner())

function formatDate(date: string) {
  return dateFormatter.format(new Date(date))
}
</script>

<route lang="json">
{ "name": "scanner", "meta": { "breadcrumb": "Scanner" } }
</route>

<template>
  <section class="space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink to="/scanners"><ArrowLeftIcon aria-hidden="true" />All scanners</RouterLink>
    </Button>

    <p v-if="loading" role="status" class="py-12 text-center text-sm text-muted-foreground">
      Loading scanner…
    </p>
    <template v-else-if="scanner">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-4">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
            <ScanLineIcon class="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight">{{ scanner.name }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">Scanner details</p>
          </div>
        </div>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-medium"
          :class="scanner.revokedAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'"
        >
          {{ scanner.revokedAt ? 'Revoked' : 'Active' }}
        </span>
      </div>

      <div class="rounded-xl border bg-card p-5 shadow-xs">
        <h2 class="font-semibold">Connection</h2>
        <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground">Added</dt>
            <dd class="mt-1"><time :datetime="scanner.createdAt">{{ formatDate(scanner.createdAt) }}</time></dd>
          </div>
          <div>
            <dt class="text-muted-foreground">Last connected</dt>
            <dd class="mt-1">
              <time v-if="scanner.lastSeenAt" :datetime="scanner.lastSeenAt">
                {{ formatDate(scanner.lastSeenAt) }}
              </time>
              <span v-else>Never connected</span>
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">Scanner ID</dt>
            <dd class="mt-1 break-all font-mono">{{ scanner.id }}</dd>
          </div>
          <div v-if="scanner.revokedAt">
            <dt class="text-muted-foreground">Revoked</dt>
            <dd class="mt-1"><time :datetime="scanner.revokedAt">{{ formatDate(scanner.revokedAt) }}</time></dd>
          </div>
        </dl>
      </div>

      <p class="text-sm text-muted-foreground">
        Manage this scanner's API key from the scanners overview. Keys are only shown when they are created or rotated.
      </p>
    </template>
    <div v-else class="flex min-h-80 flex-col items-center justify-center text-center">
      <ScanLineIcon class="mb-4 size-10 text-muted-foreground" aria-hidden="true" />
      <h1 class="text-xl font-semibold">
        {{ store.loadError ? 'Could not load scanner' : 'Scanner not found' }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ store.loadError || 'This scanner is not available.' }}
      </p>
      <Button class="mt-6" variant="outline" @click="loadScanner">Retry loading</Button>
    </div>
  </section>
</template>
