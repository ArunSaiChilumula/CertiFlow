import { useState } from 'react'
import type { Batch, DistrictApproval } from '../types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

export type DistrictDecision = 'APPROVED' | 'REJECTED' | 'RETURNED'

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

export function DistrictQueue({ batches, onReview }: { batches: Batch[]; onReview: (batch: Batch) => void }) {
  return (
    <section className="panel batch-panel">
      <div className="panel-heading"><div><h2>District review queue</h2><p>Batches awaiting a district officer decision</p></div><span className="queue-count">{batches.length} pending</span></div>
      <div className="table-wrap"><table className="batch-table district-queue-table">
        <thead><tr><th>Batch</th><th>Course name</th><th>Candidates</th><th>Submitted</th><th>District approvals</th><th><span className="sr-only">Review</span></th></tr></thead>
        <tbody>{batches.length ? batches.map((batch) => <tr key={batch.id} className="batch-row" onClick={() => onReview(batch)}>
          <td><button className="batch-number" onClick={() => onReview(batch)}>{batch.batchNumber}</button></td>
          <td><span className="course-cell">{batch.courseName}</span></td>
          <td><span className="candidate-count"><Icon name="users" size={15} />{batch.candidateCount}</span></td>
          <td className="date-cell">{dateLabel(batch.submittedAt ?? batch.createdAt)}</td>
          <td><span className="approval-progress"><span className="approval-progress-dots"><i className={(batch.districtApprovalCount ?? 0) >= 1 ? 'filled' : ''} /><i className={(batch.districtApprovalCount ?? 0) >= 2 ? 'filled' : ''} /></span><strong>{batch.districtApprovalCount ?? 0}/2</strong></span></td>
          <td><button className="review-button" onClick={() => onReview(batch)}>Review <Icon name="arrowRight" size={14} /></button></td>
        </tr>) : <tr><td colSpan={6} className="table-empty">No batches are waiting for district review.</td></tr>}</tbody>
      </table></div>
      {!!batches.length && <div className="table-footer"><span><strong>{batches.length}</strong> batches need a district decision</span><span>Approval threshold: 2 distinct officers</span></div>}
    </section>
  )
}

interface DistrictReviewDetailsProps {
  batch: Batch
  officerId: string
  officerName: string
  busy: boolean
  onBack: () => void
  onDecision: (decision: DistrictDecision, comments: string) => void
}

