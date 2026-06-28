import { useState, useEffect, useCallback } from 'react'
import { api } from './api.js'
import Dashboard from './components/Dashboard.jsx'
import Inbox from './components/Inbox.jsx'
import FollowUps from './components/FollowUps.jsx'
import Analytics from './components/Analytics.jsx'
import Exports from './components/Exports.jsx'
import Settings from './components/Settings.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'inbox', label: 'Inbox', icon: '✉' },
  { id: 'followups', label: 'Follow-ups', icon: '○' },
  { id: 'analytics', label: 'Analytics', icon: '◎' },
  { id: 'exports', label: 'Exports', icon: '↗' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [toasts, setToasts] = useState([])
  const [health, setHealth] = useState(null)

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => {
    api.health().then(setHealth).catch(() => {})
  }, [])

  async function sync() {
    setSyncing(true)
    try {
      const result = await api.syncImessage()
      setSyncStatus(result)
      if (result.ok) {
        toast(`Synced ${result.synced} threads`)
      } else {
        toast(result.error || 'Sync failed', 'error')
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const imessageOk = health?.imessage?.accessible

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>ReplyGraph</h2>
          <span>iMessage · local-first</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item${tab === n.id ? ' active' : ''}`}
              onClick={() => setTab(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: imessageOk ? 'var(--success)' : 'var(--urgent)',
                display: 'inline-block'
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {imessageOk ? 'iMessage ready' : 'iMessage not accessible'}
            </span>
          </div>
          <button className="sync-btn" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync Messages'}
          </button>
          {syncStatus && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              {syncStatus.ok ? `${syncStatus.synced} threads synced` : syncStatus.error?.slice(0, 60)}
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {tab === 'dashboard' && <Dashboard toast={toast} onNavigate={setTab} />}
        {tab === 'inbox' && <Inbox toast={toast} />}
        {tab === 'followups' && <FollowUps toast={toast} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'exports' && <Exports toast={toast} />}
        {tab === 'settings' && <Settings toast={toast} onSync={sync} iMessageOk={imessageOk} />}
      </main>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}
