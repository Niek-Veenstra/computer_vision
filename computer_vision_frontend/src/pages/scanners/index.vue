<script setup lang="ts">
defineOptions({ name: 'ScannersPage' })

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useFormField } from '@/composables/use-form-field'
import { useFormFieldValues } from '@/composables/use-form-field-values'
import { useScannersStore } from '@/stores/scanners'
import { setFieldErrors } from '@/ui/form/setFieldErrors'
import { createScannerScheme } from '@/validation/scanner-validation'
import { validateScheme } from '@/validation/validate-scheme'

type Action = { id: string; kind: 'rotate' | 'revoke' }

const store = useScannersStore()
const search = ref('')
const showCreate = ref(false)
const fields = { name: useFormField('') }
const formValues = useFormFieldValues(fields)
const confirmation = ref<Action | null>(null)
const revealedKey = ref<{ scannerName: string; apiKey: string } | null>(null)
const copied = ref(false)
const copyError = ref('')
const confirmationOpen = computed({
  get: () => confirmation.value !== null,
  set: (open: boolean) => {
    if (!open && !store.busyId) confirmation.value = null
  },
})
const keyDialogOpen = computed({
  get: () => revealedKey.value !== null,
  set: (open: boolean) => {
    if (!open) dismissKey()
  },
})

onMounted(() => void store.load())
onBeforeUnmount(() => {
  dismissKey()
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

function preventDismiss(event: Event) {
  event.preventDefault()
}

function keepConfirmationOpenWhileBusy(event: Event) {
  if (store.busyId) event.preventDefault()
}

function openConfirmation(action: Action) {
  store.actionErrors[action.id] = ''
  confirmation.value = action
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
  if (revealedKey.value || store.creating) return
  const validation = validateScheme(formValues.value, createScannerScheme)
  if (!validation.success) {
    const errors = Object.fromEntries(
      Object.entries(validation.error.properties ?? {}).map(([key, value]) => [
        key,
        value.errors.join(', '),
      ]),
    )
    setFieldErrors(fields, errors)
    return
  }
  const result = await store.create(validation.data.name)
  if (!result) return
  showKey(result.scanner.name, result.apiKey)
  fields.name.formValue.value = ''
  showCreate.value = false
}

async function confirmAction() {
  const action = confirmation.value
  if (!action || revealedKey.value) return
  if (action.kind === 'rotate') {
    const result = await store.rotateKey(action.id)
    if (result) {
      confirmation.value = null
      await nextTick()
      showKey(result.scanner.name, result.apiKey)
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
      <form class="mt-4 flex flex-col gap-3 sm:flex-row" novalidate @submit.prevent="addScanner">
        <div class="w-full sm:max-w-sm">
          <Input
            v-model="fields.name.formValue.value"
            aria-label="Scanner name"
            placeholder="e.g. Home math scanner"
            maxlength="100"
            :aria-invalid="fields.name.invalid.value"
          />
          <p v-if="fields.name.error.value" class="mt-2 text-sm text-destructive" role="alert">
            {{ fields.name.error.value }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button type="submit" :disabled="store.creating">
            {{ store.creating ? 'Adding…' : 'Create scanner' }}
          </Button>
          <Button type="button" variant="outline" @click="showCreate = false">Cancel</Button>
        </div>
      </form>
      <p v-if="store.createError" class="mt-3 text-sm text-destructive" role="alert">
        {{ store.createError }}
      </p>
    </div>

    <Dialog v-model:open="keyDialogOpen">
      <DialogContent
        :show-close-button="false"
        @escape-key-down="preventDismiss"
        @interact-outside="preventDismiss"
      >
        <template v-if="revealedKey">
          <DialogHeader>
            <span class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon class="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>API key for {{ revealedKey.scannerName }}</DialogTitle>
            <DialogDescription>
              Save this key on your scanner now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
            <Input
              :model-value="revealedKey.apiKey"
              aria-label="New scanner API key"
              readonly
              autocomplete="off"
              :spellcheck="false"
              class="min-w-0 flex-1 font-mono"
            />
            <Button variant="outline" @click="copyKey">
              <CopyIcon aria-hidden="true" />{{ copied ? 'Copied' : 'Copy key' }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            Send it in the X-Scanner-Key header when the device calls the backend.
          </p>
          <p v-if="copyError" class="text-sm text-destructive" role="alert">
            {{ copyError }}
          </p>
          <DialogFooter>
            <Button @click="dismissKey">I saved the key</Button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="confirmationOpen">
      <DialogContent
        :show-close-button="!store.busyId"
        @escape-key-down="keepConfirmationOpenWhileBusy"
        @interact-outside="keepConfirmationOpenWhileBusy"
      >
        <template v-if="confirmation">
          <DialogHeader>
            <DialogTitle>
              {{ confirmation.kind === 'rotate' ? 'Rotate scanner key?' : 'Revoke scanner?' }}
            </DialogTitle>
            <DialogDescription v-if="confirmation.kind === 'rotate'">
              The current key will stop working immediately. Save the new key when it appears.
            </DialogDescription>
            <DialogDescription v-else>
              This scanner will no longer be able to connect.
            </DialogDescription>
          </DialogHeader>
          <p v-if="store.actionErrors[confirmation.id]" class="text-sm text-destructive" role="alert">
            {{ store.actionErrors[confirmation.id] }}
          </p>
          <DialogFooter>
            <Button variant="outline" :disabled="!!store.busyId" @click="confirmation = null">
              Cancel
            </Button>
            <Button
              :variant="confirmation.kind === 'revoke' ? 'destructive' : 'default'"
              :disabled="!!store.busyId"
              @click="confirmAction"
            >
              {{ store.busyId === confirmation.id ? 'Working…' : 'Confirm' }}
            </Button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>

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

        <div v-if="!scanner.revokedAt" class="relative z-10 mt-5 border-t pt-4">
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="!!store.busyId || !!revealedKey"
              @click="openConfirmation({ id: scanner.id, kind: 'rotate' })"
            >
              <RotateCwIcon aria-hidden="true" />Rotate key
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :disabled="!!store.busyId || !!revealedKey"
              @click="openConfirmation({ id: scanner.id, kind: 'revoke' })"
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
