<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/vue-3'
import Mathematics from '@tiptap/extension-mathematics'
import { NodeSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import 'katex/dist/katex.min.css'
import {
  BoldIcon,
  ItalicIcon,
  Heading2Icon,
  ListIcon,
  ListOrderedIcon,
  Undo2Icon,
  Redo2Icon,
  ScanLineIcon,
  FileDownIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toPdf } from '@/utils/to-pdf'
import { RecognitionMarker } from './recognition-marker'

const props = defineProps<{ content: JSONContent; title: string }>()
const emit = defineEmits<{ update: [content: JSONContent] }>()
const selectedMarkerLabel = ref('')
const hasSelectedMarker = ref(false)
const markerLabelEditor = ref<HTMLElement | null>(null)

function syncSelectedMarker() {
  if (!editor.value?.isActive('recognitionMarker')) {
    hasSelectedMarker.value = false
    selectedMarkerLabel.value = ''
    return
  }

  const label = editor.value.getAttributes('recognitionMarker').label
  hasSelectedMarker.value = true
  selectedMarkerLabel.value = typeof label === 'string' ? label : ''
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({ link: { openOnClick: false } }),
    Mathematics.configure({ katexOptions: { throwOnError: false } }),
    RecognitionMarker,
  ],
  content: props.content,
  editorProps: {
    attributes: {
      class: 'document-editor min-h-96 px-6 py-8 outline-none sm:px-12',
      role: 'textbox',
      'aria-label': 'Document content',
      'aria-multiline': 'true',
    },
    handleClickOn(view, _position, node, nodePosition) {
      if (node.type.name !== 'recognitionMarker') return false
      const selection = NodeSelection.create(view.state.doc, nodePosition)
      view.dispatch(view.state.tr.setSelection(selection))
      return true
    },
  },
  onUpdate: ({ editor }) => emit('update', editor.getJSON()),
  onSelectionUpdate: syncSelectedMarker,
})

async function insertRecognitionMarker() {
  const currentEditor = editor.value
  if (!currentEditor) return

  const insertionPosition = currentEditor.state.selection.from
  currentEditor
    .chain()
    .insertContent({
      type: 'recognitionMarker',
      attrs: { id: crypto.randomUUID(), label: 'Reader target' },
    })
    .setNodeSelection(insertionPosition)
    .run()

  hasSelectedMarker.value = true
  selectedMarkerLabel.value = 'Reader target'
  await nextTick()
  const input = markerLabelEditor.value?.querySelector('input')
  input?.focus()
  input?.select()
}

function updateSelectedMarkerLabel(value: string | number) {
  selectedMarkerLabel.value = String(value).slice(0, 200)
}

function finishEditingMarkerLabel() {
  const label = selectedMarkerLabel.value.trim() || 'Reader target'
  selectedMarkerLabel.value = label
  editor.value?.chain().updateAttributes('recognitionMarker', { label }).run()
}

function finishEditingMarkerLabelOnEnter(event: KeyboardEvent) {
  finishEditingMarkerLabel()
  ;(event.target as HTMLInputElement).blur()
}

