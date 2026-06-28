import { useState, useEffect } from 'react'
import { api } from '../api.js'

const TONE_TREND_LABELS = {
  stable: '→ stable',
  improving: '↑ improving',
  declining: '↓ declining',
  shifting: '~ shifting',
}

export default function Analytics() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [tokenUsage, setTokenUsage] = useState(null)

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getTokenUsage()])
      .then(([a, t]) => { setData(a); setTokenUsage(t) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function rebuild() {
    setRebuilding(true)
    try {
      await api.rebuildAnalytics()
      const fresh = await api.getAnalytics()
      setData(fresh)
    } finally {
      setRebuilding(false)
    }
  }

  if (loading) return <div className="loading">Loading analytics…</div>

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Analytics</h1>
          <p>Relationship and tone estimates. These are heuristic guesses, not facts.</p>
        </div>
        <button className="btn btn-ghost" onClick={rebuild} disabled={rebuilding}>
          {rebuilding ? 'Rebuilding…' : '↻ Rebuild'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(247,201,75,0.2)' }}>
        <div className="text-sm" style={{ color: 'var(--warning)' }}>
          ⚠ These are estimates based on text patterns — not psychological profiles.
          Confidence labels indicate how much data was available. Low confidence means take it lightly.
        </div>
      </div>

      {data.length === 0 && (
        <div className="empty-state">No analytics yet. Sync messages first, then rebuild.</div>
      )}

      {data.map((a, i) => (
        <div key={i} className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{a.contact_name}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`tone-chip tone-${a.emotional_tone}`}>{a.emotional_tone}</span>
                <span className="text-sm text-muted">
                  {TONE_TREND_LABELS[a.tone_trend] || a.tone_trend}
                </span>
                <span className="conf">{a.confidence} confidence</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
              <div>{a.message_volume} messages</div>
              {a.last_interaction && (
                <div>{new Date(a.last_interaction).toLocaleDateString()}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            {a.avg_response_hours != null && (
              <Stat label="Avg response" value={`~${a.avg_response_hours}h`} />
            )}
            {a.user_waiting_on_them > 0 && (
              <Stat label="You're waiting" value="Yes" color="var(--warning)" />
            )}
            {a.they_waiting_on_user > 0 && (
              <Stat label="They're waiting" value="Yes" color="var(--urgent)" />
            )}
            {a.common_topics?.length > 0 && (
              <Stat label="Common topics" value={a.common_topics.join(', ')} />
            )}
          </div>

          {a.open_loops?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="text-sm text-muted" style={{ marginBottom: 4 }}>Open loops:</div>
              {a.open_loops.map((loop, j) => (
                <div key={j} className="text-sm" style={{ color: 'var(--warning)', marginBottom: 3 }}>
                  ↻ {loop}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {tokenUsage?.by_operation?.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="section-title">Token Usage Estimates</div>
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 12px 6px 0' }}>Operation</th>
                  <th style={{ padding: '6px 12px 6px 0' }}>Count</th>
                  <th style={{ padding: '6px 12px 6px 0' }}>Input tokens</th>
                  <th style={{ padding: '6px 12px 6px 0' }}>Output tokens</th>
                  <th style={{ padding: '6px 0' }}>Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {tokenUsage.by_operation.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px 8px 0' }}>{row.operation}</td>
                    <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-muted)' }}>{row.count}</td>
                    <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-muted)' }}>{row.total_input_tokens?.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-muted)' }}>{row.total_output_tokens?.toLocaleString()}</td>
                    <td style={{ padding: '8px 0', color: 'var(--accent2)' }}>${row.estimated_cost_usd?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm text-muted" style={{ marginTop: 8 }}>
              Prices come from settings and may not reflect actual billing. Update pricing in Settings.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: color || 'var(--text)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
