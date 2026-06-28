import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import type { BetterAskRule, BetterAskSettings, ResponseAudit } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import { getSettings, getRules } from '../shared/storage'
import { debounce } from '../shared/utils'
import {
  getActivePromptElement,
  getInputText,
  shouldSuggest,
  watchInputElement,
  extractLatestResponseText,
} from './detector'
import { isSupportedSite } from './dom'
import { FloatingUI } from './floating-ui'
import { ResponseAuditUI } from './response-audit-ui'
import { auditResponse } from '../shared/responseAudit'

const SHADOW_HOST_ID = 'betterask-shadow-host'

// Spin animation keyframe — injected once
const SPIN_STYLE = `@keyframes ba-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`

function ContentApp() {
  const [settings, setSettings] = useState<BetterAskSettings>(DEFAULT_SETTINGS)
  const [rules, setRules] = useState<BetterAskRule[]>([])
  const [activeInput, setActiveInput] = useState<HTMLElement | null>(null)
  const [currentText, setCurrentText] = useState('')
  const [showPill, setShowPill] = useState(false)
  const [audit, setAudit] = useState<ResponseAudit | null>(null)
  const lastResponseRef = useRef<string | null>(null)
  const unwatchRef = useRef<(() => void) | null>(null)

  // Load settings and rules
  useEffect(() => {
    const load = async () => {
      const [s, r] = await Promise.all([getSettings(), getRules()])
      setSettings(s)
      setRules(r)
    }
    load()

    // Refresh settings when they change in options page
    chrome.storage.onChanged.addListener(() => load())
  }, [])

  const handleTextChange = useCallback(
    debounce((text: string) => {
      setCurrentText(text)
      if (settings.enabled) {
        setShowPill(shouldSuggest(text, settings.sensitivity))
      }
    }, 500),
    [settings]
  )

  // Watch for focused input elements
  const attachToInput = useCallback(
    (el: HTMLElement) => {
      if (el === activeInput) return
      unwatchRef.current?.()
      setActiveInput(el)
      setShowPill(false)
      const unwatch = watchInputElement(el, handleTextChange)
      unwatchRef.current = unwatch
    },
    [activeInput, handleTextChange]
  )

  // Poll for active input (AI sites use dynamic rendering)
  useEffect(() => {
    if (!settings.enabled) return

    const poll = setInterval(() => {
      const el = getActivePromptElement()
      if (el) attachToInput(el)
    }, 1500)

    const focusHandler = () => {
      const el = getActivePromptElement()
      if (el) attachToInput(el)
    }

    document.addEventListener('focusin', focusHandler)
    return () => {
      clearInterval(poll)
      document.removeEventListener('focusin', focusHandler)
      unwatchRef.current?.()
    }
  }, [settings.enabled, attachToInput])

  // Auto-audit: watch for new response content
  useEffect(() => {
    if (!settings.autoAudit || !settings.enabled) return

    const checkResponse = debounce(async () => {
      const text = extractLatestResponseText()
      if (!text || text === lastResponseRef.current) return
      lastResponseRef.current = text
      const a = await auditResponse(currentText, text, settings)
      setAudit(a)
    }, 2000)

    const observer = new MutationObserver(checkResponse)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [settings, currentText])

  if (!settings.enabled) return null

  return (
    <>
      <FloatingUI
        inputElement={activeInput}
        currentText={currentText}
        settings={settings}
        rules={rules}
        visible={showPill}
      />
      {audit && (
        <ResponseAuditUI audit={audit} onClose={() => setAudit(null)} />
      )}
    </>
  )
}

function mount() {
  if (!isSupportedSite()) return
  if (document.getElementById(SHADOW_HOST_ID)) return

  const host = document.createElement('div')
  host.id = SHADOW_HOST_ID
  // Ensure host itself doesn't interfere with page layout
  host.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
  document.documentElement.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = SPIN_STYLE
  shadow.appendChild(style)

  const root = document.createElement('div')
  root.style.cssText = 'pointer-events: none;'
  shadow.appendChild(root)

  createRoot(root).render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
