import type { PromptEvent, UsageReport, BetterAskRule } from './types'
import { getEvents, getRules } from './storage'
import { estimateTokens } from './utils'

export async function generateReport(
  minutesPerAvoidedFollowUp: number = 1.5
): Promise<UsageReport> {
  const events = await getEvents()
  const rules = await getRules()

  if (events.length === 0) {
    const now = new Date().toISOString()
    return emptyReport(now, now)
  }

  const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const periodStart = sorted[0].createdAt
  const periodEnd = sorted[sorted.length - 1].createdAt

  const promptsImproved = events.filter((e) => e.improvedPrompt).length
  const accepted = events.filter((e) => e.userAction === 'accepted').length
  const edited = events.filter((e) => e.userAction === 'edited').length
  const rejected = events.filter((e) => e.userAction === 'rejected').length

  const estimatedTokensSaved = events.reduce((sum, e) => {
    const orig = e.estimatedOriginalTokens ?? estimateTokens(e.originalPrompt)
    const improved = e.estimatedImprovedTokens ?? (e.improvedPrompt ? estimateTokens(e.improvedPrompt) : orig)
    if (e.userAction === 'accepted' && improved < orig) return sum + (orig - improved)
    return sum
  }, 0)

  // Estimate avoided follow-ups: assume accepted/edited improvements avoid 0.5–1 follow-ups each
  const estimatedAvoidedFollowUps = (accepted + edited * 0.5)
  const estimatedMinutesSaved = estimatedAvoidedFollowUps * minutesPerAvoidedFollowUp

  // Top failure categories
  const categoryFails = new Map<string, number>()
  for (const e of events) {
    if (e.userAction === 'rejected' || e.userAction === 'sent_original') {
      categoryFails.set(e.category, (categoryFails.get(e.category) ?? 0) + 1)
    }
  }
  const topFailureCategories = [...categoryFails.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }))

  const bestRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)

  const recommendations = buildRecommendations(events, accepted, edited, rejected, rules)

  return {
    periodStart,
    periodEnd,
    promptsObserved: events.length,
    promptsImproved,
    acceptedCount: accepted,
    editedCount: edited,
    rejectedCount: rejected,
    estimatedTokensSaved,
    estimatedMinutesSaved,
    topFailureCategories,
    topMissingPieces: [],
    bestRules,
    recommendations,
  }
}

function buildRecommendations(
  events: PromptEvent[],
  accepted: number,
  edited: number,
  rejected: number,
  rules: BetterAskRule[]
): string[] {
  const recs: string[] = []
  const total = events.length

  if (total === 0) return ['Start using BetterAsk to build your prompt history.']

  const acceptRate = accepted / total
  const rejectRate = rejected / total

  if (acceptRate > 0.6) recs.push('Your acceptance rate is high — BetterAsk is working well for you.')
  if (rejectRate > 0.4) recs.push('Rejection rate is high — consider adjusting sensitivity in Settings or adding custom rules.')
  if (edited > accepted) recs.push('You edit suggestions more than you accept them — add specific rules to get better first-pass suggestions.')
  if (rules.length === 0) recs.push('Add your first saved rule in Settings to personalize suggestions.')
  if (rules.filter((r) => r.source === 'learned').length === 0 && events.length > 20) {
    recs.push('You have enough history for learned rules — check Learning in Settings.')
  }

  return recs.length > 0 ? recs : ['Keep using BetterAsk to build your prompt history and rules.']
}

function emptyReport(periodStart: string, periodEnd: string): UsageReport {
  return {
    periodStart,
    periodEnd,
    promptsObserved: 0,
    promptsImproved: 0,
    acceptedCount: 0,
    editedCount: 0,
    rejectedCount: 0,
    estimatedTokensSaved: 0,
    estimatedMinutesSaved: 0,
    topFailureCategories: [],
    topMissingPieces: [],
    bestRules: [],
    recommendations: ['Start using BetterAsk on any supported AI site to see your report here.'],
  }
}
