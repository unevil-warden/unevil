import React, { useState, useEffect, useCallback } from 'react'
import type { BetterAskRule, BetterAskSettings, ImproveResult, PromptCategory } from '../shared/types'
import { improvePrompt } from '../shared/improve'
import { appendEvent } from '../shared/storage'
import { createRule } from '../shared/rules'
import { generateId, estimateTokens, isoNow, truncate } from '../shared/utils'
import { getSiteFromUrl } from '../shared/utils'
import { replaceInputText } from './detector'

interface FloatingUIProps {
  inputElement: HTMLElement | null
  currentText: string
  settings: BetterAskSettings
  rules: BetterAskRule[]
  visible: boolean
}

type UIState = 'pill' | 'loading' | 'suggestion' | 'hidden'

const CAT_LABELS: Record<PromptCategory, string> = {
  writing: 'Writing',
  coding: 'Coding',
  research: 'Research',
  planning: 'Planning',
  data: 'Data',
  business: 'Business',
  other: 'Other',
}

export function FloatingUI({ inputElement, currentText, settings, rules, visible }: FloatingUIProps) {
  const [uiState, setUiState] = useState<UIState>('hidden')
  const [result, setResult] = useState<ImproveResult | null>(null)
  const [editedText, setEditedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pillPos, setPillPos] = useState({ bottom: 80, right: 20 })

  // Update pill position relative to input element
  useEffect(() => {
    if (!inputElement || !visible) return
    const updatePos = () => {
      const rect = inputElement.getBoundingClientRect()
      setPillPos({
        bottom: Math.max(60, window.innerHeight - rect.top + 8),
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [inputElement, visible])

  useEffect(() => {
    if (visible && uiState === 'hidden') setUiState('pill')
    if (!visible) setUiState('hidden')
  }, [visible, uiState])

  // Reset when text changes significantly
  useEffect(() => {
    if (uiState === 'suggestion') setUiState('pill')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText])

  const handleFixAsk = useCallback(async () => {
    if (!currentText.trim()) return
    setUiState('loading')
    setError(null)
    try {
      const improved = await improvePrompt(currentText, settings, rules)
      setResult(improved)
      setEditedText(improved.betterAsk)
      setUiState('suggestion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setUiState('pill')
    }
  }, [currentText, settings, rules])

  const logEvent = useCallback(
    (action: Parameters<typeof appendEvent>[0]['userAction'], extra?: Partial<Parameters<typeof appendEvent>[0]>) => {
      if (!result) return
      appendEvent({
        id: generateId(),
        createdAt: isoNow(),
        site: getSiteFromUrl(window.location.href),
        originalPrompt: currentText,
        improvedPrompt: result.betterAsk,
        category: result.category,
        userAction: action,
        estimatedOriginalTokens: estimateTokens(currentText),
        estimatedImprovedTokens: estimateTokens(result.betterAsk),
        localOnly: settings.localOnly,
        ...extra,
      })
    },
    [result, currentText, settings.localOnly]
  )

  const handleUseBetter = useCallback(() => {
    if (!inputElement || !result) return
    const final = editedText || result.betterAsk
    replaceInputText(inputElement, final)
    logEvent(final !== result.betterAsk ? 'edited' : 'accepted', {
      editedPrompt: final !== result.betterAsk ? final : undefined,
    })
    setUiState('hidden')
  }, [inputElement, result, editedText, logEvent])

  const handleSendOriginal = useCallback(() => {
    logEvent('sent_original')
    setUiState('hidden')
  }, [logEvent])

  const handleReject = useCallback(() => {
    logEvent('rejected')
    setUiState('pill')
    setResult(null)
  }, [logEvent])

  const handleSaveRule = useCallback(async () => {
    if (!result) return
    await createRule(result.category, `For ${result.category}: ${editedText || result.betterAsk}`)
    logEvent('saved_rule')
    setUiState('hidden')
  }, [result, editedText, logEvent])

  if (uiState === 'hidden') return null

  const pillStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `${pillPos.bottom}px`,
    right: `${pillPos.right + 8}px`,
    zIndex: 2147483646,
    background: '#00E5A0',
    color: '#060910',
    borderRadius: '20px',
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 16px rgba(0,229,160,0.45)',
    border: 'none',
    outline: 'none',
    transition: 'transform 0.15s, box-shadow 0.15s',
    userSelect: 'none',
    pointerEvents: 'auto',
  }

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `${pillPos.bottom}px`,
    right: `${pillPos.right + 8}px`,
    zIndex: 2147483647,
    width: '380px',
    maxWidth: 'calc(100vw - 24px)',
    background: '#111620',
    border: '1px solid #1A2030',
    borderRadius: '14px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,160,0.08)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#EEF2F7',
    overflow: 'hidden',
    pointerEvents: 'auto',
  }

  if (uiState === 'pill') {
    return (
      <button
        style={pillStyle}
        onClick={handleFixAsk}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,229,160,0.6)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = ''
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 16px rgba(0,229,160,0.45)'
        }}
        title="BetterAsk — improve this prompt"
      >
        ✨ fix ask
      </button>
    )
  }

  if (uiState === 'loading') {
    return (
      <div style={pillStyle}>
        <span style={{ animation: 'ba-spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        improving…
      </div>
    )
  }

  if (uiState === 'suggestion' && result) {
    return (
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1A2030', background: '#0C1017', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>✨</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#00E5A0' }}>BetterAsk</span>
            <span style={{ fontSize: '10px', background: '#1A2030', color: '#7A8899', borderRadius: '4px', padding: '2px 7px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {CAT_LABELS[result.category]}
            </span>
            <span style={{ fontSize: '10px', color: '#3A4455', fontFamily: 'monospace' }}>
              {Math.round(result.confidence * 100)}% confident
            </span>
          </div>
          <button onClick={handleReject} style={{ background: 'none', border: 'none', color: '#3A4455', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        {/* Original */}
        <div style={{ padding: '10px 16px 4px', fontSize: '11px', color: '#3A4455', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Original</div>
        <div style={{ padding: '0 16px 10px', fontSize: '12px', color: '#7A8899', lineHeight: 1.5 }}>
          {truncate(currentText, 120)}
        </div>

        <div style={{ height: '1px', background: '#1A2030', margin: '0 16px' }} />

        {/* Improved */}
        <div style={{ padding: '10px 16px 4px', fontSize: '11px', color: '#00E5A0', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Better Ask</div>
        <div style={{ padding: '0 12px 10px' }}>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              maxHeight: '160px',
              background: '#161C28',
              border: '1px solid #1A2030',
              borderRadius: '8px',
              color: '#EEF2F7',
              fontSize: '13px',
              lineHeight: 1.6,
              padding: '10px 12px',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,229,160,0.4)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1A2030' }}
          />
        </div>

        {/* Why it helps */}
        <div style={{ padding: '0 16px 10px', fontSize: '12px', color: '#7A8899', lineHeight: 1.5, fontStyle: 'italic' }}>
          💡 {result.why}
        </div>

        {/* Missing pieces */}
        {result.missingPieces.length > 0 && (
          <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {result.missingPieces.map((p) => (
              <span key={p} style={{ fontSize: '10px', background: '#1A2030', color: '#7A8899', borderRadius: '3px', padding: '2px 8px', fontFamily: 'monospace' }}>
                + {p}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '0 16px 8px', fontSize: '12px', color: '#FF6B6B' }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #1A2030', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={handleUseBetter}
            style={{ gridColumn: '1 / -1', background: '#00E5A0', color: '#060910', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Use Better Ask
          </button>
          <button
            onClick={handleSendOriginal}
            style={{ background: '#1A2030', color: '#7A8899', border: '1px solid #222A38', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}
          >
            Send Original
          </button>
          <button
            onClick={handleSaveRule}
            style={{ background: '#1A2030', color: '#4D9EFF', border: '1px solid #222A38', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}
          >
            Save Rule
          </button>
        </div>
      </div>
    )
  }

  return null
}
