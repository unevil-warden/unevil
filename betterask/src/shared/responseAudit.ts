import type { ResponseAudit, BetterAskSettings } from './types'
import { apiAuditResponse } from './api'
import { generateId, isoNow } from './utils'

function localAudit(prompt: string, response: string): ResponseAudit {
  const issues: string[] = []
  const suggestedFixes: string[] = []

  const wordCount = response.split(/\s+/).length
  const hasCodeBlock = response.includes('```')
  const hasBullets = /^[-*•]\s/m.test(response)
  const hasNumbered = /^\d+\.\s/m.test(response)
  const asksForClarification = /\b(could you|can you|please (specify|clarify|provide)|what (do you|exactly))/i.test(response)
  const containsHedging = (response.match(/\b(might|may|could|possibly|perhaps|I think|I believe|not sure)\b/gi) ?? []).length

  let qualityScore = 75
  let clarityScore = 75
  let formatCompliance = 75
  let hallucinationRisk: ResponseAudit['likelyHallucinationRisk'] = 'low'

  if (asksForClarification) {
    issues.push('Response asks for clarification — the prompt may have been too vague.')
    suggestedFixes.push('Restate the request with more specific context.')
    qualityScore -= 15
  }

  if (wordCount > 800) {
    issues.push('Response is very long and may contain unnecessary content.')
    suggestedFixes.push('Ask the model to summarize in fewer words or bullet points.')
    qualityScore -= 10
    clarityScore -= 10
  }

  if (containsHedging > 5) {
    issues.push('Response uses excessive hedging language, reducing confidence.')
    hallucinationRisk = 'medium'
    qualityScore -= 10
  }

  if (containsHedging > 10) {
    hallucinationRisk = 'high'
    issues.push('High number of uncertainty markers — verify key claims.')
    suggestedFixes.push('Ask the model to state what it knows with confidence and flag unknowns explicitly.')
  }

  const promptAskedForCode = /\b(code|function|script|sql|implement|write)\b/i.test(prompt)
  if (promptAskedForCode && !hasCodeBlock) {
    issues.push('Response does not include a code block despite the prompt asking for code.')
    suggestedFixes.push('Ask the model to return the code in a fenced code block.')
    formatCompliance -= 20
  }

  const promptAskedForList = /\b(list|steps|bullet|enumerate|options)\b/i.test(prompt)
  if (promptAskedForList && !hasBullets && !hasNumbered) {
    issues.push('Prompt requested a list but response does not contain one.')
    suggestedFixes.push('Ask the model to format the answer as a numbered or bulleted list.')
    formatCompliance -= 15
  }

  const overallGood = issues.length === 0
  if (overallGood) {
    suggestedFixes.push('Response looks complete — no significant issues detected.')
  }

  return {
    id: generateId(),
    createdAt: isoNow(),
    responseText: response,
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    clarityScore: Math.max(0, Math.min(100, clarityScore)),
    formatComplianceScore: Math.max(0, Math.min(100, formatCompliance)),
    likelyHallucinationRisk: hallucinationRisk,
    issues,
    suggestedFixes,
    recommendedFollowUpPrompt: issues.length > 0
      ? 'Please revise your response to be more concise, include the requested format, and reduce hedging language.'
      : undefined,
    shouldRunSecondOpinion: hallucinationRisk === 'high' || qualityScore < 50,
  }
}

export async function auditResponse(
  prompt: string,
  response: string,
  settings: BetterAskSettings,
  promptEventId?: string
): Promise<ResponseAudit> {
  if (!settings.localOnly && settings.apiKey) {
    try {
      const audit = await apiAuditResponse(prompt, response, settings.apiEndpoint, settings.apiKey, settings.apiModel)
      return { ...audit, promptEventId }
    } catch (err) {
      console.warn('[BetterAsk] API audit failed, falling back to local audit:', err)
    }
  }

  const audit = localAudit(prompt, response)
  return { ...audit, promptEventId }
}
