import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Exports({ toast }) {
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.getExports()
      setExports(data)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function exportMarkdown() {
    setExporting(true)
    try {
      const result = await api.exportMarkdown()
      toast(`Wrote ${result.files.length} markdown files`)
      await load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  async function exportObsidian() {
    setExporting(true)
    try {
      const result = await api.exportObsidian()
      if (result.ok) {
        toast(`Wrote ${result.files_written.length} files to vault`)
        await load()
      } else {
        toast(result.error, 'error')
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Exports</h1>
        <p>Export summaries to Markdown or your Obsidian vault. Summaries only by default — never raw message dumps.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="widget">
          <div className="widget-title">↗ Markdown Export</div>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Writes daily digest, follow-ups, and analytics to local <code>.md</code> files in the export folder.
          </p>
          <button className="btn btn-primary" onClick={exportMarkdown} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export Markdown'}
          </button>
        </div>

        <div className="widget">
          <div className="widget-title">◆ Obsidian Export</div>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Writes into <code>/ReplyGraph/</code> in your vault with YAML frontmatter and wiki links.
            Set the vault path in Settings first.
          </p>
          <button className="btn btn-primary" onClick={exportObsidian} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export to Obsidian'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(56,217,160,0.2)' }}>
        <div className="text-sm text-muted">
          <strong style={{ color: 'var(--text)' }}>Export rules:</strong> user-triggered only · summaries by default ·
          confidence labels included · excluded contacts never exported · timestamped.
        </div>
      </div>

      <div className="section-title">Recent Exports</div>
      {loading && <div className="loading">Loading…</div>}
      {!loading && exports.length === 0 && (
        <div className="empty-state">No exports yet.</div>
      )}
      {exports.map(e => (
        <div key={e.id} className="card-sm" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span className="badge badge-source">{e.type}</span>
            <span className="text-sm" style={{ marginLeft: 8, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{e.path}</span>
          </div>
          <span className="text-sm text-muted">{new Date(e.created_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
