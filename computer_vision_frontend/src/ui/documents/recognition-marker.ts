import { mergeAttributes, Node } from '@tiptap/core'

export const RecognitionMarker = Node.create({
  name: 'recognitionMarker',
  group: 'inline',
  inline: true,
  content: '(text | inlineMath)*',
  isolating: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: 'Reader target' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-recognition-marker]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = typeof node.attrs.id === 'string' ? node.attrs.id : ''
    const label =
      typeof node.attrs.label === 'string' && node.attrs.label
        ? node.attrs.label
        : 'Reader target'

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-recognition-marker': id,
        'data-marker-label': `${label} - ${id.slice(0, 8)}`,
        class: 'recognition-marker',
        title: `${label}: ${id}`,
      }),
      0,
    ]
  },
})
