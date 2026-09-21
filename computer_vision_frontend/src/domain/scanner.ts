export type Scanner = {
  id: string
  name: string
  createdAt: string
  lastSeenAt: string | null
  revokedAt: string | null
}

export type ScannerKeyResult = {
  scanner: Scanner
  apiKey: string
}
