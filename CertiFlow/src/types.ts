export type BatchStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DISTRICT_REVIEW'
  | 'QUALITY_REVIEW'
  | 'STATE_REVIEW'
  | 'APPROVED'
  | 'ISSUED'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELLED'

export interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  candidateCode?: string | null
}

export interface Batch {
  id: string
  batchNumber: string
  courseName: string
  candidateCount: number
  status: BatchStatus
  createdAt: string
  updatedAt?: string
  submittedAt?: string | null
  approvalRound?: number
  districtApprovalCount?: number
  districtApprovals?: DistrictApproval[]
  stageApprovals?: StageApproval[]
  requiresQualityReview?: boolean
  candidates: Candidate[]
}

export interface DistrictApproval {
  userId: string
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED'
  comments: string | null
  createdAt: string
  user: { name: string }
}

export interface StageApproval extends DistrictApproval {
  stage: 'DISTRICT' | 'QUALITY' | 'STATE'
}

export type Section = 'Dashboard' | 'My Batches' | 'Certificates' | 'Notifications' | 'Settings'
