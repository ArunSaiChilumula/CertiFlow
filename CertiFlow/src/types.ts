export type BatchStatus =
  | 'DRAFT'
  | 'DISTRICT_REVIEW'
  | 'QUALITY_REVIEW'
  | 'STATE_REVIEW'
  | 'APPROVED'
  | 'ISSUED'
  | 'RETURNED'
  | 'REJECTED'

export interface Candidate {
  id: string
  name: string
  email: string
  phone: string
}

export interface Batch {
  id: string
  batchNumber: string
  courseName: string
  candidateCount: number
  status: BatchStatus
  createdAt: string
  candidates: Candidate[]
}

export type Section = 'Dashboard' | 'My Batches' | 'Certificates' | 'Notifications' | 'Settings'