async function exportToPdf() {
  const content = editor.value?.view.dom
  if (content) await toPdf(props.title, content)
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-card shadow-xs">
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2"
      role="group"
      aria-label="Text formatting"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        title="Bold"
        aria-label="Bold"
        :aria-pressed="editor.isActive('bold')"
        :class="{ 'bg-accent': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
        ><BoldIcon
      /></Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Italic"
        aria-label="Italic"
        :aria-pressed="editor.isActive('italic')"
        :class="{ 'bg-accent': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
        ><ItalicIcon
      /></Button>
      <span class="mx-2 h-5 w-px bg-border" aria-hidden="true" />
      <Button
        variant="ghost"
        size="icon-sm"
        title="Heading"
        aria-label="Heading"
        :aria-pressed="editor.isActive('heading', { level: 2 })"
        :class="{ 'bg-accent': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        ><Heading2Icon
      /></Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Bullet list"
        aria-label="Bullet list"
        :aria-pressed="editor.isActive('bulletList')"
        :class="{ 'bg-accent': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
        ><ListIcon
      /></Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Numbered list"
        aria-label="Numbered list"
        :aria-pressed="editor.isActive('orderedList')"
        :class="{ 'bg-accent': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
        ><ListOrderedIcon
      /></Button>
      <span class="mx-2 h-5 w-px bg-border" aria-hidden="true" />
      <Button
        variant="ghost"
        size="sm"
        title="Insert reader target"
        aria-label="Insert reader target"
        @click="insertRecognitionMarker"
      >
        <ScanLineIcon />
        Reader target
      </Button>
      <Button variant="ghost" size="sm" title="Export PDF" @click="exportToPdf">
        <FileDownIcon />
        Export PDF
      </Button>
      <div class="ml-auto flex gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Undo"
          aria-label="Undo"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
          ><Undo2Icon
        /></Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Redo"
          aria-label="Redo"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
          ><Redo2Icon
        /></Button>
      </div>
      <div
        v-if="hasSelectedMarker"
        ref="markerLabelEditor"
        class="flex basis-full items-center gap-2 border-t px-1 pt-2"
      >
        <label for="selected-marker-label" class="text-xs font-medium text-muted-foreground">
          Target name
        </label>
        <Input
          id="selected-marker-label"
          :model-value="selectedMarkerLabel"
          maxlength="200"
          class="h-8 max-w-72"
          aria-label="Target name"
          @update:model-value="updateSelectedMarkerLabel"
          @keydown.enter.prevent="finishEditingMarkerLabelOnEnter"
        />
        <Button size="sm" @click="finishEditingMarkerLabel">Save name</Button>
      </div>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
:deep(.document-editor) {
  overflow-wrap: anywhere;
  line-height: 1.75;
}
:deep(.document-editor .recognition-marker) {
  display: inline;
  min-width: 1rem;
  cursor: pointer;
  border: 1px dashed color-mix(in oklab, var(--primary) 70%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in oklab, var(--primary) 10%, transparent);
  padding: 0.05rem 0.35rem;
  color: var(--primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.5;
  vertical-align: baseline;
  white-space: nowrap;
}
:deep(.document-editor .recognition-marker::before) {
  content: attr(data-marker-label) ': ';
  user-select: none;
  opacity: 0.75;
}
:deep(.document-editor .recognition-marker:empty::after) {
  content: 'empty';
  user-select: none;
  opacity: 0.55;
}
:deep(.document-editor .recognition-marker.ProseMirror-selectednode) {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
:deep(.document-editor .tiptap-mathematics-render) {
  padding: 0 0.15rem;
}
:deep(.document-editor > * + *) {
  margin-top: 1em;
}
:deep(.document-editor h1) {
  font-size: 2em;
  font-weight: 600;
}
:deep(.document-editor h2) {
  font-size: 1.5em;
  font-weight: 600;
}
:deep(.document-editor h3) {
  font-size: 1.25em;
  font-weight: 600;
}
:deep(.document-editor ul) {
  list-style: disc;
  padding-left: 1.5em;
}
:deep(.document-editor ol) {
  list-style: decimal;
  padding-left: 1.5em;
}
:deep(.document-editor blockquote) {
  border-left: 3px solid var(--border);
  padding-left: 1em;
  color: var(--muted-foreground);
}
:deep(.document-editor pre) {
  overflow-x: auto;
  border-radius: 0.5rem;
  background: var(--muted);
  padding: 1em;
}
:deep(.document-editor code) {
  border-radius: 0.25rem;
  background: var(--muted);
  padding: 0.1em 0.25em;
  font-size: 0.9em;
}
:deep(.document-editor a) {
  text-decoration: underline;
}
:deep(.document-editor hr) {
  margin: 1.5em 0;
  border-color: var(--border);
}
</style>
