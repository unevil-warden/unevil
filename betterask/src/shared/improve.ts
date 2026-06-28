import type { BetterAskRule, BetterAskSettings, ImproveResult } from './types'
import { heuristicImprove } from './heuristics'
import { apiImprove } from './api'

export async function improvePrompt(
  original: string,
  settings: BetterAskSettings,
  rules: BetterAskRule[]
): Promise<ImproveResult> {
  if (!settings.localOnly && settings.apiKey) {
    try {
      return await apiImprove(original, rules, settings.apiEndpoint, settings.apiKey, settings.apiModel)
    } catch (err) {
      console.warn('[BetterAsk] API improve failed, falling back to heuristic:', err)
    }
  }

  const result = heuristicImprove(original)
  if (result) return result

  // Append missing pieces as a prompt suffix using active rules
  const applicable = rules.filter((r) => r.enabled).slice(0, 3)
  const suffix =
    applicable.length > 0
      ? `\n\nApply these preferences:\n${applicable.map((r) => `- ${r.rule}`).join('\n')}`
      : ''

  return {
    betterAsk: `${original.trim()}${suffix}\n\nBe specific. Return only the result, no preamble.`,
    why: 'Added specificity reminder and applied your saved rules.',
    category: 'other',
    confidence: 0.4,
    missingPieces: ['output format', 'specific goal'],
  }
}
