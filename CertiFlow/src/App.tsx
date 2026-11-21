import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BatchTable } from './components/BatchTable'
import { Icon } from './components/Icon'
import { Sidebar } from './components/Sidebar'
import { StatusBadge } from './components/StatusBadge'
import { DistrictQueue, DistrictReviewDetails, type DistrictDecision } from './components/DistrictWorkflow'
import { ApprovalQueue, ApprovalReviewDetails, type ReviewDecision, type ReviewStage } from './components/ApprovalWorkflow'
import { batchApi } from './services/batchApi'
import type { Batch, BatchStatus, Section } from './types'

const districtOfficers = [
  { id: '39380bdc-81fe-43f0-a5d0-559977f58c23', name: 'Demo District Officer', label: 'District Officer 1' },
  { id: 'a271ac79-e8b3-4465-a4d7-ae84e0b02911', name: 'Demo District Officer 2', label: 'District Officer 2' },
]
const qualityOfficer = { id: 'ca501f49-29db-4cf7-855f-7bb77f688751', name: 'Demo Quality Officer', label: 'Quality Officer', role: 'QUALITY_OFFICER' as const }
const stateOfficer = { id: '02ad0283-1a5a-41d1-9862-8cf5f33d8d71', name: 'Demo State Officer', label: 'State Officer', role: 'STATE_OFFICER' as const }

const pageTitles: Record<Section, string> = {
  Dashboard: 'Dashboard',
  'My Batches': 'My batches',
  Certificates: 'Certificates',
  Notifications: 'Notifications',
  Settings: 'Settings',
}

function formatDate(value: string) {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function activityDescription(status: BatchStatus) {
  const labels: Record<BatchStatus, string> = {
    DRAFT: 'is a draft', SUBMITTED: 'was submitted', DISTRICT_REVIEW: 'is in district review',
    QUALITY_REVIEW: 'is in quality review', STATE_REVIEW: 'is in state review', APPROVED: 'was approved',
    ISSUED: 'has certificates issued', RETURNED: 'was returned for updates', REJECTED: 'was rejected', CANCELLED: 'was cancelled',
  }
  return labels[status]
}

function EmptySection({ section, onCreate }: { section: Section; onCreate: () => void }) {
  const content: Record<Exclude<Section, 'Dashboard' | 'My Batches'>, { icon: 'certificate' | 'bell' | 'settings'; title: string; body: string }> = {
    Certificates: { icon: 'certificate', title: 'Your certificates will appear here', body: 'Once a batch completes its approval journey, issued certificates will be ready to view and download.' },
    Notifications: { icon: 'bell', title: 'Batch updates are in the bell menu', body: 'Your latest batch changes are available from the notification bell in the header. A full notification centre will be available later.' },
    Settings: { icon: 'settings', title: 'Workspace settings', body: 'Manage your training centre profile and preferences from one place. More settings are coming soon.' },
  }
  const item = content[section as Exclude<Section, 'Dashboard' | 'My Batches'>]
  return (
    <div className="empty-page panel">
      <span className="empty-illustration"><Icon name={item.icon} size={29} /></span>
      <span className="eyebrow">{section}</span>
      <h2>{item.title}</h2>
      <p>{item.body}</p>
      {section === 'Certificates' && <button className="button button-primary" onClick={onCreate}><Icon name="plus" size={17} /> Create a batch</button>}
    </div>
  )
}

function CreateBatchModal({ onClose, onCreate, batches, loading }: { onClose: () => void; onCreate: (batchNumber: string, courseName: string, requiresQualityReview: boolean) => Promise<void>; batches: Batch[]; loading: boolean }) {
  const [batchNumber, setBatchNumber] = useState('')
  const [courseName, setCourseName] = useState('')
  const [requiresQualityReview, setRequiresQualityReview] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const number = batchNumber.trim()
    const course = courseName.trim()
    if (!number || !course) {
      setError('Please complete both fields to continue.')
      return
    }
    if (batches.some((batch) => batch.batchNumber.toLowerCase() === number.toLowerCase())) {
      setError('That batch number is already in use.')
      return
    }
    setError('')
    try {
      await onCreate(number, course, requiresQualityReview)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the batch. Please try again.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <div className="modal-top"><span className="modal-icon"><Icon name="batches" size={21} /></span><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
        <span className="eyebrow">NEW PROGRAMME</span>
        <h2 id="create-title">Create a batch</h2>
        <p className="modal-description">Set up a training batch. You can add candidates after it’s created.</p>
        <form onSubmit={handleSubmit}>
          <label className="form-field"><span>Batch number <b>*</b></span><input autoFocus value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} placeholder="e.g. CF-2026-015" /></label>
          <label className="form-field"><span>Course name <b>*</b></span><input value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="e.g. Product Design Fundamentals" /></label>
          <label className="quality-review-option"><input type="checkbox" checked={requiresQualityReview} onChange={(event) => setRequiresQualityReview(event.target.checked)} /> <span><strong>Include Quality Officer review</strong><small>Route this batch through the quality review stage after District approval.</small></span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={loading}>Cancel</button><button type="submit" className="button button-primary" disabled={loading}>{loading ? <><span className="spinner" /> Creating…</> : <><Icon name="plus" size={17} /> Create batch</>}</button></div>
        </form>
        <div className="modal-note"><Icon name="sparkles" size={15} /> New batches start as a draft</div>
      </section>
    </div>
  )
}

