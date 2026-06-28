import React, { useEffect, useState } from 'react'
import type { UsageReport, BetterAskRule } from '../shared/types'
import { getSettings } from '../shared/storage'
import { generateReport } from '../shared/reports'
import { formatMinutes } from '../shared/utils'
import { detectLearnedRuleSuggestions, createLearnedRule } from '../shared/learning'
import { getRules } from '../shared/storage'
import { deleteAllMemory } from '../shared/storage'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

function StatCard({ label, value, sub, accent = '#00E5A0' }: StatCardProps) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#111620', border: '1px solid #1A2030' }}>
      <div className="text-2xl font-bold font-mono mb-1" style={{ color: accent }}>{value}</div>
      <div className="text-sm font-medium" style={{ color: '#EEF2F7' }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: '#3A4455' }}>{sub}</div>}
    </div>
  )
}

function AcceptanceBar({ accepted, edited, rejected }: { accepted: number; edited: number; rejected: number }) {
  const total = accepted + edited + rejected || 1
  const bars = [
    { label: 'Accepted', count: accepted, color: '#00E5A0' },
    { label: 'Edited', count: edited, color: '#4D9EFF' },
    { label: 'Rejected', count: rejected, color: '#FF6B6B' },
  ]
  return (
    <div className="rounded-xl p-5 space-y-3" style={{ background: '#111620', border: '1px solid #1A2030' }}>
      <div className="text-sm font-medium" style={{ color: '#EEF2F7' }}>Suggestion Outcomes</div>
      <div className="flex rounded-full overflow-hidden h-3">
        {bars.map(({ count, color }) => (
          <div key={color} style={{ width: `${(count / total) * 100}%`, background: color, minWidth: count > 0 ? '4px' : '0' }} />
        ))}
      </div>
      <div className="flex gap-4">
        {bars.map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: '#7A8899' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}: <span style={{ color: '#EEF2F7' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const [report, setReport] = useState<UsageReport | null>(null)
  const [rules, setRules] = useState<BetterAskRule[]>([])
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof detectLearnedRuleSuggestions>>>([])
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    const [settings, rep, r, sugg] = await Promise.all([
      getSettings(),
      generateReport(),
      getRules(),
      detectLearnedRuleSuggestions(),
    ])
    const repWithMinutes = await generateReport(settings.minutesPerAvoidedFollowUp)
    setReport(repWithMinutes)
    setRules(r)
    setSuggestions(sugg)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const handleApproveRule = async (sugg: (typeof suggestions)[0]) => {
    await createLearnedRule(sugg)
    setSuggestions((prev) => prev.filter((s) => s !== sugg))
    loadAll()
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all prompt history? Rules will be kept.')) return
    await deleteAllMemory()
    loadAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: '#7A8899' }}>Loading dashboard…</div>
      </div>
    )
  }

  if (!report) return null

  const isEmpty = report.promptsObserved === 0

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✨</span>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#00E5A0' }}>BetterAsk</h1>
            <p className="text-sm" style={{ color: '#7A8899', fontFamily: 'monospace' }}>Local Dashboard</p>
          </div>
        </div>
        {!isEmpty && (
          <button onClick={handleClearAll} className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-70" style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.2)' }}>
            Clear History
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="text-center py-20 space-y-4">
          <div className="text-5xl">🤖</div>
          <div className="text-lg font-medium" style={{ color: '#7A8899' }}>No prompt history yet</div>
          <div className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: '#3A4455' }}>
            Start using BetterAsk on ChatGPT, Claude, Perplexity, or Gemini. When you improve a prompt, it will appear here.
          </div>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div>
            <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#3A4455' }}>Overview</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Prompts Observed" value={report.promptsObserved} />
              <StatCard label="Prompts Improved" value={report.promptsImproved} sub={`${Math.round((report.promptsImproved / Math.max(report.promptsObserved, 1)) * 100)}% of total`} />
              <StatCard label="Est. Tokens Saved" value={report.estimatedTokensSaved.toLocaleString()} sub="Rough estimate (chars/4)" accent="#4D9EFF" />
              <StatCard label="Est. Time Saved" value={formatMinutes(report.estimatedMinutesSaved)} sub="Based on avoided follow-ups" accent="#F5C518" />
            </div>
          </div>

          {/* Outcomes */}
          <AcceptanceBar
            accepted={report.acceptedCount}
            edited={report.editedCount}
            rejected={report.rejectedCount}
          />

          {/* Learned rule suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#F5C518' }}>Suggested Rules (from your patterns)</div>
              <div className="space-y-2">
                {suggestions.map((sugg, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ background: '#111620', border: '1px solid rgba(245,197,24,0.2)' }}>
                    <div className="flex-1">
                      <span className="text-xs font-mono mr-2" style={{ color: '#F5C518', textTransform: 'uppercase' }}>{sugg.category}</span>
                      <span className="text-sm" style={{ color: '#EEF2F7' }}>{sugg.rule}</span>
                      <span className="text-xs ml-2" style={{ color: '#3A4455' }}>seen {sugg.count}×</span>
                    </div>
                    <button onClick={() => handleApproveRule(sugg)} className="px-3 py-1.5 text-xs font-bold rounded-lg" style={{ background: '#00E5A0', color: '#060910' }}>
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top failure categories */}
          {report.topFailureCategories.length > 0 && (
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#3A4455' }}>Top Prompt Failure Categories</div>
              <div className="space-y-2">
                {report.topFailureCategories.map(({ label, count }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs font-mono w-20 capitalize" style={{ color: '#7A8899' }}>{label}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#111620' }}>
                      <div style={{ height: '100%', width: `${(count / report.topFailureCategories[0].count) * 100}%`, background: '#FF6B6B', borderRadius: '2px' }} />
                    </div>
                    <span className="text-xs font-mono w-6 text-right" style={{ color: '#7A8899' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best rules */}
          {rules.length > 0 && (
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: '#3A4455' }}>Your Saved Rules</div>
              <div className="space-y-2">
                {rules.filter((r) => r.enabled).slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg p-3" style={{ background: '#111620', border: '1px solid #1A2030' }}>
                    <span style={{ fontSize: '10px', background: '#1A2030', color: '#7A8899', borderRadius: '3px', padding: '2px 7px', fontFamily: 'monospace', textTransform: 'uppercase', flexShrink: 0, marginTop: '2px' }}>
                      {r.category}
                    </span>
                    <p className="text-sm flex-1" style={{ color: '#EEF2F7' }}>{r.rule}</p>
                    {r.usageCount > 0 && (
                      <span className="text-xs font-mono" style={{ color: '#3A4455', flexShrink: 0 }}>×{r.usageCount}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="rounded-xl p-5 space-y-2" style={{ background: '#111620', border: '1px solid rgba(0,229,160,0.15)' }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: '#00E5A0' }}>Recommendations</div>
              {report.recommendations.map((rec, i) => (
                <p key={i} className="text-sm" style={{ color: '#7A8899', lineHeight: 1.6 }}>→ {rec}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-center" style={{ color: '#3A4455', fontFamily: 'monospace' }}>
            Token and time estimates are approximate. Estimates assume ~1 follow-up avoided per accepted suggestion.
          </p>
        </>
      )}
    </div>
  )
}
