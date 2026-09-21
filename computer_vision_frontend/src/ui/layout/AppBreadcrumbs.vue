<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronRightIcon } from 'lucide-vue-next'
import SidebarTrigger from '@/components/ui/sidebar/SidebarTrigger.vue'
import { useDocumentsStore } from '@/stores/documents'
import { useScannersStore } from '@/stores/scanners'

const route = useRoute()
const documents = useDocumentsStore()
const scanners = useScannersStore()

const documentTitle = computed(() => {
  if (route.name !== 'document') return ''
  const documentId = route.params.documentId
  return (
    documents.documents.find((document) => document.id === documentId)?.title ??
    'Document'
  )
})

const scannerName = computed(() => {
  if (route.name !== 'scanner') return ''
  const scannerId = route.params.scannerId
  return scanners.scanners.find((scanner) => scanner.id === scannerId)?.name ?? 'Scanner'
})

function breadcrumbLabel(name: unknown, breadcrumb: unknown) {
  if (name === 'document') return documentTitle.value
  if (name === 'scanner') return scannerName.value
  return String(breadcrumb)
}

const breadcrumbs = computed(() =>
  route.matched
    .filter((record) => typeof record.meta.breadcrumb === 'string')
    .map((record) => ({
      path: record.path,
      label: breadcrumbLabel(record.name, record.meta.breadcrumb),
    })),
)
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:px-8"
  >
    <template v-if="route.name !== 'login' && route.name !== 'register'">
      <SidebarTrigger />
      <span class="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    </template>
    <nav aria-label="Breadcrumb" class="min-w-0">
      <ol class="flex min-w-0 items-center gap-2 text-sm">
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="crumb.path"
          class="flex min-w-0 items-center gap-2"
        >
          <ChevronRightIcon
            v-if="index > 0"
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <RouterLink
            v-if="index < breadcrumbs.length - 1"
            :to="crumb.path"
            class="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {{ crumb.label }}
          </RouterLink>
          <span v-else aria-current="page" class="truncate font-medium" :title="crumb.label">{{
            crumb.label
          }}</span>
        </li>
      </ol>
    </nav>
  </header>
</template>
