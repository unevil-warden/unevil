import type { BetterAskRule, PromptEvent, PromptCategory } from './types'
import { getEvents } from './storage'
import { createRule } from './rules'

interface PatternSuggestion {
  category: PromptCategory
  rule: string
  count: number
}

function extractPhrases(texts: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'])

  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w))
    // bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`
      freq.set(bigram, (freq.get(bigram) ?? 0) + 1)
    }
  }

  return freq
}

export async function detectLearnedRuleSuggestions(): Promise<PatternSuggestion[]> {
  const events = await getEvents()
  const THRESHOLD = 3

  // Focus on edited prompts — user manually improved them
  const editedByCategory = new Map<PromptCategory, string[]>()
  for (const e of events) {
    if (e.userAction === 'edited' && e.editedPrompt) {
      const arr = editedByCategory.get(e.category) ?? []
      arr.push(e.editedPrompt)
      editedByCategory.set(e.category, arr)
    }
  }

  const suggestions: PatternSuggestion[] = []

  for (const [category, edits] of editedByCategory) {
    if (edits.length < THRESHOLD) continue

    const phrases = extractPhrases(edits)
    for (const [phrase, count] of phrases) {
      if (count >= THRESHOLD) {
        suggestions.push({
          category,
          rule: `For ${category} requests: include "${phrase}" in the prompt.`,
          count,
        })
      }
    }

    // Missing-pieces aggregation
    const missingAgg = new Map<string, number>()
    for (const e of events) {
      if (e.category === category) {
        // missingPieces stored in improvedPrompt metadata — approximate via editedPrompt diff
        // This is a simple heuristic: if user edited and added specific words
      }
    }
  }

  return suggestions
}

export async function createLearnedRule(suggestion: PatternSuggestion): Promise<BetterAskRule> {
  return createRule(suggestion.category, suggestion.rule, 'learned')
}