export function DistrictReviewDetails({ batch, officerId, officerName, busy, onBack, onDecision }: DistrictReviewDetailsProps) {
  const [comments, setComments] = useState('')
  const approvals = batch.districtApprovals ?? []
  const approvalCount = batch.districtApprovalCount ?? approvals.filter((approval) => approval.decision === 'APPROVED').length
  const priorDecision = approvals.find((approval) => approval.userId === officerId)
  const canReview = batch.status === 'DISTRICT_REVIEW' && !priorDecision

  return (
    <div className="details-page">
      <button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={17} /> Back to review queue</button>
      <div className="details-title-row">
        <div><div className="detail-breadcrumb">District review <Icon name="chevronRight" size={13} /> {batch.batchNumber}</div><h1>{batch.courseName}</h1><p className="page-subtitle">Batch {batch.batchNumber} <span className="meta-dot">·</span> Submitted {dateLabel(batch.submittedAt ?? batch.createdAt)}</p></div>
        <div className="detail-actions"><StatusBadge status={batch.status} /><span className="approval-progress approval-progress-large"><span className="approval-progress-dots"><i className={approvalCount >= 1 ? 'filled' : ''} /><i className={approvalCount >= 2 ? 'filled' : ''} /></span><strong>{approvalCount}/2 approvals</strong></span></div>
      </div>

      <div className="details-stats">
        <div className="detail-stat panel"><span className="detail-stat-icon blue-soft"><Icon name="users" /></span><div><small>Total candidates</small><strong>{batch.candidateCount}</strong></div></div>
        <div className="detail-stat panel"><span className="detail-stat-icon violet-soft"><Icon name="calendar" /></span><div><small>Submitted on</small><strong className="detail-date">{dateLabel(batch.submittedAt ?? batch.createdAt)}</strong></div></div>
        <div className="detail-stat panel"><span className="detail-stat-icon green-soft"><Icon name="circleCheck" /></span><div><small>Approval round</small><strong>Round {batch.approvalRound ?? 1} <small className="approval-subcount">· {approvalCount}/2 approved</small></strong></div></div>
      </div>

      <div className="details-grid">
        <section className="panel candidate-panel">
          <div className="panel-heading"><div><h2>Candidate roster</h2><p>{batch.candidateCount} candidates in this batch</p></div></div>
          {batch.candidates.length ? <div className="table-wrap"><table className="candidate-table"><thead><tr><th>Candidate</th><th>Candidate ID</th><th>Phone</th></tr></thead><tbody>{batch.candidates.map((candidate, index) => <tr key={candidate.id}><td><span className={`candidate-avatar avatar-${index % 4}`}>{candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="candidate-person"><strong>{candidate.name}</strong><small>{candidate.email || '—'}</small></span></td><td className="candidate-id">{candidate.candidateCode || candidate.id.slice(0, 8)}</td><td className="date-cell">{candidate.phone}</td></tr>)}</tbody></table></div> : <div className="candidate-empty"><span><Icon name="users" size={22} /></span><strong>No candidates found</strong><p>This batch currently has no candidate records.</p></div>}
        </section>

        <aside className="district-review-aside">
          <section className="panel district-approval-panel">
            <div className="panel-heading"><div><h2>District approvals</h2><p>{approvalCount} of 2 distinct officers approved</p></div></div>
            <div className="district-approval-list">{approvals.length ? approvals.map((approval: DistrictApproval) => <div className="district-approval-row" key={approval.userId}><span className="approval-officer-avatar">{approval.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="approval-officer-copy"><strong>{approval.user.name}</strong><small>{dateLabel(approval.createdAt)} · {approval.decision.toLowerCase()}</small></span><StatusBadge status={approval.decision === 'APPROVED' ? 'APPROVED' : approval.decision === 'RETURNED' ? 'RETURNED' : 'REJECTED'} /></div>) : <p className="no-approvals">No district decisions have been recorded yet.</p>}</div>
          </section>

          {batch.status === 'DISTRICT_REVIEW' && <section className="panel district-decision-panel">
            <div className="panel-heading"><div><h2>Your decision</h2><p>Reviewing as {officerName}</p></div></div>
            {!canReview ? <div className="decision-notice"><Icon name="circleCheck" size={17} />You already recorded <strong>{priorDecision!.decision.toLowerCase()}</strong> for this approval round.</div> : <>
              <label className="form-field district-comments"><span>Comments <small>(optional)</small></span><textarea value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Add a note for the training centre…" rows={3} disabled={busy} /></label>
              <div className="district-decision-actions"><button className="button button-primary district-approve" onClick={() => onDecision('APPROVED', comments)} disabled={busy}>{busy ? <span className="spinner" /> : <Icon name="check" size={16} />} Approve</button><button className="button button-secondary district-return" onClick={() => onDecision('RETURNED', comments)} disabled={busy}><Icon name="arrowLeft" size={15} /> Return</button><button className="button district-reject" onClick={() => onDecision('REJECTED', comments)} disabled={busy}><Icon name="close" size={15} /> Reject</button></div>
            </>}
          </section>}
          {batch.status !== 'DISTRICT_REVIEW' && <div className="decision-notice"><Icon name="circleCheck" size={17} />District review is complete. This batch is now <strong>{batch.status.replaceAll('_', ' ').toLowerCase()}</strong>.</div>}
        </aside>
      </div>
    </div>
  )
}
