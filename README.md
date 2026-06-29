# unEvilGenius Labs

> A small workshop of local-first, privacy-respecting tools — built to be genuinely
> useful without being creepy about it.

This repository is the umbrella home for several independent projects. Each one
lives in its own folder (or, while in progress, its own pull request) so they can
grow without stepping on each other.

**Live demo:** https://unevil-warden.github.io/unevil/ — the ReplyGraph interface,
running on sample data (no backend, no real messages).

---

## Projects

| Project | What it is | Stack | Where it lives | Status |
|---|---|---|---|---|
| **ReplyGraph** | Local-first macOS app that reads *your own* iMessage history, ranks which conversations need attention, drafts replies in your voice, flags risky tone, and extracts follow-ups. Read-only, copy-to-clipboard only — never auto-sends. | Python (FastAPI) · React (Vite) | [`replygraph/`](./replygraph/) | ✅ In this repo |
| **Surveillance Radar** | An interactive 3D globe ("FlightRadar24 for surveillance tech") visualizing the EFF *Atlas of Surveillance* dataset — public data only, with attribution. | Next.js · MapLibre | [PR #6](https://github.com/unevil-warden/unevil/pull/6) | 🚧 In review |
| **BetterAsk** | A local-first Chrome extension that's "autocorrect for AI prompts" — catches vague prompts before you send them and suggests clearer versions. | Vite · React · TypeScript | [PR #2](https://github.com/unevil-warden/unevil/pull/2) | 🚧 In review |

> Surveillance Radar and BetterAsk are kept in open pull requests for now rather
> than merged into `main`, so the live demo and the ReplyGraph codebase stay clean.

---

## Shared principles

These show up across everything here:

- **Local-first.** Your data stays on your machine by default. Nothing leaves it
  unless you explicitly opt in (e.g. by adding your own LLM API key).
- **Read-only where it counts.** Tools that touch personal data (like ReplyGraph
  and your Messages database) open it read-only and never write back.
- **Honest about estimates.** Anything inferred (tone, relationship signals, token
  costs) is labeled as an estimate with confidence — never stated as fact.
- **No dark patterns.** No tracking, no silent network calls, no auto-sending on
  your behalf.

---

## Repository layout

```
.
├── index.html              # Live ReplyGraph demo (served via GitHub Pages)
├── replygraph/             # ReplyGraph app — see replygraph/README.md
│   ├── backend/            # FastAPI + SQLite
│   └── frontend/           # React + Vite
└── .github/workflows/      # GitHub Pages deployment
```

For ReplyGraph's full setup and run instructions, see
[`replygraph/README.md`](./replygraph/README.md).

---

## About

Built by **Rishva Iyer** under the unEvilGenius Labs banner. Each project aims to
do one focused thing well, locally, and on your terms.
