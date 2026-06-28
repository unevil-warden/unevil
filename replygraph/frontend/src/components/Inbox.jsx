import { useState, useEffect } from 'react'
import { api } from '../api.js'

const PRIORITY_COLORS = {
  urgent: 'var(--urgent)',
  risky_to_answer_fast: 'var(--accent3)',
  emotional: 'var(--accent)',
  logistical: 'var(--warning)',
  work_admin: 'var(--accent2)',
  low_priority: 'var(--text-dim)',
  no_response_needed: 'var(--text-dim)',
}

const REWRITE_BUTTONS = [
  { id: 'shorter', label: 'shorter' },
  { id: 'nicer', label: 'nicer' },
  { id: 'more_direct', label: 'more direct' },
  { id: 'less_fake', label: 'less fake' },
  { id: 'more_adult', label: 'more adult' },
  { id: 'casual', label: 'casual' },
  { id: 'professional', label: 'professional' },
  { id: 'say_no_politely', label: 'say no politely' },
  { id: 'buy_time', label: 'buy time' },
  { id: 'ask_one_clear_question', label: 'one clear question' },
  { id: 'calmer', label: 'calmer' },
  { id: 'less_defensive', label: 'less defensive' },
  { id: 'less_apologetic', label: 'less apologetic' },
]

