import { useState, useEffect } from 'react'
import { api } from '../api.js'

const STATUS_TAG = {
  draft: ['flag', 'draft'], submitted: ['good', 'applied'],
  interviewing: ['pop', 'interviewing'], offer: ['good', 'offer'], rejected: ['flag', 'rejected'],
}

export default function Applications({ ctx }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  function load() {
    api.getApplications().then(setApps).catch(e => ctx.toast(e.message, 'error')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [ctx.refreshKey])

  async function approve(id) {
    setBusy(id)
    try { const r = await api.approveApplication(id); ctx.toast(r.note || 'Marked applied'); load(); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  return (
    <div className="wrap">
      <div className="head">
        <div className="eyebrow">Applications</div>
        <h2>Your pipeline</h2>
        <p>{apps.length} application{apps.length === 1 ? '' : 's'} · drafts wait for your approval before anything is submitted</p>
      </div>

      {loading ? <div className="loading">Loading…</div> : apps.length === 0 ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>No applications yet</h3>
          <p className="muted sm">Draft one from the Jobs tab.</p>
        </div>
      ) : (
        apps.map(a => {
          const [cls, lbl] = STATUS_TAG[a.status] || ['', a.status]
          return (
            <div className="panel jcard" key={a.id}>
              <div className="j-top">
                <div>
                  <div className="j-title">{a.job_title}</div>
                  <div className="j-sub">{a.job_company}</div>
                </div>
                {a.status === 'draft'
                  ? <button className="btn good sm" disabled={busy === a.id} onClick={() => approve(a.id)}>{busy === a.id ? '…' : 'Approve & apply'}</button>
                  : <span className={`tag ${cls}`}>{lbl}</span>}
              </div>
              <div className="j-meta">
                {a.status === 'draft' && <span className={`tag ${cls}`}>{lbl}</span>}
                <span className="tag">{a.apply_method === 'email' ? 'email apply' : 'web apply'}</span>
                {a.mode && <span className="tag">{a.mode}</span>}
              </div>
              {a.draft_cover_letter && (
                <div className="draft-card" style={{ marginTop: 14 }}>
                  <div className="draft-pre">{a.draft_cover_letter}</div>
                </div>
              )}
              {a.draft_notes && <div className="j-reason">Notes: {a.draft_notes}</div>}
              {a.status === 'submitted' && a.apply_method === 'email' && (
                <div className="notice">
                  {a.gmail_draft_id
                    ? <><b>Gmail draft created</b> for you to review and send — nothing was sent automatically.</>
                    : <><b>Email-apply role:</b> review the cover letter above and send it yourself.</>}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
