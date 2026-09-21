<script setup lang="ts">
defineOptions({ name: 'ScannersPage' })

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  BanIcon,
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  RotateCwIcon,
  ScanLineIcon,
  SearchIcon,
  XIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useScannersStore } from '@/stores/scanners'

type Action = { id: string; kind: 'rotate' | 'revoke' }

const store = useScannersStore()
const search = ref('')
const showCreate = ref(false)
const newName = ref('')
const confirmation = ref<Action | null>(null)
const revealedKey = ref<{ scannerName: string; apiKey: string } | null>(null)
const copied = ref(false)
const copyError = ref('')

onMounted(() => void store.load())
onBeforeUnmount(() => {
  revealedKey.value = null
})

const filteredScanners = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return store.scanners
    .filter((scanner) => scanner.name.toLocaleLowerCase().includes(query))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(date: string) {
  return dateFormatter.format(new Date(date))
}

function showKey(scannerName: string, apiKey: string) {
  showCreate.value = false
  revealedKey.value = { scannerName, apiKey }
  copied.value = false
  copyError.value = ''
}

function dismissKey() {
  revealedKey.value = null
  copied.value = false
  copyError.value = ''
}

async function copyKey() {
  if (!revealedKey.value) return
  try {
    await navigator.clipboard.writeText(revealedKey.value.apiKey)
    copied.value = true
    copyError.value = ''
  } catch {
    copyError.value = 'Could not copy the key. Select and copy it manually.'
  }
}

async function addScanner() {
  if (revealedKey.value || !newName.value.trim()) return
  const result = await store.create(newName.value)
  if (!result) return
  showKey(result.scanner.name, result.apiKey)
  newName.value = ''
  showCreate.value = false
}

async function confirmAction() {
  const action = confirmation.value
  if (!action || revealedKey.value) return
  if (action.kind === 'rotate') {
    const result = await store.rotateKey(action.id)
    if (result) {
      showKey(result.scanner.name, result.apiKey)
      confirmation.value = null
    }
    return
  }
  if (await store.revoke(action.id)) confirmation.value = null
}
</script>

<route lang="json">
{ "name": "scanners" }
</route>