function BatchDetails({ batch, onBack, onSubmit, onUpload, submitting, uploading, busy }: { batch: Batch; onBack: () => void; onSubmit: () => void; onUpload: (file: File) => void; submitting: boolean; uploading: boolean; busy: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const isDraft = batch.status === 'DRAFT'
  const workflow: { label: string; status: BatchStatus; icon: 'fileText' | 'users' | 'check' | 'certificate' | 'circleCheck' }[] = [
    { label: 'Draft created', status: 'DRAFT', icon: 'fileText' },
    { label: 'District review', status: 'DISTRICT_REVIEW', icon: 'users' },
    { label: 'Quality review', status: 'QUALITY_REVIEW', icon: 'check' },
    { label: 'State approval', status: 'STATE_REVIEW', icon: 'check' },
    { label: 'Approved', status: 'APPROVED', icon: 'circleCheck' },
    { label: 'Certificates issued', status: 'ISSUED', icon: 'certificate' },
  ]
  const completion: Record<BatchStatus, number> = {
    DRAFT: 0, SUBMITTED: 1, DISTRICT_REVIEW: 1, QUALITY_REVIEW: 2, STATE_REVIEW: 3, APPROVED: 4, ISSUED: 5, RETURNED: 1, REJECTED: 1, CANCELLED: 1,
  }
  const stage = completion[batch.status]

  return (
    <div className="details-page">
      <button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={17} /> Back to batches</button>
      <div className="details-title-row">
        <div><div className="detail-breadcrumb">My batches <Icon name="chevronRight" size={13} /> {batch.batchNumber}</div><h1>{batch.courseName}</h1><p className="page-subtitle">Batch {batch.batchNumber} <span className="meta-dot">·</span> Created {formatDate(batch.createdAt)}</p></div>
        <div className="detail-actions"><StatusBadge status={batch.status} />{isDraft && <button className="button button-primary" onClick={onSubmit} disabled={batch.candidateCount === 0 || busy}>{submitting ? <><span className="spinner" /> Submitting…</> : <><Icon name="arrowRight" size={17} /> Submit for approval</>}</button>}</div>
      </div>
      {isDraft && batch.candidateCount === 0 && <div className="inline-notice"><Icon name="help" size={17} /> Add candidates to this batch before submitting it for approval.</div>}
      <div className="details-stats">
        <div className="detail-stat panel"><span className="detail-stat-icon blue-soft"><Icon name="users" /></span><div><small>Total candidates</small><strong>{batch.candidateCount}</strong></div></div>
        <div className="detail-stat panel"><span className="detail-stat-icon violet-soft"><Icon name="calendar" /></span><div><small>Created on</small><strong className="detail-date">{formatDate(batch.createdAt)}</strong></div></div>
        <div className="detail-stat panel"><span className="detail-stat-icon green-soft"><Icon name="circleCheck" /></span><div><small>Current status</small><strong className="detail-status"><StatusBadge status={batch.status} /></strong></div></div>
      </div>
      <div className="details-grid">
        <section className="panel candidate-panel">
          <div className="panel-heading"><div><h2>Candidates</h2><p>{batch.candidateCount} people enrolled in this batch</p></div><div className="candidate-actions">{isDraft && <><input ref={fileInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = '' }} /><button className="button button-secondary button-small" onClick={() => fileInput.current?.click()} disabled={busy}>{uploading ? <><span className="spinner" /> Uploading…</> : <><Icon name="upload" size={16} /> Upload CSV</>}</button></>}<button className="button button-secondary button-small" disabled><Icon name="download" size={16} /> Export</button></div></div>
          {batch.candidates.length > 0 ? <div className="table-wrap"><table className="candidate-table"><thead><tr><th>Candidate</th><th>Candidate ID</th><th>Phone</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{batch.candidates.map((candidate, index) => <tr key={candidate.id}><td><span className={`candidate-avatar avatar-${index % 4}`}>{candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="candidate-person"><strong>{candidate.name}</strong><small>{candidate.email || '—'}</small></span></td><td className="candidate-id">{candidate.candidateCode || candidate.id.slice(0, 8)}</td><td className="date-cell">{candidate.phone}</td><td><button className="row-action" aria-label={`View ${candidate.name}`}><Icon name="arrowUpRight" size={16} /></button></td></tr>)}</tbody></table><div className="candidate-list-footer">Showing {batch.candidates.length} candidates</div></div> : <div className="candidate-empty"><span><Icon name="users" size={22} /></span><strong>No candidates added yet</strong><p>Upload a CSV roster to add candidates to this batch.</p></div>}
        </section>
        <aside className="panel workflow-panel">
          <div className="panel-heading"><div><h2>Approval journey</h2><p>Follow your batch through each stage</p></div></div>
          <div className="workflow-list">{workflow.map((item, index) => {
            const isComplete = index < stage
            const isCurrent = index === stage
            const isTerminal = batch.status === 'REJECTED' || batch.status === 'RETURNED'
            return <div className={`workflow-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`} key={item.label}>
              <span className="workflow-marker">{isComplete ? <Icon name="check" size={14} /> : <Icon name={item.icon} size={15} />}</span>
              <span className="workflow-copy"><strong>{item.label}</strong><small>{isTerminal && isCurrent ? (batch.status === 'RETURNED' ? 'Changes requested' : 'Batch rejected') : isComplete ? 'Completed' : isCurrent ? 'In progress' : 'Up next'}</small></span>
              {isCurrent && !isTerminal && <span className="current-pulse" />}
            </div>
          })}</div>
          <div className="workflow-footnote"><Icon name="clock" size={16} /><span>Reviews typically take <strong>2–3 business days</strong></span></div>
        </aside>
      </div>
    </div>
  )
}

function App() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [section, setSection] = useState<Section>('Dashboard')
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<Batch | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [roleView, setRoleView] = useState<'TRAINING_CENTRE' | 'DISTRICT_OFFICER' | 'QUALITY_OFFICER' | 'STATE_OFFICER'>('TRAINING_CENTRE')
  const [districtOfficerId, setDistrictOfficerId] = useState(districtOfficers[0].id)
  const [districtQueue, setDistrictQueue] = useState<Batch[]>([])
  const [districtLoading, setDistrictLoading] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [operation, setOperation] = useState<'create' | 'upload' | 'submit' | 'approval' | null>(null)
  const [pageError, setPageError] = useState('')
  const selectedBatchIdRef = useRef<string | null>(null)
  const detailsRequestVersion = useRef(0)
  const listRequestVersion = useRef(0)
  const districtQueueRequestVersion = useRef(0)

  useEffect(() => {
    let active = true
    const version = ++listRequestVersion.current
    batchApi.list()
      .then((items) => { if (active && version === listRequestVersion.current) setBatches(items) })
      .catch((error: unknown) => { if (active && version === listRequestVersion.current) setPageError(error instanceof Error ? error.message : 'Could not load batches.') })
      .finally(() => { if (active) setPageLoading(false) })
    return () => { active = false }
  }, [])

  const selectedBatch = selectedBatchDetails?.id === selectedBatchId ? selectedBatchDetails : null
  const filteredBatches = useMemo(() => batches.filter((batch) => `${batch.batchNumber} ${batch.courseName}`.toLowerCase().includes(query.toLowerCase())), [batches, query])
  const pendingCount = batches.filter((batch) => ['SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW'].includes(batch.status)).length
  const approvedCount = batches.filter((batch) => batch.status === 'APPROVED').length
  const certificatesCount = batches.filter((batch) => batch.status === 'ISSUED').reduce((total, batch) => total + batch.candidateCount, 0)

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  async function loadBatchDetails(batchId: string) {
    selectedBatchIdRef.current = batchId
    setSelectedBatchId(batchId)
    setSelectedBatchDetails(null)
    setDetailsLoading(true)
    setPageError('')
    setNotificationsOpen(false)
    const version = ++detailsRequestVersion.current
    try {
      const details = await batchApi.get(batchId)
      if (version !== detailsRequestVersion.current || selectedBatchIdRef.current !== batchId) return
      setSelectedBatchDetails(details)
      setBatches((current) => current.map((batch) => batch.id === details.id ? details : batch))
      setDistrictQueue((current) => current.map((batch) => batch.id === details.id ? details : batch))
    } catch (error) {
      if (version === detailsRequestVersion.current && selectedBatchIdRef.current === batchId) {
        setPageError(error instanceof Error ? error.message : 'Could not load batch details.')
      }
    } finally {
      if (version === detailsRequestVersion.current && selectedBatchIdRef.current === batchId) setDetailsLoading(false)
    }
  }

  function openBatch(batch: Batch) {
    void loadBatchDetails(batch.id)
  }

  function navigate(next: Section) {
    selectedBatchIdRef.current = null
    detailsRequestVersion.current += 1
    setSection(next)
    setSelectedBatchId(null)
    setSelectedBatchDetails(null)
    setDetailsLoading(false)
    setQuery('')
    setNotificationsOpen(false)
  }

  function retryData() {
    setPageError('')
    const selectedId = selectedBatchIdRef.current
    if (roleView !== 'TRAINING_CENTRE') {
      setDistrictLoading(true)
      void refreshDistrictQueue(selectedId ?? undefined, roleView === 'DISTRICT_OFFICER' ? 'DISTRICT_REVIEW' : roleView === 'QUALITY_OFFICER' ? 'QUALITY_REVIEW' : 'STATE_REVIEW')
        .catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not refresh the district review queue.'))
        .finally(() => setDistrictLoading(false))
      return
    }
    if (selectedId) {
      void loadBatchDetails(selectedId)
      return
    }
    setPageLoading(true)
    void refreshBatches()
      .catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not refresh batches.'))
      .finally(() => setPageLoading(false))
  }

  async function refreshBatches(detailsForId?: string) {
    const listVersion = ++listRequestVersion.current
    const detailsVersion = detailsForId ? ++detailsRequestVersion.current : null
    const latest = await batchApi.list()
    if (listVersion !== listRequestVersion.current) return null
    if (detailsForId) {
      const details = await batchApi.get(detailsForId)
      if (listVersion !== listRequestVersion.current) return null
      if (detailsVersion === detailsRequestVersion.current && selectedBatchIdRef.current === detailsForId) {
        const next = latest.some((batch) => batch.id === details.id)
          ? latest.map((batch) => batch.id === details.id ? details : batch)
          : [details, ...latest]
        setBatches(next)
        setSelectedBatchDetails(details)
        setDetailsLoading(false)
      } else {
        setBatches(latest)
      }
      return details
    }
    setBatches(latest)
    return null
  }

  async function refreshDistrictQueue(detailsForId?: string, status: 'DISTRICT_REVIEW' | 'QUALITY_REVIEW' | 'STATE_REVIEW' = 'DISTRICT_REVIEW') {
    const queueVersion = ++districtQueueRequestVersion.current
    const detailsVersion = detailsForId ? ++detailsRequestVersion.current : null
    const queue = status === 'DISTRICT_REVIEW' ? await batchApi.listDistrictReview() : await batchApi.listReview(status)
    if (queueVersion !== districtQueueRequestVersion.current) return null
    setBatches((current) => current.map((batch) => queue.find((queued) => queued.id === batch.id) ?? batch))
    if (!detailsForId) {
      setDistrictQueue(queue)
      return null
    }

    const details = await batchApi.get(detailsForId)
    if (queueVersion !== districtQueueRequestVersion.current) return null
    setDistrictQueue(queue)
    if (detailsVersion === detailsRequestVersion.current && selectedBatchIdRef.current === detailsForId) {
      setSelectedBatchDetails(details)
      setBatches((current) => current.some((batch) => batch.id === details.id)
        ? current.map((batch) => batch.id === details.id ? details : batch)
        : [details, ...current])
      setDetailsLoading(false)
    }
    return details
  }

  async function switchToTrainingCentre() {
    setRoleMenuOpen(false)
    if (roleView !== 'TRAINING_CENTRE') {
      selectedBatchIdRef.current = null
      detailsRequestVersion.current += 1
      setSelectedBatchId(null)
      setSelectedBatchDetails(null)
      setDetailsLoading(false)
      setSection('Dashboard')
      setRoleView('TRAINING_CENTRE')
    }
  }

  async function switchReviewRole(role: 'DISTRICT_OFFICER' | 'QUALITY_OFFICER' | 'STATE_OFFICER', userId: string) {
    const changingRole = roleView !== role
    setDistrictOfficerId(userId)
    setRoleView(role)
    setRoleMenuOpen(false)
    setPageError('')
    if (changingRole) {
      selectedBatchIdRef.current = null
      detailsRequestVersion.current += 1
      setSelectedBatchId(null)
      setSelectedBatchDetails(null)
      setDetailsLoading(false)
      setSection('Dashboard')
    }
    setDistrictLoading(true)
    try {
      const status = role === 'DISTRICT_OFFICER' ? 'DISTRICT_REVIEW' : role === 'QUALITY_OFFICER' ? 'QUALITY_REVIEW' : 'STATE_REVIEW'
      await refreshDistrictQueue(changingRole ? undefined : selectedBatchIdRef.current ?? undefined, status)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not load the district review queue.')
    } finally {
      setDistrictLoading(false)
    }
  }

  function prepareSelectedDetailsRefresh(batchId: string) {
    if (selectedBatchIdRef.current !== batchId) return
    detailsRequestVersion.current += 1
    setSelectedBatchDetails(null)
    setDetailsLoading(true)
  }

  async function createBatch(batchNumber: string, courseName: string, requiresQualityReview: boolean) {
    setOperation('create')
    try {
      const created = await batchApi.create(batchNumber, courseName, requiresQualityReview)
      setCreateOpen(false)
      setSection('My Batches')
      selectedBatchIdRef.current = created.id
      setSelectedBatchId(created.id)
      setSelectedBatchDetails(null)
      setDetailsLoading(true)
      try {
        await refreshBatches(created.id)
      } catch {
        setPageError('Batch created, but its details could not refresh. Use Refresh to try again.')
        if (selectedBatchIdRef.current === created.id) setDetailsLoading(false)
      }
      flash('Your draft batch has been created.')
    } finally {
      setOperation(null)
    }
  }

  async function uploadCandidates(batch: Batch, file: File) {
    setOperation('upload')
    setPageError('')
    try {
      const result = await batchApi.uploadCandidates(batch.id, file)
      prepareSelectedDetailsRefresh(batch.id)
      try {
        await refreshBatches(batch.id)
      } catch {
        setPageError(`${result.uploadedCount} candidates uploaded, but the batch view could not refresh. Use Refresh to try again.`)
        if (selectedBatchIdRef.current === batch.id) setDetailsLoading(false)
      }
      flash(`${result.uploadedCount} candidates uploaded successfully.`)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Candidate upload failed.')
    } finally {
      setOperation(null)
    }
  }

  async function submitBatch(batch: Batch) {
    if (batch.candidateCount === 0) {
      flash('Add candidates before submitting this batch.')
      return
    }
    setOperation('submit')
    setPageError('')
    try {
      await batchApi.submit(batch.id)
      prepareSelectedDetailsRefresh(batch.id)
      try {
        await refreshBatches(batch.id)
      } catch {
        setPageError('Batch submitted, but the updated batch could not refresh. Use Refresh to try again.')
        if (selectedBatchIdRef.current === batch.id) setDetailsLoading(false)
      }
      flash(`${batch.batchNumber} has been submitted for approval.`)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Batch submission failed.')
    } finally {
      setOperation(null)
    }
  }

  async function decideDistrict(batch: Batch, decision: DistrictDecision, comments: string) {
    setOperation('approval')
    setPageError('')
    prepareSelectedDetailsRefresh(batch.id)
    try {
      await batchApi.districtDecision(batch.id, districtOfficerId, decision, comments)
      await refreshDistrictQueue(batch.id, 'DISTRICT_REVIEW')
      const action = decision === 'APPROVED' ? 'approval recorded' : decision === 'RETURNED' ? 'returned to the training centre' : 'rejected'
      flash(`District decision ${action}.`)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not record the district decision.')
      if (selectedBatchIdRef.current === batch.id) setDetailsLoading(false)
    } finally {
      setOperation(null)
    }
  }

  async function decideStage(batch: Batch, stage: ReviewStage, decision: ReviewDecision, comments: string) {
    setOperation('approval')
    setPageError('')
    prepareSelectedDetailsRefresh(batch.id)
    try {
      await batchApi.stageDecision(batch.id, stage.toLowerCase() as 'quality' | 'state', districtOfficerId, decision, comments)
      await refreshDistrictQueue(batch.id, stage === 'QUALITY' ? 'QUALITY_REVIEW' : 'STATE_REVIEW')
      flash(stage === 'STATE' && decision === 'APPROVED' ? 'Final approval recorded and certificates generated.' : `${stage === 'QUALITY' ? 'Quality' : 'State'} decision recorded.`)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not record the review decision.')
      if (selectedBatchIdRef.current === batch.id) setDetailsLoading(false)
    } finally {
      setOperation(null)
    }
  }

  const latestActivity = [...batches]
    .sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt))
    .slice(0, 3)

  const currentOfficer = [...districtOfficers, qualityOfficer, stateOfficer].find((officer) => officer.id === districtOfficerId) ?? districtOfficers[0]
  const officerMode = roleView !== 'TRAINING_CENTRE'
  const reviewStage: ReviewStage | null = roleView === 'QUALITY_OFFICER' ? 'QUALITY' : roleView === 'STATE_OFFICER' ? 'STATE' : null
  const reviewStatus = roleView === 'QUALITY_OFFICER' ? 'QUALITY_REVIEW' : roleView === 'STATE_OFFICER' ? 'STATE_REVIEW' : 'DISTRICT_REVIEW'
  const awaitingSecondApproval = districtQueue.filter((batch) => (batch.districtApprovalCount ?? 0) === 1).length
  const awaitingFirstApproval = districtQueue.filter((batch) => (batch.districtApprovalCount ?? 0) === 0).length
  const pageTitle = selectedBatchId
    ? officerMode ? 'Batch review' : 'Batch details'
    : officerMode ? section === 'My Batches' ? 'Review queue' : `${currentOfficer.label} dashboard` : pageTitles[section]
  const activeSection = selectedBatchId ? 'My Batches' : section

  return (
    <div className="app-shell">
      <Sidebar active={activeSection} onNavigate={navigate} onCreate={() => setCreateOpen(true)} districtMode={officerMode} roleLabel={roleView === 'DISTRICT_OFFICER' ? 'District Officer' : roleView === 'QUALITY_OFFICER' ? 'Quality Officer' : 'State Officer'} />
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Icon name="certificate" size={19} /></span><strong>certiflow</strong></div>
          <div className="topbar-heading"><span className="topbar-context">{officerMode ? currentOfficer.label.toUpperCase() : 'DEMO TRAINING CENTRE'} <Icon name="chevronRight" size={13} /> {selectedBatchId ? 'BATCHES' : section.toUpperCase()}</span><h2>{pageTitle}</h2></div>
          <div className="topbar-tools">
            <label className="search-box"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search batches..." aria-label="Search batches" /><kbd>⌘ K</kbd></label>
            <div className="notification-wrap"><button className={`icon-button topbar-bell ${notificationsOpen ? 'selected' : ''}`} aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}><Icon name="bell" size={20} /></button>
              {notificationsOpen && <div className="notification-popover"><div className="notification-popover-head"><strong>Latest batch updates</strong><span>{latestActivity.length}</span></div>{latestActivity.slice(0, 2).map((batch) => <button className="notification-item notification-batch-item" key={batch.id} onClick={() => openBatch(batch)}><span className="notification-icon icon-violet"><Icon name={batch.status === 'ISSUED' ? 'certificate' : 'batches'} size={16} /></span><p><strong>{batch.batchNumber}</strong><small>{activityDescription(batch.status)}</small></p><time>{formatDate(batch.updatedAt ?? batch.createdAt)}</time></button>)}{latestActivity.length === 0 && <p className="notification-empty">Batch updates will appear here.</p>}<button className="notification-all" onClick={() => navigate('Notifications')}>View all notifications <Icon name="arrowRight" size={15} /></button></div>}
            </div>
            <div className="topbar-divider" />
            <div className="role-switcher-wrap">
              <button className="topbar-user" onClick={() => setRoleMenuOpen((open) => !open)} aria-expanded={roleMenuOpen}><span className="user-avatar">{officerMode ? currentOfficer.label.slice(0, 2).toUpperCase() : 'DC'}</span><span className="topbar-user-copy"><strong>{officerMode ? currentOfficer.name : 'Demo Centre User'}</strong><small>{officerMode ? currentOfficer.label : 'Training Centre'}</small></span><Icon name="chevronDown" size={16} className="muted-icon" /></button>
              {roleMenuOpen && <div className="role-switcher-menu"><div className="role-menu-label">SWITCH DEMO VIEW</div><button className={`role-menu-option ${roleView === 'TRAINING_CENTRE' ? 'selected' : ''}`} onClick={() => { void switchToTrainingCentre() }}><span className="role-option-avatar centre-role">TC</span><span><strong>Training Centre</strong><small>Demo Training Centre</small></span>{roleView === 'TRAINING_CENTRE' && <Icon name="check" size={16} />}</button><div className="role-menu-divider" /><div className="role-menu-label">DISTRICT OFFICERS</div>{districtOfficers.map((officer) => <button key={officer.id} className={`role-menu-option ${roleView === 'DISTRICT_OFFICER' && districtOfficerId === officer.id ? 'selected' : ''}`} onClick={() => { void switchReviewRole('DISTRICT_OFFICER', officer.id) }}><span className="role-option-avatar officer-role">{officer.label.endsWith('1') ? '01' : '02'}</span><span><strong>{officer.label}</strong><small>{officer.name}</small></span>{roleView === 'DISTRICT_OFFICER' && districtOfficerId === officer.id && <Icon name="check" size={16} />}</button>)}<div className="role-menu-divider" /><div className="role-menu-label">OTHER REVIEW OFFICERS</div>{[qualityOfficer, stateOfficer].map((officer) => <button key={officer.id} className={`role-menu-option ${roleView === officer.role ? 'selected' : ''}`} onClick={() => { void switchReviewRole(officer.role, officer.id) }}><span className="role-option-avatar officer-role">{officer.role === 'QUALITY_OFFICER' ? 'QO' : 'SO'}</span><span><strong>{officer.label}</strong><small>{officer.name}</small></span>{roleView === officer.role && <Icon name="check" size={16} />}</button>)}</div>}
            </div>
          </div>
        </header>

        <main className="main-content">
          {pageError && <div className="api-error" role="alert"><span>{pageError}</span><button onClick={retryData}>Refresh</button></div>}
          {pageLoading && <div className="loading-banner"><span className="spinner" /> Loading your training centre batches…</div>}
          {selectedBatchId ? selectedBatch ? roleView === 'DISTRICT_OFFICER' ? <DistrictReviewDetails key={selectedBatch.id + districtOfficerId} batch={selectedBatch} officerId={districtOfficerId} officerName={currentOfficer.name} busy={operation === 'approval'} onBack={() => navigate('My Batches')} onDecision={(decision, comments) => { void decideDistrict(selectedBatch, decision, comments) }} /> : reviewStage ? <ApprovalReviewDetails key={selectedBatch.id + districtOfficerId} batch={selectedBatch} stage={reviewStage} officerId={districtOfficerId} officerName={currentOfficer.name} busy={operation === 'approval'} onBack={() => navigate('My Batches')} onDecision={(decision, comments) => { void decideStage(selectedBatch, reviewStage, decision, comments) }} /> : <BatchDetails batch={selectedBatch} onBack={() => navigate('My Batches')} onSubmit={() => { void submitBatch(selectedBatch) }} onUpload={(file) => { void uploadCandidates(selectedBatch, file) }} submitting={operation === 'submit'} uploading={operation === 'upload'} busy={operation !== null} /> : <div className="details-page"><div className="loading-banner">{detailsLoading ? <><span className="spinner" /> Loading batch details...</> : <>Batch details could not be loaded. <button className="text-button" onClick={() => { void loadBatchDetails(selectedBatchId) }}>Try again</button></>}</div></div> : officerMode ? (
            <>
              <div className="welcome-row"><div><span className="eyebrow welcome-eyebrow">{currentOfficer.label.toUpperCase()} WORKSPACE</span><h1>{currentOfficer.label} review queue</h1><p className="page-subtitle">Review submitted batches and record your decision.</p></div><button className="button button-secondary create-main" onClick={() => { void refreshDistrictQueue(undefined, reviewStatus) }} disabled={districtLoading}>{districtLoading ? <><span className="spinner" /> Refreshing</> : <><Icon name="arrowRight" size={17} /> Refresh queue</>}</button></div>
              <div className="metric-grid district-metrics">
                <article className="metric-card panel"><div className="metric-top"><span>Pending batches</span><span className="metric-icon metric-amber"><Icon name="clock" size={19} /></span></div><div className="metric-value">{districtQueue.length}<span className="metric-context">in review</span></div><div className="metric-foot">Awaiting a district decision</div></article>
                <article className="metric-card panel"><div className="metric-top"><span>Awaiting first approval</span><span className="metric-icon metric-blue"><Icon name="users" size={19} /></span></div><div className="metric-value">{awaitingFirstApproval}</div><div className="metric-foot">No officer has approved yet</div></article>
                <article className="metric-card panel"><div className="metric-top"><span>Awaiting second approval</span><span className="metric-icon metric-violet"><Icon name="circleCheck" size={19} /></span></div><div className="metric-value">{awaitingSecondApproval}</div><div className="metric-foot">One distinct approval recorded</div></article>
                <article className="metric-card panel"><div className="metric-top"><span>Reviewing as</span><span className="metric-icon metric-green"><Icon name="users" size={19} /></span></div><div className="metric-value district-officer-metric">{currentOfficer.label}</div><div className="metric-foot">Switch officer from your profile menu</div></article>
              </div>
              {districtLoading && <div className="loading-banner"><span className="spinner" /> Loading district review batches...</div>}
              {reviewStage ? <ApprovalQueue batches={districtQueue} stage={reviewStage} onReview={openBatch} /> : <DistrictQueue batches={districtQueue} onReview={openBatch} />}
            </>
          ) : section === 'Dashboard' ? (
            <>
              <div className="welcome-row"><div><span className="eyebrow welcome-eyebrow">YOUR TRAINING CENTRE</span><h1>Welcome back <span className="wave">✦</span></h1><p className="page-subtitle">Here’s what’s happening at your training centre today.</p></div><button className="button button-primary create-main" onClick={() => setCreateOpen(true)}><Icon name="plus" size={18} /> Create batch</button></div>
              <div className="metric-grid">
                <article className="metric-card panel"><div className="metric-top"><span>Total batches</span><span className="metric-icon metric-blue"><Icon name="batches" size={19} /></span></div><div className="metric-value">{batches.length}<span className="metric-trend trend-positive"><Icon name="arrowUpRight" size={13} /> 12%</span></div><div className="metric-foot">Compared to last month</div><div className="metric-spark spark-blue"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
                <article className="metric-card panel"><div className="metric-top"><span>Pending approval</span><span className="metric-icon metric-amber"><Icon name="clock" size={19} /></span></div><div className="metric-value">{pendingCount}<span className="metric-context">batches</span></div><div className="metric-foot">Across all review stages</div><div className="mini-progress"><span style={{ width: `${Math.max(18, pendingCount * 13)}%` }} /></div></article>
                <article className="metric-card panel"><div className="metric-top"><span>Approved</span><span className="metric-icon metric-green"><Icon name="circleCheck" size={19} /></span></div><div className="metric-value">{approvedCount}<span className="metric-trend trend-positive"><Icon name="arrowUpRight" size={13} /> 8%</span></div><div className="metric-foot">Ready for certificate issuance</div><div className="metric-spark spark-green"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
                <article className="metric-card panel"><div className="metric-top"><span>Certificates issued</span><span className="metric-icon metric-violet"><Icon name="certificate" size={19} /></span></div><div className="metric-value">{certificatesCount}<span className="metric-context">this month</span></div><div className="metric-foot">From {batches.filter((batch) => batch.status === 'ISSUED').length} completed batches</div><div className="metric-spark spark-violet"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
              </div>
              <div className="overview-grid">
                <BatchTable batches={filteredBatches} onSelect={openBatch} onViewAll={() => navigate('My Batches')} compact />
                <aside className="overview-aside">
                  <section className="panel pipeline-panel"><div className="panel-heading"><div><h2>Approval pipeline</h2><p>Batches moving through review</p></div><button className="icon-button small-icon-button" aria-label="View pipeline"><Icon name="more" size={18} /></button></div>
                    <div className="pipeline-list">{[
                      { label: 'District review', count: batches.filter((item) => item.status === 'DISTRICT_REVIEW').length, tone: 'district', width: 62 },
                      { label: 'Quality review', count: batches.filter((item) => item.status === 'QUALITY_REVIEW').length, tone: 'quality', width: 42 },
                      { label: 'State approval', count: batches.filter((item) => item.status === 'STATE_REVIEW').length, tone: 'state', width: 28 },
                    ].map((item) => <div className="pipeline-row" key={item.label}><div className="pipeline-label"><span>{item.label}</span><strong>{item.count}</strong></div><div className="pipeline-track"><span className={`pipeline-fill ${item.tone}`} style={{ width: item.count ? `${Math.max(item.width, item.count * 20)}%` : '4%' }} /></div></div>)}</div>
                    <button className="pipeline-link" onClick={() => navigate('My Batches')}>View approval activity <Icon name="arrowRight" size={15} /></button>
                  </section>
                  <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates from your centre</p></div><button className="text-button icon-text-button" onClick={() => navigate('Notifications')}>All activity <Icon name="arrowRight" size={15} /></button></div>
                    <div className="activity-list">{latestActivity.length ? latestActivity.map((batch, index) => <div className="activity-row" key={batch.id}><span className={`activity-avatar activity-${index === 0 ? 'blue' : index === 1 ? 'violet' : 'green'}`}><Icon name="batches" size={14} /></span><p><strong>{batch.batchNumber}</strong> {activityDescription(batch.status)} <button onClick={() => openBatch(batch)}>{batch.courseName}</button><small>Updated {formatDate(batch.updatedAt ?? batch.createdAt)}</small></p></div>) : <div className="activity-empty">Create a batch to see recent activity here.</div>}</div>
                  </section>
                </aside>
              </div>
              <div className="dashboard-tip"><span><Icon name="sparkles" size={17} /></span><p><strong>Tip:</strong> Keep your candidate details up to date to help speed up the approval process.</p><button onClick={() => navigate('My Batches')}>Explore batches <Icon name="arrowRight" size={14} /></button></div>
            </>
          ) : section === 'My Batches' ? (
            <><div className="section-heading-row"><div><span className="eyebrow">YOUR PROGRAMMES</span><h1>My batches</h1><p className="page-subtitle">Manage training batches and track their progress.</p></div><button className="button button-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={18} /> Create batch</button></div><div className="batch-list-toolbar"><div className="list-count"><strong>{filteredBatches.length}</strong> batches <span className="meta-dot">·</span> All programmes</div><button className="button button-secondary button-small" onClick={() => flash('Showing all batches.')}><Icon name="filter" size={16} /> Filters</button></div><BatchTable batches={filteredBatches} onSelect={openBatch} title="All batches" description="A complete view of your training programmes" /></>
          ) : <><div className="section-heading-row"><div><span className="eyebrow">AKADEMI SKILLS</span><h1>{pageTitles[section]}</h1><p className="page-subtitle">Your training centre workspace.</p></div></div><EmptySection section={section} onCreate={() => setCreateOpen(true)} /></>}
        </main>
      </div>
      {createOpen && <CreateBatchModal onClose={() => setCreateOpen(false)} onCreate={createBatch} batches={batches} loading={operation === 'create'} />}
      {toast && <div className="toast-message"><span><Icon name="circleCheck" size={17} /></span>{toast}</div>}
    </div>
  )
}

export default App
