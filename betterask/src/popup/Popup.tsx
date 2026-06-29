import React, { useEffect, useState } from 'react'
import type { BetterAskSettings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import { getSettings, updateSettings, getEvents, getRules } from '../shared/storage'
import { generateReport } from '../shared/reports'
import { formatMinutes } from '../shared/utils'

const SUPPORTED_SITES = ['chatgpt.com', 'claude.ai', 'perplexity.ai', 'gemini.google.com']

function getCurrentTabHost(): Promise<string> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        resolve(new URL(tabs[0]?.url ?? '').hostname)
      } catch {
        resolve('')
      }
    })
  })
}

export function Popup() {
  const [settings, setSettings] = useState<BetterAskSettings>(DEFAULT_SETTINGS)
  const [host, setHost] = useState('')
  const [stats, setStats] = useState({ events: 0, rules: 0, minutesSaved: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [s, h, events, rules, report] = await Promise.all([
        getSettings(),
        getCurrentTabHost(),
        getEvents(),
        getRules(),
        generateReport(),
      ])
      setSettings(s)
      setHost(h)
      setStats({ events: events.length, rules: rules.length, minutesSaved: report.estimatedMinutesSaved })
      setLoading(false)
    }
    load()
  }, [])

  const isSupported = SUPPORTED_SITES.some((s) => host.includes(s))

  const toggleEnabled = async () => {
    const next = !settings.enabled
    const updated = { ...settings, enabled: next }
    setSettings(updated)
    await updateSettings({ enabled: next })
  }

  const openOptions = () => chrome.runtime.openOptionsPage()
  const openDashboard = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 text-gray-500 text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4" style={{ background: '#060910', minHeight: '260px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="text-sm font-bold" style={{ color: '#00E5A0' }}>BetterAsk</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#111620', color: '#3A4455', border: '1px solid #1A2030', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            v0.1
          </span>
        </div>

        {/* Toggle */}
        <button
          onClick={toggleEnabled}
          className="relative inline-flex items-center rounded-full w-10 h-5 transition-colors duration-200"
          style={{ background: settings.enabled ? '#00E5A0' : '#1A2030' }}
        >
          <span
            className="inline-block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: settings.enabled ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
      </div>

      {/* Site status */}
      <div className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded" style={{ background: '#111620', border: '1px solid #1A2030' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSupported ? '#00E5A0' : '#3A4455', flexShrink: 0, display: 'inline-block' }} />
        <span style={{ color: isSupported ? '#7A8899' : '#3A4455' }}>
          {host || 'No active tab'}{isSupported ? ' — supported' : ' — not supported'}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: stats.events, label: 'Prompts\ntracked' },
          { n: stats.rules, label: 'Saved\nrules' },
          { n: formatMinutes(stats.minutesSaved), label: 'Est. time\nsaved' },
        ].map(({ n, label }) => (
          <div key={label} className="text-center rounded-lg p-2" style={{ background: '#111620', border: '1px solid #1A2030' }}>
            <div className="text-sm font-bold font-mono" style={{ color: '#00E5A0' }}>{n}</div>
            <div className="text-xs leading-tight mt-0.5 whitespace-pre-line" style={{ color: '#7A8899', fontSize: '10px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={openDashboard}
          className="w-full text-sm rounded-lg py-2.5 font-medium transition-opacity hover:opacity-80"
          style={{ background: '#111620', color: '#4D9EFF', border: '1px solid #1A2030' }}
        >
          Open Dashboard
        </button>
        <button
          onClick={openOptions}
          className="w-full text-sm rounded-lg py-2.5 font-medium transition-opacity hover:opacity-80"
          style={{ background: '#111620', color: '#7A8899', border: '1px solid #1A2030' }}
        >
          Settings
        </button>
      </div>

      {!settings.enabled && (
        <div className="text-xs text-center" style={{ color: '#3A4455', fontStyle: 'italic' }}>
          BetterAsk is paused. Toggle above to resume.
        </div>
      )}
    </div>
  )
}
