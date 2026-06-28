export type Sensitivity = 'low' | 'medium' | 'high'

export type PromptCategory =
  | 'writing'
  | 'coding'
  | 'research'
  | 'planning'
  | 'data'
  | 'business'
  | 'other'

export type UserAction =
  | 'accepted'
  | 'edited'
  | 'rejected'
  | 'sent_original'
  | 'saved_rule'
  | 'reran'
  | 'copied_answer'
  | 'rated_success'
  | 'rated_failure'

export interface BetterAskRule {
  id: string
  category: PromptCategory
  rule: string
  createdAt: string
  updatedAt: string
  usageCount: number
  source: 'manual' | 'learned' | 'team'
  enabled: boolean
}

export interface PromptEvent {
  id: string
  createdAt: string
  site: string
  modelHint?: string
  originalPrompt: string
  improvedPrompt?: string
  category: PromptCategory
  userAction: UserAction
  editedPrompt?: string
  followUpCount?: number
  estimatedOriginalTokens?: number
  estimatedImprovedTokens?: number
  estimatedResponseTokens?: number
  successScore?: number
  learnedRuleId?: string
  localOnly: boolean
}

export interface ImproveResult {
  betterAsk: string
  why: string
  category: PromptCategory
  confidence: number
  missingPieces: string[]
}

export interface ResponseAudit {
  id: string
  promptEventId?: string
  createdAt: string
  responseText: string
  qualityScore: number
  clarityScore: number
  formatComplianceScore: number
  likelyHallucinationRisk: 'low' | 'medium' | 'high'
  issues: string[]
  suggestedFixes: string[]
  recommendedFollowUpPrompt?: string
  shouldRunSecondOpinion: boolean
}

// Scoring engine dimensions (SCORING_ENGINE.md)
export interface PromptScores {
  promptClarity: number        // 0–100
  contextCompleteness: number  // 0–100
  outputUsefulness: number     // 0–100
  revisionBurden: number       // 0–100 (lower = fewer rewrites needed)
  instructionCompliance: number // 0–100
  factualityRisk: number       // 0–100 (lower = less risky)
  efficiency: number           // 0–100
  teamImprovement: number      // 0–100
}

export interface UsageReport {
  periodStart: string
  periodEnd: string
  promptsObserved: number
  promptsImproved: number
  acceptedCount: number
  editedCount: number
  rejectedCount: number
  estimatedTokensSaved: number
  estimatedMinutesSaved: number
  topFailureCategories: Array<{ label: string; count: number }>
  topMissingPieces: Array<{ label: string; count: number }>
  bestRules: BetterAskRule[]
  recommendations: string[]
}

export interface BetterAskSettings {
  enabled: boolean
  sensitivity: Sensitivity
  apiKey: string
  apiEndpoint: string
  apiModel: string
  secondOpinionKey: string
  secondOpinionEndpoint: string
  secondOpinionModel: string
  localOnly: boolean
  autoAudit: boolean
  doNotLearnDefault: boolean
  minutesPerAvoidedFollowUp: number
}

export const DEFAULT_SETTINGS: BetterAskSettings = {
  enabled: true,
  sensitivity: 'medium',
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1',
  apiModel: 'gpt-4o-mini',
  secondOpinionKey: '',
  secondOpinionEndpoint: 'https://api.openai.com/v1',
  secondOpinionModel: 'gpt-4o',
  localOnly: true,
  autoAudit: false,
  doNotLearnDefault: false,
  minutesPerAvoidedFollowUp: 1.5,
}
