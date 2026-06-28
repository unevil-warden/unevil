import type { BetterAskRule, ImproveResult, ResponseAudit } from './types'
import { generateId, isoNow } from './utils'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function chatCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  const url = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 1000 }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

function parseJSON<T>(text: string): T | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    return null
  }
}

export async function apiImprove(
  original: string,
  rules: BetterAskRule[],
  endpoint: string,
  apiKey: string,
  model: string
): Promise<ImproveResult> {
  const enabledRules = rules.filter((r) => r.enabled).map((r) => `- ${r.rule}`)
  const rulesText = enabledRules.length > 0 ? enabledRules.join('\n') : 'No saved rules yet.'

  const system = `You are BetterAsk, an AI prompt autocorrect system.

Your job is to rewrite the user's rough request into the clearest possible instruction that will get the desired result faster.

Rules:
- Do not answer the request.
- Only improve the request.
- Preserve the user's intent.
- Make it specific, concise, and actionable.
- Add output format, tone, constraints, and missing context when obvious.
- Do not overdo it.
- Use the user's saved rules when relevant.
- Avoid unsupported claims.
- Return JSON only.

Return:
{
  "betterAsk": "...",
  "why": "...",
  "category": "writing | coding | research | planning | data | business | other",
  "confidence": 0.0-1.0,
  "missingPieces": ["..."]
}

User saved rules:
${rulesText}

Original request:
${original}`

  const text = await chatCompletion(endpoint, apiKey, model, [{ role: 'user', content: system }])
  const parsed = parseJSON<ImproveResult>(text)

  if (!parsed?.betterAsk) {
    throw new Error('API returned unexpected format')
  }

  return {
    betterAsk: parsed.betterAsk,
    why: parsed.why ?? 'API improvement applied.',
    category: parsed.category ?? 'other',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
    missingPieces: Array.isArray(parsed.missingPieces) ? parsed.missingPieces : [],
  }
}

export async function apiAuditResponse(
  prompt: string,
  response: string,
  endpoint: string,
  apiKey: string,
  model: string
): Promise<ResponseAudit> {
  const system = `You are BetterAsk Response Auditor.

Audit the model response for quality. Do not answer the original request unless suggesting a correction prompt.

Score:
- clarity,
- format compliance,
- missing context,
- unsupported claims risk,
- usefulness,
- whether it likely needs follow-up.

Return JSON only:
{
  "qualityScore": 0-100,
  "clarityScore": 0-100,
  "formatComplianceScore": 0-100,
  "likelyHallucinationRisk": "low | medium | high",
  "issues": ["..."],
  "suggestedFixes": ["..."],
  "recommendedFollowUpPrompt": "...",
  "shouldRunSecondOpinion": true
}

Original prompt:
${prompt}

Model response:
${response}`

  const text = await chatCompletion(endpoint, apiKey, model, [{ role: 'user', content: system }])
  const parsed = parseJSON<Partial<ResponseAudit>>(text)

  return {
    id: generateId(),
    createdAt: isoNow(),
    responseText: response,
    qualityScore: parsed?.qualityScore ?? 70,
    clarityScore: parsed?.clarityScore ?? 70,
    formatComplianceScore: parsed?.formatComplianceScore ?? 70,
    likelyHallucinationRisk: parsed?.likelyHallucinationRisk ?? 'low',
    issues: parsed?.issues ?? [],
    suggestedFixes: parsed?.suggestedFixes ?? [],
    recommendedFollowUpPrompt: parsed?.recommendedFollowUpPrompt,
    shouldRunSecondOpinion: parsed?.shouldRunSecondOpinion ?? false,
  }
}
