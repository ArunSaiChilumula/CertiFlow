import { useState } from 'react'
import type { Batch, StageApproval } from '../types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

export type ReviewStage = 'QUALITY' | 'STATE'
export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'RETURNED'

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

export function ApprovalQueue({ batches, stage, onReview }: { batches: Batch[]; stage: ReviewStage; onReview: (batch: Batch) => void }) {
  const label = stage === 'QUALITY' ? 'Quality' : 'State'
  return <section className="panel batch-panel">
    <div className="panel-heading"><div><h2>{label} review queue</h2><p>Batches awaiting a {label.toLowerCase()} officer decision</p></div><span className="queue-count">{batches.length} pending</span></div>
    <div className="table-wrap"><table className="batch-table district-queue-table">
      <thead><tr><th>Batch</th><th>Course name</th><th>Candidates</th><th>Submitted</th><th>District approvals</th><th><span className="sr-only">Review</span></th></tr></thead>
      <tbody>{batches.length ? batches.map((batch) => <tr key={batch.id} className="batch-row" onClick={() => onReview(batch)}>
        <td><button className="batch-number" onClick={() => onReview(batch)}>{batch.batchNumber}</button></td><td><span className="course-cell">{batch.courseName}</span></td>
        <td><span className="candidate-count"><Icon name="users" size={15} />{batch.candidateCount}</span></td><td className="date-cell">{dateLabel(batch.submittedAt ?? batch.createdAt)}</td>
        <td><span className="approval-progress"><strong>{batch.districtApprovalCount ?? 0}/2</strong></span></td>
        <td><button className="review-button" onClick={() => onReview(batch)}>Review <Icon name="arrowRight" size={14} /></button></td>
      </tr>) : <tr><td colSpan={6} className="table-empty">No batches are waiting for {label.toLowerCase()} review.</td></tr>}</tbody>
    </table></div>
    {!!batches.length && <div className="table-footer"><span><strong>{batches.length}</strong> batches in {label.toLowerCase()} review</span></div>}
  </section>
}

export function ApprovalReviewDetails({ batch, stage, officerId, officerName, busy, onBack, onDecision }: {
  batch: Batch; stage: ReviewStage; officerId: string; officerName: string; busy: boolean; onBack: () => void;
  onDecision: (decision: ReviewDecision, comments: string) => void
}) {
  const [comments, setComments] = useState('')
  const expectedStatus = stage === 'QUALITY' ? 'QUALITY_REVIEW' : 'STATE_REVIEW'
  const label = stage === 'QUALITY' ? 'Quality' : 'State'
  const history = (batch.stageApprovals ?? []).filter((approval) => approval.stage === stage)
  const priorDecision = history.find((approval) => approval.userId === officerId)
  const canReturn = stage === 'QUALITY'
  return <div className="details-page">
    <button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={17} /> Back to review queue</button>
    <div className="details-title-row"><div><div className="detail-breadcrumb">{label} review <Icon name="chevronRight" size={13} /> {batch.batchNumber}</div><h1>{batch.courseName}</h1><p className="page-subtitle">Batch {batch.batchNumber} <span className="meta-dot">·</span> Submitted {dateLabel(batch.submittedAt ?? batch.createdAt)}</p></div><div className="detail-actions"><StatusBadge status={batch.status} /></div></div>
    <div className="details-stats">
      <div className="detail-stat panel"><span className="detail-stat-icon blue-soft"><Icon name="users" /></span><div><small>Total candidates</small><strong>{batch.candidateCount}</strong></div></div>
      <div className="detail-stat panel"><span className="detail-stat-icon violet-soft"><Icon name="calendar" /></span><div><small>Submitted on</small><strong className="detail-date">{dateLabel(batch.submittedAt ?? batch.createdAt)}</strong></div></div>
      <div className="detail-stat panel"><span className="detail-stat-icon green-soft"><Icon name="circleCheck" /></span><div><small>Current stage</small><strong>{label} review</strong></div></div>
    </div>
    <div className="details-grid">
      <section className="panel candidate-panel"><div className="panel-heading"><div><h2>Candidate roster</h2><p>{batch.candidateCount} candidates in this batch</p></div></div>
        {batch.candidates.length ? <div className="table-wrap"><table className="candidate-table"><thead><tr><th>Candidate</th><th>Candidate ID</th><th>Phone</th></tr></thead><tbody>{batch.candidates.map((candidate, index) => <tr key={candidate.id}><td><span className={`candidate-avatar avatar-${index % 4}`}>{candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="candidate-person"><strong>{candidate.name}</strong><small>{candidate.email || '—'}</small></span></td><td className="candidate-id">{candidate.candidateCode || candidate.id.slice(0, 8)}</td><td className="date-cell">{candidate.phone}</td></tr>)}</tbody></table></div> : <div className="candidate-empty"><span><Icon name="users" size={22} /></span><strong>No candidates found</strong><p>This batch currently has no candidate records.</p></div>}
      </section>
      <aside className="district-review-aside">
        <section className="panel district-approval-panel"><div className="panel-heading"><div><h2>{label} decisions</h2><p>{history.length} decision{history.length === 1 ? '' : 's'} recorded this round</p></div></div>
          <div className="district-approval-list">{history.length ? history.map((approval: StageApproval) => <div className="district-approval-row" key={approval.userId}><span className="approval-officer-avatar">{approval.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="approval-officer-copy"><strong>{approval.user.name}</strong><small>{dateLabel(approval.createdAt)} · {approval.decision.toLowerCase()}{approval.comments ? ` · ${approval.comments}` : ''}</small></span><StatusBadge status={approval.decision} /></div>) : <p className="no-approvals">No {label.toLowerCase()} decisions recorded yet.</p>}</div>
        </section>
        {batch.status === expectedStatus && <section className="panel district-decision-panel"><div className="panel-heading"><div><h2>Your decision</h2><p>Reviewing as {officerName}</p></div></div>
          {priorDecision ? <div className="decision-notice"><Icon name="circleCheck" size={17} />You already recorded <strong>{priorDecision.decision.toLowerCase()}</strong>.</div> : <>
            <label className="form-field district-comments"><span>Comments <small>(optional)</small></span><textarea value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Add a review note…" rows={3} disabled={busy} /></label>
            <div className="district-decision-actions"><button className="button button-primary district-approve" onClick={() => onDecision('APPROVED', comments)} disabled={busy}>{busy ? <span className="spinner" /> : <Icon name="check" size={16} />} Approve</button>{canReturn && <button className="button button-secondary district-return" onClick={() => onDecision('RETURNED', comments)} disabled={busy}><Icon name="arrowLeft" size={15} /> Return</button>}<button className="button district-reject" onClick={() => onDecision('REJECTED', comments)} disabled={busy}><Icon name="close" size={15} /> Reject</button></div>
          </>}
        </section>}
        {batch.status !== expectedStatus && <div className="decision-notice"><Icon name="circleCheck" size={17} />This review stage is complete. Batch status: <strong>{batch.status.replaceAll('_', ' ').toLowerCase()}</strong>.</div>}
      </aside>
    </div>
  </div>
}
