export type ScanSessionStatus = 'active' | 'completed' | 'cancelled'

export type ScanSession = {
  id: string
  documentId: string
  scannerId: string
  status: ScanSessionStatus
  createdAt: string
  completedAt: string | null
}
