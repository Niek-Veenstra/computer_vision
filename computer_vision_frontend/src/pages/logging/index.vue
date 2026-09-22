<script setup lang="ts">
defineOptions({ name: 'LoggingPage' })

import { onMounted, ref } from 'vue'
import { ActivityIcon, ListFilterIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useScannersStore } from '@/stores/scanners'

const scanners = useScannersStore()
const scannerId = ref('all')

onMounted(() => void scanners.load())
</script>

<route lang="json">
{ "name": "logging", "meta": { "breadcrumb": "Logging" } }
</route>

<template>
  <section class="space-y-8">
    <header>
      <h1 class="text-3xl font-semibold tracking-tight">Scanner activity</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Review activity from your scanners in one place.
      </p>
    </header>

    <section aria-labelledby="activity-filters" class="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <div class="flex items-center gap-2">
        <ListFilterIcon class="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="activity-filters" class="font-semibold">Filters</h2>
      </div>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="scanner-filter" class="block text-sm font-medium">Scanner</label>
          <Select
            v-model="scannerId"
            :disabled="scanners.loading || !!scanners.loadError || !scanners.scanners.length"
          >
            <SelectTrigger id="scanner-filter" class="w-full">
              <SelectValue placeholder="All scanners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scanners</SelectItem>
              <SelectItem v-for="scanner in scanners.scanners" :key="scanner.id" :value="scanner.id">
                {{ scanner.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <label for="activity-type-filter" class="block text-sm font-medium">Activity type</label>
          <Select default-value="all" disabled>
            <SelectTrigger id="activity-type-filter" class="w-full">
              <SelectValue placeholder="All activity types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activity types</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">Activity types are not available yet.</p>
        </div>
      </div>
      <div
        v-if="scanners.loadError"
        class="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        <p role="alert">{{ scanners.loadError }}</p>
        <Button variant="outline" size="sm" class="mt-3" @click="scanners.load">
          Retry loading scanners
        </Button>
      </div>
    </section>

    <section
      aria-labelledby="activity-empty"
      class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center"
    >
      <span class="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-background shadow-xs">
        <ActivityIcon class="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 id="activity-empty" class="text-lg font-semibold">No activity to show yet</h2>
      <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Scanner activity will appear here when logging is available.
      </p>
    </section>
  </section>
</template>
