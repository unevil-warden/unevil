// Site-specific DOM helpers. Keep selectors here so they're easy to update
// when AI sites change their DOM structure.

export type SiteName = 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'unknown'

export function detectSite(): SiteName {
  const host = window.location.hostname
  if (host.includes('chatgpt.com')) return 'chatgpt'
  if (host.includes('claude.ai')) return 'claude'
  if (host.includes('perplexity.ai')) return 'perplexity'
  if (host.includes('gemini.google.com')) return 'gemini'
  return 'unknown'
}

export function isSupportedSite(): boolean {
  return detectSite() !== 'unknown'
}

export function getSubmitButton(): HTMLElement | null {
  const selectors = [
    // ChatGPT
    '[data-testid="send-button"]',
    'button[aria-label*="send" i]',
    // Claude
    'button[aria-label*="Send message" i]',
    // Perplexity
    'button[aria-label*="Submit" i]',
    // Gemini
    'button[aria-label*="Send" i]',
    // Generic
    'button[type="submit"]',
  ]
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) return el
  }
  return null
}

export function getInputContainer(input: HTMLElement): HTMLElement {
  // Walk up to find a reasonable container for positioning
  let el: HTMLElement | null = input
  for (let i = 0; i < 5; i++) {
    el = el?.parentElement ?? null
    if (!el) break
    const rect = el.getBoundingClientRect()
    if (rect.width > 200) return el
  }
  return input
}
