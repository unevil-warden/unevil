import type { BetterAskRule, BetterAskSettings, PromptEvent } from './types'
import { DEFAULT_SETTINGS } from './types'

const KEYS = {
  settings: 'ba_settings',
  events: 'ba_events',
  rules: 'ba_rules',
} as const

function get<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key]))
  })
}

function set(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<BetterAskSettings> {
  const stored = await get<Partial<BetterAskSettings>>(KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: BetterAskSettings): Promise<void> {
  await set(KEYS.settings, settings)
}

export async function updateSettings(patch: Partial<BetterAskSettings>): Promise<void> {
  const current = await getSettings()
  await saveSettings({ ...current, ...patch })
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<PromptEvent[]> {
  return (await get<PromptEvent[]>(KEYS.events)) ?? []
}

export async function appendEvent(event: PromptEvent): Promise<void> {
  const events = await getEvents()
  events.push(event)
  // Cap at 2000 events (FIFO)
  const trimmed = events.length > 2000 ? events.slice(events.length - 2000) : events
  await set(KEYS.events, trimmed)
}

export async function clearEvents(): Promise<void> {
  await set(KEYS.events, [])
}

// ── Rules ─────────────────────────────────────────────────────────────────────

export async function getRules(): Promise<BetterAskRule[]> {
  return (await get<BetterAskRule[]>(KEYS.rules)) ?? []
}

export async function saveRules(rules: BetterAskRule[]): Promise<void> {
  await set(KEYS.rules, rules)
}

export async function addRule(rule: BetterAskRule): Promise<void> {
  const rules = await getRules()
  rules.push(rule)
  await saveRules(rules)
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules()
  await saveRules(rules.filter((r) => r.id !== id))
}

export async function updateRule(id: string, patch: Partial<BetterAskRule>): Promise<void> {
  const rules = await getRules()
  await saveRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))
}

// ── Export / import ───────────────────────────────────────────────────────────

export async function exportMemory(): Promise<object> {
  return {
    events: await getEvents(),
    rules: await getRules(),
    exportedAt: new Date().toISOString(),
  }
}

export async function importMemory(data: { events?: PromptEvent[]; rules?: BetterAskRule[] }): Promise<void> {
  if (data.events) await set(KEYS.events, data.events)
  if (data.rules) await set(KEYS.rules, data.rules)
}

export async function deleteAllMemory(): Promise<void> {
  await clearEvents()
  await saveRules([])
}
