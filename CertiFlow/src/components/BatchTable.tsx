import type { Batch } from '../types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

interface BatchTableProps {
  batches: Batch[]
  onSelect: (batch: Batch) => void
  onViewAll?: () => void
  title?: string
  description?: string
  compact?: boolean
}

function displayDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function BatchTable({ batches, onSelect, onViewAll, title = 'Recent batches', description = 'Keep track of your training programmes', compact = false }: BatchTableProps) {
  return (
    <section className="panel batch-panel">
      <div className="panel-heading">
        <div><h2>{title}</h2><p>{description}</p></div>
        {onViewAll && <button className="text-button" onClick={onViewAll}>View all batches <Icon name="arrowRight" size={16} /></button>}
      </div>
      <div className="table-wrap">
        <table className="batch-table">
          <thead><tr>
            <th>Batch</th><th>Course name</th><th>Candidates</th><th>Status</th><th>Created</th><th><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>
            {batches.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">No batches match your search.</td></tr>
            ) : (compact ? batches.slice(0, 5) : batches).map((batch) => (
              <tr key={batch.id} onClick={() => onSelect(batch)} className="batch-row">
                <td><button className="batch-number" onClick={() => onSelect(batch)}>{batch.batchNumber}</button></td>
                <td><span className="course-cell">{batch.courseName}</span></td>
                <td><span className="candidate-count"><Icon name="users" size={15} />{batch.candidateCount}</span></td>
                <td><StatusBadge status={batch.status} /></td>
                <td className="date-cell">{displayDate(batch.createdAt)}</td>
                <td><button className="row-action" aria-label={`View ${batch.batchNumber}`} onClick={() => onSelect(batch)}><Icon name="arrowUpRight" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {batches.length > 0 && <div className="table-footer"><span>Showing <strong>{Math.min(batches.length, compact ? 5 : batches.length)}</strong> of <strong>{batches.length}</strong> batches</span><span className="table-updated"><span className="live-dot" /> Updated just now</span></div>}
    </section>
  )
}
