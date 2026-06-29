import React, { useEffect, useState } from 'react'
import type { BetterAskRule, BetterAskSettings, PromptCategory } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import { getSettings, saveSettings, getRules, deleteAllMemory, exportMemory, importMemory } from '../shared/storage'
import { createRule, removeRule, toggleRule, editRule } from '../shared/rules'
import { generateId, isoNow } from '../shared/utils'

type Tab = 'general' | 'api' | 'rules' | 'privacy'

const CATEGORIES: PromptCategory[] = ['writing', 'coding', 'research', 'planning', 'data', 'business', 'other']

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: '#EEF2F7' }}>{label}</label>
      {hint && <p className="text-xs" style={{ color: '#7A8899' }}>{hint}</p>}
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg outline-none"
      style={{ background: '#111620', border: '1px solid #1A2030', color: '#EEF2F7', fontFamily: 'monospace' }}
    />
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        onClick={() => onChange(!checked)}
        className="relative inline-flex items-center rounded-full w-10 h-5 transition-colors"
        style={{ background: checked ? '#00E5A0' : '#1A2030', border: '1px solid ' + (checked ? '#00E5A0' : '#222A38') }}
      >
        <span
          className="inline-block w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
      <span className="text-sm" style={{ color: '#EEF2F7' }}>{label}</span>
    </label>
  )
}

