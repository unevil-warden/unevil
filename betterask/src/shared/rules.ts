import type { BetterAskRule, PromptCategory } from './types'
import { generateId, isoNow } from './utils'
import { addRule, deleteRule, getRules, updateRule } from './storage'

export async function createRule(
  category: PromptCategory,
  rule: string,
  source: BetterAskRule['source'] = 'manual'
): Promise<BetterAskRule> {
  const now = isoNow()
  const newRule: BetterAskRule = {
    id: generateId(),
    category,
    rule,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    source,
    enabled: true,
  }
  await addRule(newRule)
  return newRule
}

export async function toggleRule(id: string): Promise<void> {
  const rules = await getRules()
  const r = rules.find((r) => r.id === id)
  if (r) await updateRule(id, { enabled: !r.enabled })
}

export async function removeRule(id: string): Promise<void> {
  await deleteRule(id)
}

export async function editRule(id: string, rule: string): Promise<void> {
  await updateRule(id, { rule, updatedAt: isoNow() })
}

export async function incrementRuleUsage(id: string): Promise<void> {
  const rules = await getRules()
  const r = rules.find((r) => r.id === id)
  if (r) await updateRule(id, { usageCount: r.usageCount + 1 })
}
