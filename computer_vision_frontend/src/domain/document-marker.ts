export type DocumentMarkerContent = {
  type: 'text' | 'inlineMath'
  value: string
}

export type DocumentMarker = {
  id: string
  label: string | null
  content: DocumentMarkerContent[]
}

export type DocumentMarkers = {
  documentId: string
  version: number
  markers: DocumentMarker[]
}

export type DocumentMarkerUpdateRequest = {
  operationId: string
  version: number
  content: DocumentMarkerContent[]
}

export type DocumentMarkerUpdateResult = {
  operationId: string
  documentId: string
  markerId: string
  version: number
  applied: boolean
}