export function Options() {
  const [tab, setTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<BetterAskSettings>(DEFAULT_SETTINGS)
  const [rules, setRules] = useState<BetterAskRule[]>([])
  const [saved, setSaved] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [newRuleCat, setNewRuleCat] = useState<PromptCategory>('writing')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    const load = async () => {
      const [s, r] = await Promise.all([getSettings(), getRules()])
      setSettings(s)
      setRules(r)
    }
    load()
  }, [])

  const updateSetting = <K extends keyof BetterAskSettings>(key: K, val: BetterAskSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: val }))
  }

  const handleSave = async () => {
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddRule = async () => {
    if (!newRule.trim()) return
    const r = await createRule(newRuleCat, newRule.trim())
    setRules((prev) => [...prev, r])
    setNewRule('')
  }

  const handleDeleteRule = async (id: string) => {
    await removeRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleToggleRule = async (id: string) => {
    await toggleRule(id)
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return
    await editRule(id, editText.trim())
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, rule: editText.trim() } : r)))
    setEditingId(null)
  }

  const handleExport = async () => {
    const data = await exportMemory()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `betterask-memory-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const data = JSON.parse(text)
      await importMemory(data)
      alert('Memory imported successfully.')
    } catch {
      alert('Invalid file format.')
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('Delete all local memory? This cannot be undone.')) return
    await deleteAllMemory()
    alert('All local memory deleted.')
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'api', label: 'API' },
    { id: 'rules', label: 'Rules' },
    { id: 'privacy', label: 'Privacy' },
  ]

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#00E5A0' }}>BetterAsk</h1>
          <p className="text-xs" style={{ color: '#7A8899', fontFamily: 'monospace' }}>Settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: '#111620', border: '1px solid #1A2030' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-sm rounded-md font-medium transition-all"
            style={tab === t.id
              ? { background: '#1A2030', color: '#EEF2F7' }
              : { color: '#7A8899', background: 'transparent' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div className="space-y-5">
          <Toggle checked={settings.enabled} onChange={(v) => updateSetting('enabled', v)} label="Enable BetterAsk" />
          <Toggle checked={settings.autoAudit} onChange={(v) => updateSetting('autoAudit', v)} label="Auto-audit responses" />
          <Toggle checked={settings.doNotLearnDefault} onChange={(v) => updateSetting('doNotLearnDefault', v)} label="Do not learn from prompts by default" />

          <Field label="Sensitivity" hint="How aggressively BetterAsk flags weak prompts">
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateSetting('sensitivity', s)}
                  className="flex-1 py-2 text-sm rounded-lg capitalize font-medium transition-all"
                  style={settings.sensitivity === s
                    ? { background: '#00E5A0', color: '#060910' }
                    : { background: '#111620', color: '#7A8899', border: '1px solid #1A2030' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Minutes saved per avoided follow-up" hint="Used for time-saved estimates in the dashboard">
            <input
              type="number"
              value={settings.minutesPerAvoidedFollowUp}
              onChange={(e) => updateSetting('minutesPerAvoidedFollowUp', parseFloat(e.target.value) || 1.5)}
              min={0.5}
              max={30}
              step={0.5}
              className="w-32 px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: '#111620', border: '1px solid #1A2030', color: '#EEF2F7', fontFamily: 'monospace' }}
            />
          </Field>
        </div>
      )}

      {/* API */}
      {tab === 'api' && (
        <div className="space-y-5">
          <Toggle checked={!settings.localOnly} onChange={(v) => updateSetting('localOnly', !v)} label="Enable API mode (sends prompt to AI API)" />

          {!settings.localOnly && (
            <div className="rounded-lg p-4 space-y-4" style={{ background: '#111620', border: '1px solid rgba(0,229,160,0.15)' }}>
              <p className="text-xs" style={{ color: '#7A8899' }}>
                Your API key is stored locally and never sent to BetterAsk servers. It is only sent to your configured endpoint.
              </p>
              <Field label="API Key">
                <Input value={settings.apiKey} onChange={(v) => updateSetting('apiKey', v)} type="password" placeholder="sk-..." />
              </Field>
              <Field label="API Endpoint">
                <Input value={settings.apiEndpoint} onChange={(v) => updateSetting('apiEndpoint', v)} placeholder="https://api.openai.com/v1" />
              </Field>
              <Field label="Model">
                <Input value={settings.apiModel} onChange={(v) => updateSetting('apiModel', v)} placeholder="gpt-4o-mini" />
              </Field>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: '#EEF2F7' }}>Second Opinion Model (optional)</p>
            <Field label="Second Opinion API Key">
              <Input value={settings.secondOpinionKey} onChange={(v) => updateSetting('secondOpinionKey', v)} type="password" placeholder="sk-..." />
            </Field>
            <Field label="Second Opinion Endpoint">
              <Input value={settings.secondOpinionEndpoint} onChange={(v) => updateSetting('secondOpinionEndpoint', v)} />
            </Field>
            <Field label="Second Opinion Model">
              <Input value={settings.secondOpinionModel} onChange={(v) => updateSetting('secondOpinionModel', v)} placeholder="gpt-4o" />
            </Field>
          </div>
        </div>
      )}

      {/* Rules */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#7A8899' }}>
            Rules are applied when improving prompts. Add your preferences here.
          </p>

          {/* Add rule */}
          <div className="rounded-lg p-4 space-y-3" style={{ background: '#111620', border: '1px solid #1A2030' }}>
            <div className="flex gap-2">
              <select
                value={newRuleCat}
                onChange={(e) => setNewRuleCat(e.target.value as PromptCategory)}
                className="px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: '#161C28', border: '1px solid #1A2030', color: '#EEF2F7' }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                placeholder="e.g. Always use lowercase SQL keywords"
                className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: '#161C28', border: '1px solid #1A2030', color: '#EEF2F7' }}
              />
              <button
                onClick={handleAddRule}
                className="px-4 py-2 text-sm font-bold rounded-lg"
                style={{ background: '#00E5A0', color: '#060910' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Rule list */}
          {rules.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#3A4455' }}>No rules yet. Add your first rule above.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg p-3 flex items-start gap-3"
                  style={{ background: '#111620', border: '1px solid ' + (r.enabled ? '#1A2030' : '#0C1017'), opacity: r.enabled ? 1 : 0.5 }}
                >
                  <button onClick={() => handleToggleRule(r.id)} style={{ flexShrink: 0, marginTop: '2px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: r.enabled ? '#00E5A0' : '#1A2030', border: '1px solid ' + (r.enabled ? '#00E5A0' : '#222A38') }} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: '10px', background: '#1A2030', color: '#7A8899', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                        {r.category}
                      </span>
                      <span style={{ fontSize: '10px', color: '#3A4455', fontFamily: 'monospace' }}>{r.source}</span>
                    </div>
                    {editingId === r.id ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm rounded outline-none"
                          style={{ background: '#161C28', border: '1px solid #1A2030', color: '#EEF2F7' }}
                        />
                        <button onClick={() => handleSaveEdit(r.id)} style={{ fontSize: '12px', color: '#00E5A0', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ fontSize: '12px', color: '#7A8899', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: '#EEF2F7' }}>{r.rule}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingId(r.id); setEditText(r.rule) }} style={{ fontSize: '11px', color: '#4D9EFF', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteRule(r.id)} style={{ fontSize: '11px', color: '#FF6B6B', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Privacy */}
      {tab === 'privacy' && (
        <div className="space-y-5">
          <div className="rounded-lg p-4 space-y-3" style={{ background: '#111620', border: '1px solid #1A2030' }}>
            <h3 className="text-sm font-bold" style={{ color: '#EEF2F7' }}>Memory</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#7A8899' }}>
              BetterAsk stores prompt events and rules locally in your browser. No data is sent anywhere unless you enable API mode.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleExport} className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-80" style={{ background: '#1A2030', color: '#4D9EFF', border: '1px solid #222A38' }}>
                Export Memory
              </button>
              <label className="px-4 py-2 text-sm rounded-lg cursor-pointer transition-opacity hover:opacity-80" style={{ background: '#1A2030', color: '#7A8899', border: '1px solid #222A38' }}>
                Import Memory
                <input type="file" accept=".json" onChange={handleImport} className="sr-only" />
              </label>
              <button onClick={handleDeleteAll} className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-80" style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.2)' }}>
                Delete All Memory
              </button>
            </div>
          </div>

          <div className="rounded-lg p-4 text-xs space-y-2 leading-relaxed" style={{ background: '#111620', border: '1px solid #1A2030', color: '#7A8899' }}>
            <p>• No analytics. No third-party tracking.</p>
            <p>• API keys stored only in chrome.storage.local.</p>
            <p>• No data leaves your browser unless API mode is enabled.</p>
            <p>• API mode sends prompts to your configured endpoint only.</p>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 text-sm font-bold rounded-lg transition-all"
          style={{ background: '#00E5A0', color: '#060910' }}
        >
          {saved ? 'Saved ✓' : 'Save Settings'}
        </button>
        {saved && <span className="text-xs" style={{ color: '#00E5A0' }}>Settings saved!</span>}
      </div>
    </div>
  )
}
