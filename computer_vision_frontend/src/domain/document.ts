import type { JSONContent } from '@tiptap/vue-3'

export type PortalDocument = {
  id: string
  title: string
  content: JSONContent
  version: number
  createdAt: string
  updatedAt: string
  updatedById: string
}

export function documentText(content: JSONContent): string {
  if (content.text) return content.text
  if (content.type === 'inlineMath' && typeof content.attrs?.latex === 'string') {
    return content.attrs.latex
  }
  return content.content?.map(documentText).join(' ') ?? ''
}
