import type { Batch, BatchStatus, Candidate, DistrictApproval, StageApproval } from '../types'

const API_BASE_URL = 'http://localhost:5000/api'
export const TRAINING_CENTRE_ID = '71cf5e04-0deb-4524-86e2-c3a1be28dac9'
export const TRAINING_CENTRE_USER_ID = 'c96b3dcd-89d9-4c16-ac9c-cdc82eaad4f9'

export class BatchApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'BatchApiError'
    this.status = status
  }
}

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  errors?: { row?: number; field?: string; message?: string }[]
}

interface ApiBatch {
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
  candidates?: {
    id: string
    fullName: string
    email: string | null
    phone: string
    candidateCode: string | null
  }[]
}

function toBatch(value: ApiBatch): Batch {
  const candidates: Candidate[] = (value.candidates ?? []).map((candidate) => ({
    id: candidate.id,
    name: candidate.fullName,
    email: candidate.email ?? '',
    phone: candidate.phone,
    candidateCode: candidate.candidateCode,
  }))
  return { ...value, candidates }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new BatchApiError('Can’t connect to CertiFlow. Check that the backend is running at localhost:5000.')
  }

  let body: ApiResponse<T>
  try {
    body = await response.json() as ApiResponse<T>
  } catch {
    throw new BatchApiError('The server returned an unreadable response.', response.status)
  }

  if (!response.ok || !body.success) {
    const issues = body.errors?.slice(0, 3).map((issue) =>
      `${issue.row ? `Row ${issue.row}, ` : ''}${issue.field ? `${issue.field}: ` : ''}${issue.message ?? 'Invalid value'}`,
    ).join('; ')
    throw new BatchApiError(`${body.message || 'The request could not be completed.'}${issues ? ` — ${issues}` : ''}`, response.status)
  }
  return body.data
}

export const batchApi = {
  async list(): Promise<Batch[]> {
    const query = new URLSearchParams({ trainingCentreId: TRAINING_CENTRE_ID })
    const values = await request<ApiBatch[]>(`/batches?${query.toString()}`)
    return values.map(toBatch)
  },

  async listDistrictReview(): Promise<Batch[]> {
    const values = await request<ApiBatch[]>('/batches?status=DISTRICT_REVIEW')
    return values.map(toBatch)
  },

  async listReview(status: 'QUALITY_REVIEW' | 'STATE_REVIEW'): Promise<Batch[]> {
    const values = await request<ApiBatch[]>(`/batches?status=${status}`)
    return values.map(toBatch)
  },

  async get(batchId: string): Promise<Batch> {
    return toBatch(await request<ApiBatch>(`/batches/${encodeURIComponent(batchId)}`))
  },

  create(batchNumber: string, courseName: string, requiresQualityReview = false) {
    return request<{ id: string; batchNumber: string; courseName: string; status: BatchStatus }>('/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchNumber,
        courseName,
        trainingCentreId: TRAINING_CENTRE_ID,
        createdById: TRAINING_CENTRE_USER_ID,
        requiresQualityReview,
      }),
    })
  },

  uploadCandidates(batchId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ batchId: string; uploadedCount: number; candidateCount: number }>(
      `/batches/${encodeURIComponent(batchId)}/candidates/upload`,
      { method: 'POST', body: formData },
    )
  },

  submit(batchId: string) {
    return request<{ batchId: string; status: BatchStatus; candidateCount: number }>(
      `/batches/${encodeURIComponent(batchId)}/submit`,
      { method: 'POST' },
    )
  },

  districtDecision(batchId: string, userId: string, decision: 'APPROVED' | 'REJECTED' | 'RETURNED', comments: string) {
    return request<{
      batchId: string
      decision: 'APPROVED' | 'REJECTED' | 'RETURNED'
      status: BatchStatus
      approvalRound: number
      districtApprovalCount: number
    }>(`/batches/${encodeURIComponent(batchId)}/approvals/district`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, decision, comments }),
    })
  },

  stageDecision(batchId: string, stage: 'quality' | 'state', userId: string, decision: 'APPROVED' | 'REJECTED' | 'RETURNED', comments: string) {
    return request<{ batchId: string; decision: 'APPROVED' | 'REJECTED' | 'RETURNED'; status: BatchStatus; approvalRound: number; certificateCount: number }>(
      `/batches/${encodeURIComponent(batchId)}/approvals/${stage}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, decision, comments }) },
    )
  },
}
