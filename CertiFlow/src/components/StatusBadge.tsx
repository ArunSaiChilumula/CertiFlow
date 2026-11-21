import type { BatchStatus } from '../types'

const labels: Record<BatchStatus, string> = {
  DRAFT: 'Draft',
  DISTRICT_REVIEW: 'District review',
  QUALITY_REVIEW: 'Quality review',
  STATE_REVIEW: 'State review',
  APPROVED: 'Approved',
  ISSUED: 'Issued',
  RETURNED: 'Returned',
  REJECTED: 'Rejected',
}

export function StatusBadge({ status }: { status: BatchStatus }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll('_', '-')}`}><span className="status-dot" />{labels[status]}</span>
}