<template>
  <section class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Scanners</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Connect and manage the devices that scan for you.
        </p>
      </div>
      <Button
        class="self-start sm:self-auto"
        :disabled="!!revealedKey"
        @click="showCreate = !showCreate"
      >
        <PlusIcon aria-hidden="true" />Add scanner
      </Button>
    </div>

    <div v-if="showCreate" class="rounded-xl border bg-card p-5 shadow-xs">
      <h2 class="font-semibold">Add a scanner</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Give this device a name you will recognize.
      </p>
      <form class="mt-4 flex flex-col gap-3 sm:flex-row" @submit.prevent="addScanner">
        <Input
          v-model="newName"
          aria-label="Scanner name"
          placeholder="e.g. Home math scanner"
          maxlength="100"
          class="sm:max-w-sm"
        />
        <div class="flex gap-2">
          <Button type="submit" :disabled="store.creating || !newName.trim()">
            {{ store.creating ? 'Adding…' : 'Create scanner' }}
          </Button>
          <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
        </div>
      </form>
      <p v-if="store.createError" class="mt-3 text-sm text-destructive" role="alert">
        {{ store.createError }}
      </p>
    </div>

    <div v-if="revealedKey" class="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div class="flex items-start gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background">
          <KeyRoundIcon class="size-5" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold">API key for {{ revealedKey.scannerName }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Save this key on your scanner now. It will not be shown again.
          </p>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              :model-value="revealedKey.apiKey"
              aria-label="New scanner API key"
              readonly
              autocomplete="off"
              :spellcheck="false"
              class="font-mono sm:flex-1"
            />
            <Button variant="outline" @click="copyKey">
              <CopyIcon aria-hidden="true" />{{ copied ? 'Copied' : 'Copy key' }}
            </Button>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            Send it in the X-Scanner-Key header when the device calls the backend.
          </p>
          <p v-if="copyError" class="mt-2 text-sm text-destructive" role="alert">
            {{ copyError }}
          </p>
          <Button class="mt-4" variant="secondary" @click="dismissKey">I saved the key</Button>
        </div>
      </div>
    </div>

    <div
      v-if="store.loadError"
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <p role="alert">{{ store.loadError }}</p>
      <Button variant="outline" size="sm" class="mt-3" @click="store.load">
        Retry loading
      </Button>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-sm">
        <SearchIcon
          class="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          v-model="search"
          type="search"
          aria-label="Search scanners"
          placeholder="Search scanners…"
          class="h-10 bg-background pl-10"
        />
      </div>
      <p class="text-sm text-muted-foreground" role="status">
        {{ filteredScanners.length }}
        {{ filteredScanners.length === 1 ? 'scanner' : 'scanners' }}
      </p>
    </div>

    <p v-if="store.loading" role="status" class="py-12 text-center text-sm text-muted-foreground">
      Loading scanners…
    </p>
    <div v-else-if="filteredScanners.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="scanner in filteredScanners"
        :key="scanner.id"
        class="relative min-w-0 rounded-xl border bg-card p-5 text-card-foreground shadow-xs hover:border-primary/40"
      >
        <RouterLink
          v-if="!revealedKey"
          :to="{ name: 'scanner', params: { scannerId: scanner.id } }"
          class="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          :aria-label="`Open ${scanner.name}`"
        />
        <div class="flex items-start justify-between gap-3">
          <span class="flex size-10 items-center justify-center rounded-lg bg-muted">
            <ScanLineIcon class="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            :class="
              scanner.revokedAt
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary'
            "
          >
            {{ scanner.revokedAt ? 'Revoked' : 'Active' }}
          </span>
        </div>
        <h2 class="mt-5 truncate font-semibold" :title="scanner.name">{{ scanner.name }}</h2>
        <dl class="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <div class="flex justify-between gap-3">
            <dt>Added</dt>
            <dd><time :datetime="scanner.createdAt">{{ formatDate(scanner.createdAt) }}</time></dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Last connected</dt>
            <dd>
              <time v-if="scanner.lastSeenAt" :datetime="scanner.lastSeenAt">
                {{ formatDate(scanner.lastSeenAt) }}
              </time>
              <span v-else>Never connected</span>
            </dd>
          </div>
        </dl>

        <p v-if="store.actionErrors[scanner.id]" class="mt-4 text-sm text-destructive" role="alert">
          {{ store.actionErrors[scanner.id] }}
        </p>
        <div v-if="!scanner.revokedAt" class="relative z-10 mt-5 border-t pt-4">
          <div v-if="confirmation?.id === scanner.id" class="space-y-3">
            <p class="text-sm">
              {{
                confirmation?.kind === 'rotate'
                  ? 'The current key will stop working immediately. Rotate it?'
                  : 'This scanner will no longer be able to connect. Revoke it?'
              }}
            </p>
            <div class="flex flex-wrap gap-2">
              <Button
                size="sm"
                :variant="confirmation?.kind === 'revoke' ? 'destructive' : 'default'"
                :disabled="!!store.busyId"
                @click="confirmAction"
              >
                {{ store.busyId === scanner.id ? 'Working…' : 'Confirm' }}
              </Button>
              <Button size="sm" variant="outline" @click="confirmation = null">Cancel</Button>
            </div>
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="!!store.busyId || !!revealedKey"
              @click="confirmation = { id: scanner.id, kind: 'rotate' }"
            >
              <RotateCwIcon aria-hidden="true" />Rotate key
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :disabled="!!store.busyId || !!revealedKey"
              @click="confirmation = { id: scanner.id, kind: 'revoke' }"
            >
              <BanIcon aria-hidden="true" />Revoke
            </Button>
          </div>
        </div>
      </article>
    </div>

    <div
      v-else-if="!store.loadError"
      class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center"
    >
      <div class="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-background">
        <SearchIcon v-if="search.trim()" class="size-6 text-muted-foreground" aria-hidden="true" />
        <ScanLineIcon v-else class="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 class="text-lg font-semibold">
        {{ search.trim() ? 'No matching scanners' : 'Connect your first scanner' }}
      </h2>
      <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {{
          search.trim()
            ? 'Try another scanner name.'
            : 'Add a device to give it its own API key.'
        }}
      </p>
      <Button v-if="search.trim()" variant="outline" class="mt-6" @click="search = ''">
        <XIcon aria-hidden="true" />Clear search
      </Button>
      <Button v-else class="mt-6" :disabled="!!revealedKey" @click="showCreate = true">
        <PlusIcon aria-hidden="true" />Add scanner
      </Button>
    </div>
  </section>
</template>
