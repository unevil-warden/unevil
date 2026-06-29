import type { ImproveResult, PromptCategory, Sensitivity } from './types'

interface HeuristicPattern {
  pattern: RegExp
  category: PromptCategory
  betterAsk: (original: string) => string
  why: string
  missingPieces: string[]
}

const PATTERNS: HeuristicPattern[] = [
  {
    pattern: /^(make\s+this\s+better|improve\s+this|make\s+it\s+better)\s*[.!?]?$/i,
    category: 'writing',
    betterAsk: () =>
      'Rewrite the following text to be concise, natural, and direct. Remove filler phrases and AI-sounding language. Keep the same meaning. Return only the rewritten version, no commentary.',
    why: 'Added output goal (concise, natural), format (rewritten only), and a clarity constraint.',
    missingPieces: ['target tone', 'output format', 'what "better" means'],
  },
  {
    pattern: /^(fix\s+this|correct\s+this|please\s+fix)\s*[.!?]?$/i,
    category: 'writing',
    betterAsk: () =>
      'Identify the issue in the following text, briefly explain it in one sentence, then return the corrected version in a separate block.',
    why: 'Clarified the expected output structure: explanation + corrected version.',
    missingPieces: ['what kind of fix (grammar, logic, clarity)', 'output format'],
  },
  {
    pattern: /^(help\s+me\s+debug|debug\s+this|debug)\s*[.!?]?$/i,
    category: 'coding',
    betterAsk: () =>
      'Diagnose the root cause of this bug. Provide: (1) the likely cause in one sentence, (2) the smallest safe fix as a code block, (3) how to verify the fix works.',
    why: 'Structured the output into three actionable parts: cause, fix, verification.',
    missingPieces: ['language/framework', 'error message or symptoms', 'expected vs actual behavior'],
  },
  {
    pattern: /^(write\s+sql|sql\s+query|generate\s+sql|create\s+sql)\s*[.!?]?$/i,
    category: 'data',
    betterAsk: () =>
      'Write a compile-safe SQL query for the following requirement. Use only the schema provided. Return one copyable SQL block. Use lowercase keywords. Add minimal comments only where logic is non-obvious.',
    why: 'Added safety (compile-safe, schema-only), format (lowercase, one block), and comment guidance.',
    missingPieces: ['schema definition', 'database type (PostgreSQL, MySQL, T-SQL)', 'specific query goal'],
  },
  {
    pattern: /^(make\s+a\s+(deck|presentation|slides?)|create\s+(slides?|a\s+deck|a\s+presentation))\s*[.!?]?$/i,
    category: 'planning',
    betterAsk: () =>
      'Create a slide deck outline for the following topic. Format: slide title, 3–4 concise bullets per slide, speaker note if context helps. Narrative should flow logically. Avoid jargon. Aim for 8–12 slides.',
    why: 'Specified format, slide count, content density, and narrative expectation.',
    missingPieces: ['audience', 'topic', 'slide count preference', 'presentation length'],
  },
  {
    pattern: /^(analyze\s+this|do\s+an\s+analysis|analyze|analysis)\s*[.!?]?$/i,
    category: 'business',
    betterAsk: () =>
      'Analyze the following content. Structure your response as: (1) Key findings (3–5 bullets), (2) Risks or concerns, (3) Actionable recommendations, (4) One-sentence summary.',
    why: 'Replaced vague "analyze" with a structured 4-part output format.',
    missingPieces: ['what aspect to analyze', 'audience for the analysis', 'action to be taken'],
  },
  {
    pattern: /^(summarize(\s+this)?|give\s+me\s+a\s+summary|tldr)\s*[.!?]?$/i,
    category: 'research',
    betterAsk: () =>
      'Summarize the following content in 3–5 sentences. Capture the main point, key supporting details, and any action items. Omit filler. Write for a reader who needs to act on this.',
    why: 'Added length constraint, structure, and purpose (actionable summary).',
    missingPieces: ['desired summary length', 'audience', 'what to prioritize'],
  },
  {
    pattern: /^(explain\s+this|explain\s+it(\s+to\s+me)?|what\s+does\s+this\s+mean)\s*[.!?]?$/i,
    category: 'research',
    betterAsk: () =>
      'Explain the following clearly and concisely. Assume the reader is intelligent but unfamiliar with the topic. Use plain language. If technical terms are unavoidable, define them briefly.',
    why: 'Defined audience, tone, and expectation for plain-language explanation.',
    missingPieces: ['audience knowledge level', 'desired depth of explanation'],
  },
  {
    pattern: /^(clean\s+this\s+up|clean\s+up(\s+this)?|tidy\s+this\s+up)\s*[.!?]?$/i,
    category: 'writing',
    betterAsk: () =>
      'Edit the following for clarity and conciseness. Fix grammar, remove redundancy, and smooth awkward phrasing. Preserve the original meaning and voice. Return only the cleaned version.',
    why: 'Specified what "clean up" means: grammar, conciseness, voice preservation.',
    missingPieces: ['tone to preserve', 'specific issues (grammar, structure, length)'],
  },
  {
    pattern: /^(write\s+(some\s+)?(code|a\s+function|a\s+script)|code\s+this|implement\s+this)\s*[.!?]?$/i,
    category: 'coding',
    betterAsk: () =>
      'Write clean, working code for the following requirement. Include: the implementation, brief inline comments for non-obvious logic, and a usage example. State any assumptions.',
    why: 'Added completeness requirements: implementation, comments, usage example, assumptions.',
    missingPieces: ['programming language', 'framework/library', 'input/output specification', 'error handling needs'],
  },
]

const WEAK_SIGNAL_WORDS = [
  'make this',
  'fix this',
  'help me',
  'do this',
  'write this',
  'clean this',
  'improve this',
  'analyze',
  'summarize',
  'explain',
  'create',
  'make a',
  'write sql',
  'debug',
]

export function isWeakPrompt(text: string, sensitivity: Sensitivity): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 3) return false

  if (sensitivity === 'high') {
    if (trimmed.length < 60) return true
    const wordCount = trimmed.split(/\s+/).length
    if (wordCount < 8) return true
  }

  for (const pattern of PATTERNS) {
    if (pattern.pattern.test(trimmed)) return true
  }

  const lower = trimmed.toLowerCase()
  const matchedWeakWord = WEAK_SIGNAL_WORDS.some((w) => lower.startsWith(w))
  const isShort = trimmed.length < 50

  if (sensitivity === 'medium') return matchedWeakWord && isShort
  if (sensitivity === 'low') return matchedWeakWord && trimmed.length < 25

  return false
}

export function heuristicImprove(original: string): ImproveResult | null {
  const trimmed = original.trim()

  for (const p of PATTERNS) {
    if (p.pattern.test(trimmed)) {
      return {
        betterAsk: p.betterAsk(trimmed),
        why: p.why,
        category: p.category,
        confidence: 0.75,
        missingPieces: p.missingPieces,
      }
    }
  }

  // Generic fallback for short/vague prompts
  if (trimmed.length < 60) {
    return {
      betterAsk: `${trimmed}\n\nPlease be specific: state the goal, desired output format, and any constraints. Return only the result, no preamble.`,
      why: 'The request is short and missing key details: output format, goal, and constraints.',
      category: 'other',
      confidence: 0.5,
      missingPieces: ['output format', 'specific goal', 'constraints or requirements'],
    }
  }

  return null
}
