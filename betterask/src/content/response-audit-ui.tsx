import React, { useState } from 'react'
import type { ResponseAudit } from '../shared/types'

interface ResponseAuditUIProps {
  audit: ResponseAudit
  onClose: () => void
}

const RISK_COLOR: Record<ResponseAudit['likelyHallucinationRisk'], string> = {
  low: '#00E5A0',
  medium: '#F5C518',
  high: '#FF6B6B',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? '#00E5A0' : value >= 50 ? '#F5C518' : '#FF6B6B'
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A8899', marginBottom: '3px', fontFamily: 'monospace' }}>
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: '4px', background: '#1A2030', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export function ResponseAuditUI({ audit, onClose }: ResponseAuditUIProps) {
  const [expanded, setExpanded] = useState(false)

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    width: '360px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '80vh',
    overflowY: 'auto',
    zIndex: 2147483647,
    background: '#111620',
    border: '1px solid #1A2030',
    borderRadius: '14px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#EEF2F7',
    pointerEvents: 'auto',
  }

  return (
    <div style={overlayStyle}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1A2030', background: '#0C1017', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#4D9EFF' }}>Response Audit</span>
          <span style={{ fontSize: '11px', background: '#1A2030', color: '#7A8899', borderRadius: '4px', padding: '2px 7px', fontFamily: 'monospace' }}>
            Quality {audit.qualityScore}/100
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#3A4455', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Scores */}
        <ScoreBar label="Quality" value={audit.qualityScore} />
        <ScoreBar label="Clarity" value={audit.clarityScore} />
        <ScoreBar label="Format Compliance" value={audit.formatComplianceScore} />

        {/* Hallucination risk */}
        <div style={{ margin: '12px 0', padding: '8px 12px', background: '#161C28', borderRadius: '8px', border: `1px solid ${RISK_COLOR[audit.likelyHallucinationRisk]}22` }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7A8899' }}>Hallucination Risk: </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: RISK_COLOR[audit.likelyHallucinationRisk] }}>
            {audit.likelyHallucinationRisk.toUpperCase()}
          </span>
        </div>

        {/* Issues */}
        {audit.issues.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FF6B6B', marginBottom: '6px' }}>Issues</div>
            {audit.issues.map((issue, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#7A8899', lineHeight: 1.5, marginBottom: '4px' }}>
                • {issue}
              </div>
            ))}
          </div>
        )}

        {/* Suggested fixes */}
        {audit.suggestedFixes.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00E5A0', marginBottom: '6px' }}>Suggestions</div>
            {audit.suggestedFixes.map((fix, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#7A8899', lineHeight: 1.5, marginBottom: '4px' }}>
                → {fix}
              </div>
            ))}
          </div>
        )}

        {/* Follow-up prompt */}
        {audit.recommendedFollowUpPrompt && (
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4D9EFF', marginBottom: '6px' }}>Follow-up Prompt</div>
            <div
              style={{ fontSize: '12px', color: '#EEF2F7', background: '#161C28', border: '1px solid #1A2030', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6, cursor: 'pointer' }}
              onClick={() => {
                navigator.clipboard.writeText(audit.recommendedFollowUpPrompt ?? '').catch(() => {})
              }}
              title="Click to copy"
            >
              {expanded ? audit.recommendedFollowUpPrompt : audit.recommendedFollowUpPrompt.slice(0, 120) + (audit.recommendedFollowUpPrompt.length > 120 ? '…' : '')}
            </div>
            {audit.recommendedFollowUpPrompt.length > 120 && (
              <button onClick={() => setExpanded(!expanded)} style={{ fontSize: '11px', color: '#4D9EFF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'monospace' }}>
                {expanded ? 'show less' : 'show more'}
              </button>
            )}
          </div>
        )}

        {audit.shouldRunSecondOpinion && (
          <div style={{ marginTop: '12px', padding: '8px 12px', background: '#1A2030', borderRadius: '8px', fontSize: '12px', color: '#F5C518', border: '1px solid rgba(245,197,24,0.2)' }}>
            ⚠ Second opinion recommended — enable it in Settings.
          </div>
        )}
      </div>
    </div>
  )
}
