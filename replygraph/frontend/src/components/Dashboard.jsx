import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Dashboard({ toast, onNavigate }) {
  const [threads, setThreads] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState(null)

  useEffect(() => {
    Promise.all([api.getThreads(), api.getFollowups(), api.getDashboardPrefs()])
      .then(([t, f, p]) => { setThreads(t); setFollowups(f); setPrefs(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading dashboard…</div>

  const needsReply = threads.filter(t => t.needs_response_estimate)
  const highRisk = threads.filter(t => t.priority_label === 'risky_to_answer_fast')
  const emotional = threads.filter(t => t.priority_label === 'emotional')
  const urgent = threads.filter(t => t.urgency === 'high')
  const pinned = threads.filter(t => t.pinned)
  const overdue = threads.filter(t => {
    if (!t.latest_at || !t.needs_response_estimate) return false
    const days = (Date.now() - new Date(t.latest_at)) / 86400000
    return days > 2
  })
  const openFollowups = followups.filter(f => f.status === 'open')

  const density = prefs?.layout_density || 'spacious'
  const visibility = prefs?.widget_visibility || {}
  const order = prefs?.widget_order || []

  const widgets = {
    needs_reply: (
      <Widget key="needs_reply" title="Needs Reply" icon="✉">
        <div className="widget-count" style={{ color: needsReply.length > 0 ? 'var(--accent)' : 'var(--success)' }}>
          {needsReply.length}
        </div>
        <div className="widget-list" style={{ marginTop: 12 }}>
          {needsReply.slice(0, 4).map(t => (
            <div key={t.id} className="widget-item">
              <strong>{t.contact_name}</strong> — {(t.latest_message || '').slice(0, 50)}
            </div>
          ))}
        </div>
      </Widget>
    ),
    high_risk_threads: (
      <Widget key="high_risk_threads" title="High Risk" icon="⚠">
        <div className="widget-count" style={{ color: highRisk.length > 0 ? 'var(--urgent)' : 'var(--success)' }}>
          {highRisk.length}
        </div>
        <div className="widget-list" style={{ marginTop: 12 }}>
          {highRisk.slice(0, 3).map(t => (
            <div key={t.id} className="widget-item">
              <strong>{t.contact_name}</strong> — review carefully
            </div>
          ))}
          {highRisk.length === 0 && <div className="text-muted text-sm">None flagged</div>}
        </div>
      </Widget>
    ),
    follow_ups_due: (
      <Widget key="follow_ups_due" title="Open Follow-ups" icon="○">
        <div className="widget-count">{openFollowups.length}</div>
        <div className="widget-list" style={{ marginTop: 12 }}>
          {openFollowups.slice(0, 4).map(f => (
            <div key={f.id} className="widget-item">
              <span className={`followup-direction dir-${f.direction}`}>{f.direction?.replace(/_/g, ' ')}</span>
              {' '}{f.task_text.slice(0, 50)}
            </div>
          ))}
        </div>
      </Widget>
    ),
    emotional_threads: (
      <Widget key="emotional_threads" title="Emotional Threads" icon="♥">
        <div className="widget-count" style={{ color: emotional.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {emotional.length}
        </div>
        <div className="widget-list" style={{ marginTop: 12 }}>
          {emotional.slice(0, 3).map(t => (
            <div key={t.id} className="widget-item"><strong>{t.contact_name}</strong></div>
          ))}
          {emotional.length === 0 && <div className="text-muted text-sm">None flagged</div>}
        </div>
      </Widget>
    ),
    overdue_replies: (
      <Widget key="overdue_replies" title="Overdue Replies" icon="⏱">
        <div className="widget-count" style={{ color: overdue.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
          {overdue.length}
        </div>
        <div className="widget-list" style={{ marginTop: 12 }}>
          {overdue.slice(0, 3).map(t => (
            <div key={t.id} className="widget-item"><strong>{t.contact_name}</strong></div>
          ))}
          {overdue.length === 0 && <div className="text-muted text-sm">All caught up</div>}
        </div>
      </Widget>
    ),
    imessage_sync_status: (
      <Widget key="imessage_sync_status" title="iMessage Sync" icon="↻">
        <div className="text-muted text-sm" style={{ marginTop: 4 }}>
          {threads.length} threads in database
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => onNavigate('settings')}
        >
          Go to Settings
        </button>
      </Widget>
    ),
  }

  const visibleWidgets = order.length > 0
    ? order.filter(id => visibility[id] !== false && widgets[id]).map(id => widgets[id])
    : Object.entries(widgets)
        .filter(([id]) => visibility[id] !== false)
        .map(([, w]) => w)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>{needsReply.length} need a reply · {openFollowups.length} open follow-ups</p>
      </div>
      {pinned.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">Pinned Threads</div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {pinned.map(t => (
              <div key={t.id} className="card-sm" style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.contact_name}</div>
                <div className="text-muted text-sm">{(t.latest_message || '').slice(0, 40)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div
        className="dashboard-grid"
        style={density === 'compact' ? { gap: 10 } : {}}
      >
        {visibleWidgets.length > 0 ? visibleWidgets : (
          <div className="empty-state">No widgets visible. Go to Settings → Dashboard to configure.</div>
        )}
      </div>
    </div>
  )
}

function Widget({ title, icon, children }) {
  return (
    <div className="widget">
      <div className="widget-title">{icon} {title}</div>
      {children}
    </div>
  )
}
