# BetterAsk Manual Test Checklist

## Setup

- [ ] `cd betterask && npm install` completes without errors
- [ ] `npm run build` completes without errors
- [ ] `dist/` folder is created
- [ ] Chrome: go to `chrome://extensions` → Enable Developer Mode → Load Unpacked → select `betterask/dist/`
- [ ] Extension icon appears in Chrome toolbar

## Popup

- [ ] Click extension icon → popup opens
- [ ] Shows "BetterAsk" name and toggle
- [ ] Toggle works (disables/re-enables)
- [ ] Supported site shows green dot when on chatgpt.com/claude.ai/etc.
- [ ] Stats show (may be 0 initially)
- [ ] "Open Dashboard" opens a new tab
- [ ] "Settings" opens options page

## Settings Page

- [ ] Settings page opens correctly
- [ ] All four tabs work: General, API, Rules, Privacy
- [ ] Sensitivity toggle (low/medium/high) saves correctly
- [ ] Add a rule: select category, type rule text, press Add
- [ ] Rule appears in list
- [ ] Edit rule works
- [ ] Delete rule works
- [ ] Toggle rule enabled/disabled works
- [ ] Save Settings shows "Saved ✓" confirmation
- [ ] Privacy tab: Export Memory downloads a JSON file
- [ ] Privacy tab: Delete All Memory prompts and clears data

## Content Script — Local Heuristic Mode (no API key)

- [ ] Navigate to chatgpt.com (or claude.ai, perplexity.ai, gemini.google.com)
- [ ] Click the chat input
- [ ] Type "make this better" and pause 500ms
- [ ] Green "✨ fix ask" pill appears near the input
- [ ] Click the pill → suggestion card appears
- [ ] Card shows: original prompt, improved prompt, why it helps, category, confidence
- [ ] "Use Better Ask" replaces the input text with the improved version
- [ ] Type another weak prompt → suggestion updates
- [ ] Click "Send Original" → pill dismisses, no replacement
- [ ] Click "Save Rule" → confirms rule saved
- [ ] Click × button → card closes, pill reappears

## Content Script — Edit mode

- [ ] In suggestion card, edit the "Better Ask" textarea
- [ ] Click "Use Better Ask" → input gets edited version (not original suggestion)

## Learning / Storage

- [ ] After clicking "Use Better Ask" a few times, open Dashboard
- [ ] Dashboard shows prompt count > 0
- [ ] Prompts improved count is accurate
- [ ] Acceptance rate shown in bar chart

## No-API mode (default)

- [ ] With no API key set, suggestions still appear (local heuristics)
- [ ] No network requests are made in local-only mode (check DevTools Network tab)

## API mode (optional — requires API key)

- [ ] Enable API mode in Settings → API tab
- [ ] Enter a valid API key and endpoint
- [ ] Type a weak prompt on a supported site
- [ ] Click "✨ fix ask" → API is called and returns improved prompt
- [ ] With invalid API key: graceful fallback to local heuristic (no crash)

## Dashboard

- [ ] Dashboard shows empty state when no events
- [ ] Dashboard shows stats after using extension
- [ ] Stat cards show: observed, improved, tokens saved, time saved
- [ ] Suggestion outcome bar shows accepted/edited/rejected split
- [ ] Rules section shows saved rules

## Privacy

- [ ] Open DevTools Network tab on chatgpt.com
- [ ] Verify no outbound requests to non-API domains
- [ ] Enable API mode and verify requests only go to configured endpoint

## Weak prompt test phrases

Type each of these in a supported AI chat input and verify a suggestion appears:

- [ ] `make this better`
- [ ] `fix this`
- [ ] `help me debug`
- [ ] `write SQL`
- [ ] `make a deck`
- [ ] `analyze this`
- [ ] `summarize`
- [ ] `explain this`
- [ ] `clean this up`
- [ ] `write some code`

## Known fragile areas

- DOM selectors may break when ChatGPT/Claude update their UI
- Live response capture depends on specific HTML structure
- `execCommand` for contenteditable replacement is deprecated (works but may degrade)
- Shadow DOM `pointer-events` interactions may need adjustment per-site
