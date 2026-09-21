import type { JSONContent } from '@tiptap/vue-3'

export type PortalDocument = {
  id: string
  title: string
  content: JSONContent
  createdAt: string
  updatedAt: string
}

export function documentText(content: JSONContent): string {
  if (content.text) return content.text
  return content.content?.map(documentText).join(' ') ?? ''
}
