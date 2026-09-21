<script setup lang="ts">
defineOptions({ name: 'DocumentsPage' })
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRightIcon, FileTextIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentsStore } from '@/stores/documents'
import { documentText } from '@/domain/document'

const store = useDocumentsStore()
const router = useRouter()
const search = ref('')
store.load()

const filteredDocuments = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return store.documents
    .filter((document) =>
      `${document.title} ${documentText(document.content)}`.toLocaleLowerCase().includes(query),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})

function createDocument() {
  const document = store.create()
  if (document) router.push({ name: 'document', params: { documentId: document.id } })
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
</script>

<route lang="json">
{ "name": "documents" }
</route>

<template>
  <section class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Documents</h1>
        <p class="mt-2 text-sm text-muted-foreground">A place for your ideas, notes and reports.</p>
      </div>
      <Button @click="createDocument" class="self-start sm:self-auto">
        <PlusIcon aria-hidden="true" />
        New document
      </Button>
    </div>

    <p
      v-if="store.storageError"
      role="alert"
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ store.storageError }}
    </p>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-sm">
        <SearchIcon
          class="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          v-model="search"
          type="search"
          aria-label="Search documents"
          placeholder="Search documents…"
          class="h-10 bg-background pl-10"
        />
      </div>
      <p class="text-sm text-muted-foreground" role="status">
        {{ filteredDocuments.length }}
        {{ filteredDocuments.length === 1 ? 'document' : 'documents' }}
      </p>
    </div>

    <div v-if="filteredDocuments.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="document in filteredDocuments"
        :key="document.id"
        :to="{ name: 'document', params: { documentId: document.id } }"
        class="group flex min-w-0 flex-col rounded-xl border bg-card p-5 text-card-foreground shadow-xs transition-all hover:border-foreground/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div class="mb-5 flex items-center justify-between">
          <span class="flex size-10 items-center justify-center rounded-lg bg-muted"
            ><FileTextIcon class="size-5 text-muted-foreground" aria-hidden="true"
          /></span>
          <ArrowUpRightIcon
            class="size-4 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
        <h2 class="truncate font-semibold" :title="document.title">{{ document.title }}</h2>
        <p class="mt-2 line-clamp-2 min-h-10 break-words text-sm leading-5 text-muted-foreground">
          {{ documentText(document.content) || 'An empty page, ready for your next idea.' }}
        </p>
        <div class="mt-6 border-t pt-4 text-xs text-muted-foreground">
          Edited
          <time :datetime="document.updatedAt">{{
            dateFormatter.format(new Date(document.updatedAt))
          }}</time>
        </div>
      </RouterLink>
    </div>

    <div
      v-else
      class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center"
    >
      <div
        class="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-background shadow-xs"
      >
        <SearchIcon v-if="search.trim()" class="size-6 text-muted-foreground" aria-hidden="true" />
        <FileTextIcon v-else class="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 class="text-lg font-semibold">
        {{ search.trim() ? 'No matching documents' : 'Your first document starts here' }}
      </h2>
      <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {{
          search.trim()
            ? 'Try another title or a word from the document.'
            : 'Create a document to start writing. Your documents will appear here.'
        }}
      </p>
      <Button v-if="search.trim()" variant="outline" class="mt-6" @click="search = ''"
        ><XIcon aria-hidden="true" />Clear search</Button
      >
      <Button v-else class="mt-6" @click="createDocument"
        ><PlusIcon aria-hidden="true" />Create a document</Button
      >
    </div>
    <p class="text-xs text-muted-foreground">Documents are saved in this browser.</p>
  </section>
</template>
