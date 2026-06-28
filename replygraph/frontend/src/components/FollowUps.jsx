import { useState, useEffect } from 'react'
import { api } from '../api.js'

const DIR_LABELS = {
  user_owes_them: 'I owe them',
  they_owe_user: 'They owe me',
  scheduling_loop: 'Scheduling loop',
  unanswered_question: 'Unanswered question',
}

export default function FollowUps({ toast }) {
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const data = await api.getFollowups()
      setFollowups(data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function complete(id) {
    await api.completeFollowup(id)
    setFollowups(f => f.filter(x => x.id !== id))
    toast('Marked complete')
  }

  const filtered = filter === 'all'
    ? followups
    : followups.filter(f => f.direction === filter)

  const grouped = {}
  filtered.forEach(f => {
    const key = f.direction || 'unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Follow-ups</h1>
        <p>{followups.length} open items</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'user_owes_them', 'they_owe_user', 'scheduling_loop', 'unanswered_question'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : DIR_LABELS[f] || f}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading follow-ups…</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">No open follow-ups. Sync messages to detect them.</div>
      )}

      {Object.entries(grouped).map(([direction, items]) => (
        <div key={direction} style={{ marginBottom: 24 }}>
          <div className="section-title">{DIR_LABELS[direction] || direction}</div>
          {items.map(f => (
            <div key={f.id} className="followup-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{f.task_text}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="text-sm text-muted">{f.contact_name}</span>
                  {f.due_date && (
                    <span className="text-sm" style={{ color: 'var(--warning)' }}>Due: {f.due_date}</span>
                  )}
                  <span className="conf">{f.confidence} confidence</span>
                </div>
              </div>
              <button
                className="btn btn-success btn-sm"
                onClick={() => complete(f.id)}
              >
                Done
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
