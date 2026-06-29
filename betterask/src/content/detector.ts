import type { Sensitivity } from '../shared/types'
import { isWeakPrompt } from '../shared/heuristics'

// Selectors for known AI chat input elements, ordered by specificity.
// These will break when sites update their DOM — keep them isolated here.
const KNOWN_INPUT_SELECTORS = [
  // ChatGPT
  '#prompt-textarea',
  '[data-testid="text-area"]',
  // Claude
  '.ProseMirror[contenteditable="true"]',
  '[data-placeholder*="message" i]',
  // Perplexity
  'textarea[placeholder*="Ask" i]',
  // Gemini
  '.ql-editor[contenteditable="true"]',
  'rich-textarea .ql-editor',
  // Generic fallbacks
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="prompt" i]',
  '[role="textbox"][contenteditable="true"]',
]

const RESPONSE_SELECTORS = [
  // ChatGPT
  '[data-message-author-role="assistant"] .markdown',
  '.agent-turn .markdown',
  // Claude
  '[data-is-streaming="false"] .font-claude-message',
  '.font-claude-message',
  // Perplexity
  '.prose',
  // Gemini
  'message-content .markdown',
  // Generic
  '[class*="response"] [class*="content"]',
  '[class*="message"][class*="assistant"]',
]

export function getActivePromptElement(): HTMLElement | null {
  const active = document.activeElement
  if (active && isPromptElement(active as HTMLElement)) {
    return active as HTMLElement
  }

  for (const sel of KNOWN_INPUT_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) return el
  }

  return null
}

function isPromptElement(el: HTMLElement): boolean {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true
  if (el.getAttribute('contenteditable') === 'true') return true
  return false
}

export function getInputText(element: HTMLElement): string {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return (element as HTMLInputElement | HTMLTextAreaElement).value
  }
  return element.innerText ?? element.textContent ?? ''
}

export function replaceInputText(element: HTMLElement, text: string): void {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    const input = element as HTMLInputElement | HTMLTextAreaElement
    // Use native input value setter so React's synthetic event system detects the change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, text)
    } else {
      input.value = text
    }
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }

  // contenteditable (ProseMirror, Quill, etc.)
  element.focus()
  document.execCommand('selectAll')
  document.execCommand('insertText', false, text)

  // Fallback if execCommand doesn't work
  if (element.innerText !== text) {
    element.innerText = text
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

export function findLikelyResponseContainers(): HTMLElement[] {
  const found: HTMLElement[] = []
  for (const sel of RESPONSE_SELECTORS) {
    const els = document.querySelectorAll<HTMLElement>(sel)
    els.forEach((el) => found.push(el))
  }
  return found
}

export function extractLatestResponseText(): string | null {
  const containers = findLikelyResponseContainers()
  if (containers.length === 0) return null

  // Return the last response container's text
  const last = containers[containers.length - 1]
  const text = last.innerText ?? last.textContent ?? ''
  return text.trim() || null
}

export function shouldSuggest(text: string, sensitivity: Sensitivity): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 3) return false
  if (trimmed.length > 500) return false // long prompts are likely fine
  return isWeakPrompt(trimmed, sensitivity)
}

export function watchInputElement(
  element: HTMLElement,
  onChange: (text: string) => void
): () => void {
  const handler = () => onChange(getInputText(element))
  element.addEventListener('input', handler)
  element.addEventListener('keyup', handler)
  return () => {
    element.removeEventListener('input', handler)
    element.removeEventListener('keyup', handler)
  }
}
