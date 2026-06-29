# unEvilGenius Labs

> A small workshop of local-first, privacy-respecting tools — built to be genuinely
> useful without being creepy about it.

This repository is the umbrella home for several independent projects. Each one
lives in its own folder (or, while in progress, its own pull request) so they can
grow without stepping on each other.

**Live site:** https://unevil-warden.github.io/unevil/ — the **Surveillance Radar**
3D globe (demo data, no API keys).

---

## Projects

| Project | What it is | Stack | Where it lives | Status |
|---|---|---|---|---|
| **Surveillance Radar** | An interactive 3D globe ("FlightRadar24 for surveillance tech") visualizing the EFF *Atlas of Surveillance* dataset — public data only, with attribution. | Next.js · MapLibre | [`surveillance-radar/`](./surveillance-radar/) | 🌐 Live site |
| **ReplyGraph** | Local-first macOS app that reads *your own* iMessage history, ranks which conversations need attention, drafts replies in your voice, flags risky tone, and extracts follow-ups. Read-only, copy-to-clipboard only — never auto-sends. | Python (FastAPI) · React (Vite) | [`replygraph/`](./replygraph/) | ✅ In this repo |
| **BetterAsk** | A local-first Chrome extension that's "autocorrect for AI prompts" — catches vague prompts before you send them and suggests clearer versions. | Vite · React · TypeScript | [`betterask/`](./betterask/) · [download page](./betterask.html) | 📄 Download page live |

> The published site is the Surveillance Radar globe. ReplyGraph lives in the repo
> as a separate project but is not the front page. BetterAsk has its own download
> landing page at [`betterask.html`](./betterask.html).

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
├── surveillance-radar/     # The live site — Next.js 3D globe (see its README)
├── replygraph/             # ReplyGraph app — see replygraph/README.md
│   ├── backend/            # FastAPI + SQLite
│   └── frontend/           # React + Vite
├── index.html              # Older ReplyGraph demo page (kept, not published)
└── .github/workflows/      # GitHub Pages build & deploy (pages.yml)
```

The live site is built and deployed by `.github/workflows/pages.yml`, which runs
the Surveillance Radar static export and publishes it to GitHub Pages on every
push to `main`. For each project's own setup, see
[`surveillance-radar/README.md`](./surveillance-radar/README.md) and
[`replygraph/README.md`](./replygraph/README.md).

---

## About

Built by **Rishva Iyer** under the unEvilGenius Labs banner. Each project aims to
do one focused thing well, locally, and on your terms.