export default function Inbox({ toast }) {
  const [threads, setThreads] = useState([])
  const [selected, setSelected] = useState(null)
  const [thread, setThread] = useState(null)
  const [draft, setDraft] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [toneRisks, setToneRisks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [draftLoading, setDraftLoading] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [filter, setFilter] = useState('needs_reply')

  useEffect(() => {
    api.getThreads().then(t => { setThreads(t); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function selectThread(id) {
    setSelected(id)
    setDraft(null)
    setDraftText('')
    setToneRisks(null)
    const t = await api.getThread(id)
    setThread(t)
    if (t.drafts?.length > 0) {
      const latest = t.drafts[0]
      setDraft(latest)
      setDraftText(latest.draft_text)
    }
  }

  async function generateDraft() {
    setDraftLoading(true)
    try {
      const result = await api.generateDraft(selected)
      setDraft(result)
      setDraftText(result.draft_text)
      setToneRisks(result.tone_risks)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDraftLoading(false)
    }
  }

  async function rewrite(type) {
    if (!draftText) return
    setRewriting(true)
    try {
      const result = await api.rewriteDraft(selected, draftText, type)
      setDraftText(result.draft_text)
      setToneRisks(result.tone_risks)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setRewriting(false)
    }
  }

  async function approve() {
    await api.approve(selected, 'approved', draftText)
    toast('Approved and saved')
  }

  async function approveEdited() {
    await api.approve(selected, 'edited_approved', draftText)
    toast('Edited draft approved')
  }

  async function deny() {
    await api.deny(selected)
    toast('Denied and noted')
  }

  async function noResponse() {
    await api.noResponse(selected)
    toast('Marked: no response needed')
  }

  async function copyToClipboard() {
    try {
      // Try browser clipboard first
      await navigator.clipboard.writeText(draftText)
      await api.copyDraft(selected)
      toast('Copied to clipboard!')
    } catch {
      // Fallback to backend
      try {
        const result = await api.copyDraft(selected)
        if (result.ok) toast('Copied (via backend)')
        else toast(result.clipboard?.error || 'Copy failed', 'error')
      } catch (e) {
        toast(e.message, 'error')
      }
    }
  }

  const filteredThreads = threads.filter(t => {
    if (filter === 'needs_reply') return t.needs_response_estimate
    if (filter === 'all') return true
    if (filter === 'pinned') return t.pinned
    if (filter === 'high_risk') return t.priority_label === 'risky_to_answer_fast'
    return true
  })

  const riskFlags = draft?.risk_flags || (draft?.risk_flags_json ? JSON.parse(draft.risk_flags_json) : [])
  const isHighRisk = riskFlags.some(f => ['medical', 'money', 'legal', 'conflict', 'work_risk'].includes(f))

  return (
    <div className="inbox-layout">
      <div className="thread-panel">
        <div className="thread-panel-header">
          <h3>Inbox</h3>
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {['needs_reply', 'all', 'pinned', 'high_risk'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <div className="thread-list">
            {filteredThreads.length === 0 && <div className="empty-state">No threads</div>}
            {filteredThreads.map(t => (
              <div
                key={t.id}
                className={`thread-item${selected === t.id ? ' active' : ''}${t.pinned ? ' pinned' : ''}`}
                onClick={() => selectThread(t.id)}
              >
                <div className="thread-name">
                  {t.contact_name}
                  {t.pinned && <span style={{ fontSize: 10, color: 'var(--accent2)' }}>📌</span>}
                </div>
                <div className="thread-preview">{t.latest_message}</div>
                <div className="thread-meta">
                  {t.urgency && (
                    <span className="badge" style={{ background: 'transparent', color: PRIORITY_COLORS[t.priority_label], fontSize: 10, padding: '0 4px' }}>
                      {t.priority_label?.replace(/_/g, ' ')}
                    </span>
                  )}
                  {t.needs_response_estimate && (
                    <span className="badge badge-urgent" style={{ fontSize: 10 }}>reply needed</span>
                  )}
                  <span className="badge badge-source">iMessage</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="detail-panel">
        {!selected && (
          <div className="empty-state">Select a thread to review</div>
        )}
        {selected && thread && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{thread.contact_name}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {thread.urgency && <span className={`badge badge-${thread.urgency}`}>{thread.urgency}</span>}
                  {thread.priority_label && <span className="badge badge-source">{thread.priority_label?.replace(/_/g, ' ')}</span>}
                  {thread.analytics?.emotional_tone && (
                    <span className={`tone-chip tone-${thread.analytics.emotional_tone}`}>
                      {thread.analytics.emotional_tone} <span className="conf">({thread.analytics.confidence})</span>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => thread.pinned ? api.unpinThread(selected) : api.pinThread(selected)}
                >
                  {thread.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => noResponse()}>
                  No reply needed
                </button>
              </div>
            </div>

            {thread.analytics?.open_loops?.length > 0 && (
              <div className="card-sm" style={{ marginBottom: 16, borderColor: 'rgba(247,201,75,0.3)' }}>
                <div className="section-title">Open Loops</div>
                {thread.analytics.open_loops.map((loop, i) => (
                  <div key={i} className="text-sm" style={{ color: 'var(--warning)', marginBottom: 4 }}>↻ {loop}</div>
                ))}
              </div>
            )}

            <div className="message-list" style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
              {thread.messages?.map(msg => (
                <div key={msg.id} className={`message ${msg.is_from_me ? 'from-me' : 'from-them'}`}>
                  <div className="message-bubble">{msg.text}</div>
                  <div className="message-time">
                    {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>

            <hr />

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ margin: 0 }}>Draft Reply</div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={generateDraft}
                  disabled={draftLoading}
                >
                  {draftLoading ? 'Generating…' : draft ? 'Regenerate' : 'Generate Draft'}
                </button>
              </div>

              {draft && (
                <>
                  {draft.reason && (
                    <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
                      {draft.reason}
                      {draft.mode === 'mock' && <span style={{ color: 'var(--warning)', marginLeft: 6 }}>(mock — add API key for real drafts)</span>}
                    </div>
                  )}

                  <div className="draft-box">
                    <textarea
                      className="draft-text"
                      value={draftText}
                      onChange={e => setDraftText(e.target.value)}
                    />
                  </div>

                  {isHighRisk && (
                    <div className="status-bar status-warn" style={{ marginTop: 8 }}>
                      ⚠ High-risk topic — review carefully before copying
                    </div>
                  )}

                  {riskFlags.length > 0 && (
                    <div className="risk-flags">
                      {riskFlags.map(f => <span key={f} className="risk-flag">{f}</span>)}
                    </div>
                  )}

                  {toneRisks?.flags?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="text-sm text-muted" style={{ marginBottom: 4 }}>Tone check:</div>
                      <div className="risk-flags">
                        {toneRisks.flags.map(f => <span key={f} className="tone-risk">{f.replace(/_/g, ' ')}</span>)}
                      </div>
                      {toneRisks.suggestions?.length > 0 && (
                        <div className="text-sm" style={{ marginTop: 6, color: 'var(--warning)' }}>
                          {toneRisks.suggestions[0]}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <div className="text-sm text-muted" style={{ marginBottom: 6 }}>Rewrite:</div>
                    <div className="rewrite-grid">
                      {REWRITE_BUTTONS.map(b => (
                        <button
                          key={b.id}
                          className="rewrite-btn"
                          disabled={rewriting}
                          onClick={() => rewrite(b.id)}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="draft-actions" style={{ marginTop: 16 }}>
                    <button className="btn btn-success" onClick={approve}>✓ Approve</button>
                    <button className="btn btn-success" onClick={approveEdited}>✎ Save Edit</button>
                    <button
                      className="btn btn-primary"
                      onClick={copyToClipboard}
                    >
                      ⧉ Copy to Clipboard
                    </button>
                    <button className="btn btn-danger" onClick={deny}>✕ Deny</button>
                  </div>
                </>
              )}

              {!draft && !draftLoading && (
                <div className="empty-state" style={{ padding: 20 }}>
                  Click "Generate Draft" to create a reply suggestion
                </div>
              )}
            </div>

            {thread.followups?.length > 0 && (
              <>
                <hr />
                <div className="section-title">Follow-ups in this thread</div>
                {thread.followups.map(f => (
                  <div key={f.id} className="followup-item">
                    <span className={`followup-direction dir-${f.direction}`}>{f.direction?.replace(/_/g, ' ')}</span>
                    <div>
                      <div className="text-sm">{f.task_text}</div>
                      {f.due_date && <div className="text-sm text-muted">Due: {f.due_date}</div>}
                      <span className="conf">{f.confidence} confidence</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
