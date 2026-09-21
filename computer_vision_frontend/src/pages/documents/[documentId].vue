<script setup lang="ts">
defineOptions({ name: 'DocumentPage' })
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeftIcon, CheckIcon, FileQuestionIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useDocumentsStore } from '@/stores/documents'
import DocumentEditor from '@/ui/documents/DocumentEditor.vue'

const route = useRoute('document')
const store = useDocumentsStore()
store.load()
const document = computed(() => store.documents.find((item) => item.id === route.params.documentId))
const title = ref(document.value?.title ?? '')

function updateTitle(event: Event) {
  title.value = (event.target as HTMLInputElement).value
  if (document.value) store.update(document.value.id, { title: title.value })
}
</script>

<route lang="json">
{ "name": "document", "meta": { "breadcrumb": "Document" } }
</route>

<template>
  <section class="space-y-6">
    <template v-if="document">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" as-child
          ><RouterLink to="/documents"
            ><ArrowLeftIcon aria-hidden="true" />All documents</RouterLink
          ></Button
        >
        <span
          v-if="!store.storageError"
          class="flex items-center gap-1.5 text-xs text-muted-foreground"
          role="status"
          ><CheckIcon class="size-3.5" aria-hidden="true" />Saved in this browser</span
        >
      </div>
      <div
        v-if="store.storageError"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      >
        <p role="alert" class="flex-1 text-sm text-destructive">{{ store.storageError }}</p>
        <Button variant="outline" size="sm" @click="store.persist">Retry saving</Button>
      </div>
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
        :key="document.id"
        :content="document.content"
        @update="store.update(document.id, { content: $event })"
      />
    </template>
    <div v-else class="flex min-h-80 flex-col items-center justify-center text-center">
      <FileQuestionIcon class="mb-4 size-10 text-muted-foreground" aria-hidden="true" />
      <h1 class="text-xl font-semibold">Document not found</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        This document is not available in this browser.
      </p>
      <Button class="mt-6" variant="outline" as-child
        ><RouterLink to="/documents"
          ><ArrowLeftIcon aria-hidden="true" />Back to documents</RouterLink
        ></Button
      >
    </div>
  </section>
</template>
