import { useMemo, useState, type FormEvent } from 'react'
import { BatchTable } from './components/BatchTable'
import { Icon } from './components/Icon'
import { Sidebar } from './components/Sidebar'
import { StatusBadge } from './components/StatusBadge'
import { initialBatches, recentActivity } from './data/demoData'
import type { Batch, BatchStatus, Section } from './types'

const pageTitles: Record<Section, string> = {
  Dashboard: 'Dashboard',
  'My Batches': 'My batches',
  Certificates: 'Certificates',
  Notifications: 'Notifications',
  Settings: 'Settings',
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function EmptySection({ section, onCreate }: { section: Section; onCreate: () => void }) {
  const [notificationsRead, setNotificationsRead] = useState(false)
  const content: Record<Exclude<Section, 'Dashboard' | 'My Batches'>, { icon: 'certificate' | 'bell' | 'settings'; title: string; body: string }> = {
    Certificates: { icon: 'certificate', title: 'Your certificates will appear here', body: 'Once a batch completes its approval journey, issued certificates will be ready to view and download.' },
    Notifications: { icon: 'bell', title: 'You’re all caught up', body: 'Updates about batch reviews, certificates and important activity will show up here.' },
    Settings: { icon: 'settings', title: 'Workspace settings', body: 'Manage your training centre profile and preferences from one place. More settings are coming soon.' },
  }
  const item = content[section as Exclude<Section, 'Dashboard' | 'My Batches'>]
  if (section === 'Notifications') {
    return (
      <section className="panel notifications-page">
        <div className="panel-heading"><div><h2>Recent updates</h2><p>Activity from your training centre</p></div><button className="text-button" onClick={() => setNotificationsRead(true)}>{notificationsRead ? 'You’re all caught up' : 'Mark all as read'}</button></div>
        <div className="notification-page-list">
          <div className={`notification-page-item ${notificationsRead ? 'read' : ''}`}><span className="notification-icon icon-violet"><Icon name="users" size={17} /></span><p><strong>District review started</strong><span>Batch CF-2026-013 is now under district review.</span><small>Today, 11:40 AM</small></p>{!notificationsRead && <i />}</div>
          <div className={`notification-page-item ${notificationsRead ? 'read' : ''}`}><span className="notification-icon icon-green"><Icon name="certificate" size={17} /></span><p><strong>Certificates are ready</strong><span>26 certificates for CF-2026-009 have been issued.</span><small>Yesterday, 4:15 PM</small></p>{!notificationsRead && <i />}</div>
          <div className={`notification-page-item ${notificationsRead ? 'read' : ''}`}><span className="notification-icon icon-violet"><Icon name="batches" size={17} /></span><p><strong>New batch created</strong><span>CF-2026-014 was added to your workspace.</span><small>Yesterday, 10:05 AM</small></p>{!notificationsRead && <i />}</div>
        </div>
      </section>
    )
  }
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

function CreateBatchModal({ onClose, onCreate, batches }: { onClose: () => void; onCreate: (batchNumber: string, courseName: string) => void; batches: Batch[] }) {
  const [batchNumber, setBatchNumber] = useState('')
  const [courseName, setCourseName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    onCreate(number, course)
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
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary"><Icon name="plus" size={17} /> Create batch</button></div>
        </form>
        <div className="modal-note"><Icon name="sparkles" size={15} /> New batches start as a draft</div>
      </section>
    </div>
  )
}

function BatchDetails({ batch, onBack, onSubmit }: { batch: Batch; onBack: () => void; onSubmit: () => void }) {
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
    DRAFT: 0, DISTRICT_REVIEW: 1, QUALITY_REVIEW: 2, STATE_REVIEW: 3, APPROVED: 4, ISSUED: 5, RETURNED: 1, REJECTED: 1,
  }
  const stage = completion[batch.status]

  return (
    <div className="details-page">
      <button className="back-link" onClick={onBack}><Icon name="arrowLeft" size={17} /> Back to batches</button>
      <div className="details-title-row">
        <div><div className="detail-breadcrumb">My batches <Icon name="chevronRight" size={13} /> {batch.batchNumber}</div><h1>{batch.courseName}</h1><p className="page-subtitle">Batch {batch.batchNumber} <span className="meta-dot">·</span> Created {formatDate(batch.createdAt)}</p></div>
        <div className="detail-actions"><StatusBadge status={batch.status} />{isDraft && <button className="button button-primary" onClick={onSubmit} disabled={batch.candidateCount === 0}><Icon name="arrowRight" size={17} /> Submit for approval</button>}</div>
      </div>
      {isDraft && batch.candidateCount === 0 && <div className="inline-notice"><Icon name="help" size={17} /> Add candidates to this batch before submitting it for approval.</div>}
      <div className="details-stats">
        <div className="detail-stat panel"><span className="detail-stat-icon blue-soft"><Icon name="users" /></span><div><small>Total candidates</small><strong>{batch.candidateCount}</strong></div></div>
        <div className="detail-stat panel"><span className="detail-stat-icon violet-soft"><Icon name="calendar" /></span><div><small>Created on</small><strong className="detail-date">{formatDate(batch.createdAt)}</strong></div></div>
        <div className="detail-stat panel"><span className="detail-stat-icon green-soft"><Icon name="circleCheck" /></span><div><small>Current status</small><strong className="detail-status"><StatusBadge status={batch.status} /></strong></div></div>
      </div>
      <div className="details-grid">
        <section className="panel candidate-panel">
          <div className="panel-heading"><div><h2>Candidates</h2><p>{batch.candidateCount} people enrolled in this batch</p></div><button className="button button-secondary button-small" disabled><Icon name="download" size={16} /> Export</button></div>
          {batch.candidates.length > 0 ? <div className="table-wrap"><table className="candidate-table"><thead><tr><th>Candidate</th><th>Candidate ID</th><th>Phone</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{batch.candidates.map((candidate, index) => <tr key={candidate.id}><td><span className={`candidate-avatar avatar-${index % 4}`}>{candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="candidate-person"><strong>{candidate.name}</strong><small>{candidate.email}</small></span></td><td className="candidate-id">{candidate.id}</td><td className="date-cell">{candidate.phone}</td><td><button className="row-action" aria-label={`View ${candidate.name}`}><Icon name="arrowUpRight" size={16} /></button></td></tr>)}</tbody></table><div className="candidate-list-footer">Showing {batch.candidates.length} sample candidates{batch.candidateCount > batch.candidates.length ? ` of ${batch.candidateCount}` : ''}</div></div> : <div className="candidate-empty"><span><Icon name="users" size={22} /></span><strong>No candidates added yet</strong><p>Candidate records will appear here after you upload your roster.</p></div>}
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
  const [batches, setBatches] = useState<Batch[]>(initialBatches)
  const [section, setSection] = useState<Section>('Dashboard')
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [toast, setToast] = useState('')

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null
  const filteredBatches = useMemo(() => batches.filter((batch) => `${batch.batchNumber} ${batch.courseName}`.toLowerCase().includes(query.toLowerCase())), [batches, query])
  const pendingCount = batches.filter((batch) => ['DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW'].includes(batch.status)).length
  const approvedCount = batches.filter((batch) => batch.status === 'APPROVED').length
  const certificatesCount = batches.filter((batch) => batch.status === 'ISSUED').reduce((total, batch) => total + batch.candidateCount, 0)

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  function openBatch(batch: Batch) {
    setSelectedBatchId(batch.id)
    setNotificationsOpen(false)
  }

  function navigate(next: Section) {
    setSection(next)
    setSelectedBatchId(null)
    setQuery('')
    setNotificationsOpen(false)
  }

  function createBatch(batchNumber: string, courseName: string) {
    const batch: Batch = {
      id: `local-${Date.now()}`,
      batchNumber,
      courseName,
      candidateCount: 0,
      status: 'DRAFT',
      createdAt: new Date().toISOString().slice(0, 10),
      candidates: [],
    }
    setBatches((current) => [batch, ...current])
    setCreateOpen(false)
    setSection('My Batches')
    setSelectedBatchId(batch.id)
    flash('Your draft batch has been created.')
  }

  function submitBatch(batch: Batch) {
    if (batch.candidateCount === 0) {
      flash('Add candidates before submitting this batch.')
      return
    }
    setBatches((current) => current.map((item) => item.id === batch.id ? { ...item, status: 'DISTRICT_REVIEW' } : item))
    flash(`${batch.batchNumber} has been submitted for approval.`)
  }

  const pageTitle = selectedBatch ? 'Batch details' : pageTitles[section]
  const activeSection = selectedBatch ? 'My Batches' : section

  return (
    <div className="app-shell">
      <Sidebar active={activeSection} onNavigate={navigate} onCreate={() => setCreateOpen(true)} />
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Icon name="certificate" size={19} /></span><strong>certiflow</strong></div>
          <div className="topbar-heading"><span className="topbar-context">AKADEMI SKILLS <Icon name="chevronRight" size={13} /> {selectedBatch ? 'BATCHES' : section.toUpperCase()}</span><h2>{pageTitle}</h2></div>
          <div className="topbar-tools">
            <label className="search-box"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search batches..." aria-label="Search batches" /><kbd>⌘ K</kbd></label>
            <div className="notification-wrap"><button className={`icon-button topbar-bell ${notificationsOpen ? 'selected' : ''}`} aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}><Icon name="bell" size={20} /><i /></button>
              {notificationsOpen && <div className="notification-popover"><div className="notification-popover-head"><strong>Notifications</strong><span>3 new</span></div><div className="notification-item"><span className="notification-icon icon-violet"><Icon name="users" size={16} /></span><p><strong>District review started</strong><small>CF-2026-013 is under review</small></p><time>1h</time></div><div className="notification-item"><span className="notification-icon icon-green"><Icon name="certificate" size={16} /></span><p><strong>Certificates are ready</strong><small>26 certificates for CF-2026-009</small></p><time>1d</time></div><button className="notification-all" onClick={() => navigate('Notifications')}>View all notifications <Icon name="arrowRight" size={15} /></button></div>}
            </div>
            <div className="topbar-divider" />
            <button className="topbar-user" onClick={() => navigate('Settings')}><span className="user-avatar">AS</span><span className="topbar-user-copy"><strong>Ananya Sharma</strong><small>Training Centre</small></span><Icon name="chevronDown" size={16} className="muted-icon" /></button>
          </div>
        </header>

        <main className="main-content">
          {selectedBatch ? <BatchDetails batch={selectedBatch} onBack={() => { setSelectedBatchId(null); setSection('My Batches') }} onSubmit={() => submitBatch(selectedBatch)} /> : section === 'Dashboard' ? (
            <>
              <div className="welcome-row"><div><span className="eyebrow welcome-eyebrow">SATURDAY, NOVEMBER 21, 2026</span><h1>Good morning, Ananya <span className="wave">✦</span></h1><p className="page-subtitle">Here’s what’s happening at your training centre today.</p></div><button className="button button-primary create-main" onClick={() => setCreateOpen(true)}><Icon name="plus" size={18} /> Create batch</button></div>
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
                    <div className="activity-list">{recentActivity.map((activity) => <div className="activity-row" key={activity.target}><span className={`activity-avatar activity-${activity.tone}`}>{activity.initials}</span><p><strong>{activity.name}</strong> {activity.action} <button onClick={() => { const found = batches.find((batch) => batch.batchNumber === activity.target); if (found) openBatch(found) }}>{activity.target}</button><small>{activity.time}</small></p></div>)}</div>
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
      {createOpen && <CreateBatchModal onClose={() => setCreateOpen(false)} onCreate={createBatch} batches={batches} />}
      {toast && <div className="toast-message"><span><Icon name="circleCheck" size={17} /></span>{toast}</div>}
    </div>
  )
}

export default App
