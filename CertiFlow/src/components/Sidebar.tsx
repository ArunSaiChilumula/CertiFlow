import type { Section } from '../types'
import { Icon, type IconName } from './Icon'

interface SidebarProps {
  active: Section
  onNavigate: (section: Section) => void
  onCreate: () => void
  districtMode: boolean
  roleLabel?: string
}

const links: { label: Section; icon: IconName }[] = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'My Batches', icon: 'batches' },
  { label: 'Certificates', icon: 'certificate' },
  { label: 'Notifications', icon: 'bell' },
]

export function Sidebar({ active, onNavigate, onCreate, districtMode, roleLabel = 'District Officer' }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate('Dashboard')} aria-label="CertiFlow dashboard">
        <span className="brand-mark"><Icon name="certificate" size={22} /></span>
        <span className="brand-word">certi<span>flow</span><small>TRAINING PORTAL</small></span>
      </button>

      <div className="workspace-switcher">
        <span className="workspace-avatar">{districtMode ? 'D' : 'A'}</span>
        <span className="workspace-copy"><strong>{districtMode ? `${roleLabel} Review` : 'Demo Training Centre'}</strong><small>{districtMode ? roleLabel : 'Training centre'}</small></span>
        <Icon name="chevronDown" size={16} className="muted-icon" />
      </div>

      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {links.map((link) => (
          <div key={link.label}>
            <button className={`nav-link ${active === link.label ? 'active' : ''}`} onClick={() => onNavigate(link.label)}>
              <Icon name={link.icon} size={19} />
              <span>{districtMode && link.label === 'My Batches' ? 'Review Queue' : link.label}</span>
              {link.label === 'Notifications' && <span className="nav-count">3</span>}
            </button>
            {link.label === 'My Batches' && !districtMode && <button className="nav-link create-nav-link" onClick={onCreate}><Icon name="plus" size={19} /><span>Create Batch</span></button>}
          </div>
        ))}
      </nav>

      <div className="nav-label nav-label-spaced">MANAGE</div>
      <button className={`nav-link ${active === 'Settings' ? 'active' : ''}`} onClick={() => onNavigate('Settings')}>
        <Icon name="settings" size={19} /><span>Settings</span>
      </button>

      <div className="sidebar-spacer" />
      <div className="sidebar-help">
        <span className="help-icon"><Icon name="help" size={17} /></span>
        <strong>Need a hand?</strong>
        <p>Our support team is here to help you.</p>
        <button onClick={() => onNavigate('Settings')}>Visit help centre <Icon name="arrowRight" size={14} /></button>
      </div>
      <div className="sidebar-footer">
        <span className="footer-avatar">DC</span>
        <span className="footer-profile"><strong>Demo Centre User</strong><small>demo@certiflow.com</small></span>
        <button className="icon-button footer-more" aria-label="Profile options"><Icon name="more" size={19} /></button>
      </div>
    </aside>
  )
}
