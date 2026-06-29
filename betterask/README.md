# BetterAsk

**AI prompt autocorrect for ChatGPT, Claude, Perplexity, and Gemini.**

BetterAsk is a Chrome extension that detects vague prompts before you send them, suggests clearer versions, learns from your editing patterns, and audits AI responses after they arrive.

---

## Quick Start

```bash
cd betterask
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer Mode (top right)
3. Click "Load Unpacked"
4. Select the `betterask/dist/` folder

---

## How It Works

1. You type a rough prompt in ChatGPT, Claude, Perplexity, or Gemini
2. BetterAsk detects if it's vague or missing key context
3. A green **✨ fix ask** pill appears near the input
4. Click it — BetterAsk shows the original, an improved version, and why it helps
5. Click **Use Better Ask** to replace your text
6. BetterAsk saves the event locally for your dashboard

---

## Features (Phase 1)

| Feature | Status |
|---------|--------|
| Prompt detection (vague/weak) | ✅ |
| Local heuristic improvement (no API needed) | ✅ |
| API-enhanced improvement (OpenAI-compatible) | ✅ |
| Floating "fix ask" pill | ✅ |
| Suggestion card with edit | ✅ |
| Accept / Edit / Reject / Save Rule | ✅ |
| Local prompt event storage | ✅ |
| Saved rules (manual) | ✅ |
| Rules applied to suggestions | ✅ |
| Usage dashboard | ✅ |
| Response audit (local heuristic) | ✅ |
| Response audit (API-powered) | ✅ |
| Pattern learning (rule suggestions) | ✅ |
| Settings page | ✅ |
| Export / Import memory | ✅ |
| Delete all memory | ✅ |

---

## Supported Sites

- chatgpt.com
- claude.ai
- perplexity.ai
- gemini.google.com

---

## Privacy

- **No backend.** All data stays in `chrome.storage.local` by default.
- **No analytics.** No third-party tracking.
- **API keys** are stored locally and never sent to BetterAsk servers.
- **API mode** is opt-in. When enabled, prompts are sent to your configured endpoint only.
- Use **Export Memory** (Settings → Privacy) to download your data as JSON.
- Use **Delete All Memory** to wipe all stored events and rules.

---

## Known Limitations

- **DOM selectors break.** AI sites update their HTML regularly. Selectors are isolated in `src/content/detector.ts` and `src/content/dom.ts` so they're easy to update when that happens.
- **Token/time savings are estimates.** The dashboard uses `characters / 4` to approximate tokens and `1.5 minutes per avoided follow-up` as a configurable default. These are rough proxies, not measurements.
- **Response auditing is not a guarantee of truth.** The local audit uses heuristics. The API audit uses an LLM. Both can be wrong.
- **A second model can still be wrong.** Second opinion mode reduces hallucination risk but does not eliminate it.
- **Contenteditable replacement.** `document.execCommand` is deprecated but still works in most browsers. ProseMirror/Quill editors may need site-specific handling if the fallback breaks.
- **Shadow DOM pointer-events.** The floating UI uses a shadow root for CSS isolation. If clicks don't register on some sites, it may need tuning in `src/content/index.tsx`.

---

## Project Structure

```
src/
  background/     — Service worker (background.js)
  content/        — Injected into AI sites
    detector.ts   — DOM detection (update selectors here when sites change)
    dom.ts        — Site-specific helpers
    floating-ui   — The "✨ fix ask" pill and suggestion card
    response-audit-ui — Post-response overlay
  popup/          — Extension popup
  options/        — Settings page
  dashboard/      — Local analytics dashboard
  shared/         — All business logic
    heuristics.ts — Local pattern-matching (works without API)
    improve.ts    — Orchestrates heuristic + API improvement
    api.ts        — OpenAI-compatible API calls
    learning.ts   — Pattern detection for rule suggestions
    responseAudit — Local + API response scoring
    reports.ts    — Aggregates events into UsageReport
    storage.ts    — chrome.storage.local wrapper
    types.ts      — All TypeScript types
```

---

## Development

```bash
npm run dev       # watch mode (rebuilds on change)
npm run build     # production build
npm run type-check  # TypeScript checks without building
```

After `npm run dev` or `npm run build`, reload the extension in `chrome://extensions` to pick up changes.

---

## Build Phases

- **Phase 1 (this):** Local MVP — heuristics, rules, dashboard, no backend
- **Phase 2:** API-enhanced rewriting + response audit improvements
- **Phase 3:** Team features, optional backend, shared rules
- **Phase 4:** Enterprise — SSO, RBAC, audit logs, SOC2 path
