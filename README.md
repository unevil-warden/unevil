# unEvilGenius Labs

> A small workshop of local-first, privacy-respecting tools — built to be genuinely
> useful without being creepy about it.

This repository is the umbrella home for several independent projects. Each one
lives in its own folder (or, while in progress, its own pull request) so they can
grow without stepping on each other.

**Live portfolio:** https://unevil-warden.github.io/unevil/ — a landing page
linking to each project below. It lists only projects that are actually built;
more get added as they ship.

| Page | URL |
|---|---|
| Portfolio (landing) | https://unevil-warden.github.io/unevil/ |
| ComplaintGraph | https://unevil-warden.github.io/unevil/complaintgraph/ |
| Surveillance Radar | https://unevil-warden.github.io/unevil/radar/ |
| ReplyGraph demo | https://unevil-warden.github.io/unevil/replygraph/ |
| BetterAsk download | https://unevil-warden.github.io/unevil/betterask/ |

---

## Projects

| Project | What it is | Stack | Where it lives | Status |
|---|---|---|---|---|
| **ComplaintGraph** | Public complaint intelligence for consumer finance — search a bank, credit bureau, lender, or card issuer to see its complaint trend, top issues, response quality, and a *transparent* risk signal (every score shows its math). Built on the public CFPB Consumer Complaint Database; a signal explorer, not a verdict. | Vanilla JS · inline SVG · CFPB data | [`complaintgraph/`](./complaintgraph/) · [live](https://unevil-warden.github.io/unevil/complaintgraph/) | 🌐 Live site |
| **Surveillance Radar** | An interactive 3D globe ("FlightRadar24 for surveillance tech") visualizing the EFF *Atlas of Surveillance* dataset — public data only, with attribution. | Next.js · MapLibre | [`surveillance-radar/`](./surveillance-radar/) · [live](https://unevil-warden.github.io/unevil/radar/) | 🌐 Live site |
| **ReplyGraph** | Local-first macOS app that reads *your own* iMessage history, ranks which conversations need attention, drafts replies in your voice, flags risky tone, and extracts follow-ups. Read-only, copy-to-clipboard only — never auto-sends. | Python (FastAPI) · React (Vite) | [`replygraph/`](./replygraph/) · [live demo](https://unevil-warden.github.io/unevil/replygraph/) | ✅ In repo + live demo |
| **BetterAsk** | A local-first Chrome extension that's "autocorrect for AI prompts" — catches vague prompts before you send them and suggests clearer versions. | Vite · React · TypeScript | [`betterask/`](./betterask/) · [download page](./betterask.html) | 📄 Download page live |

> The published front page is the **portfolio landing page** ([`index.html`](./index.html)),
> which links out to each project: the ComplaintGraph dashboard at `/complaintgraph/`,
> the Surveillance Radar globe at `/radar/`, the ReplyGraph demo at `/replygraph/`,
> and the BetterAsk download page at `/betterask/`.

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
├── index.html              # Portfolio landing page — the published front page (/)
├── betterask.html          # BetterAsk download page (published at /betterask/)
├── betterask-extension.zip # The packaged BetterAsk extension (linked from its page)
├── complaintgraph/         # ComplaintGraph dashboard — published at /complaintgraph/
│   ├── src/                # static dashboard (vanilla JS + inline SVG)
│   ├── scripts/            # CFPB ingest + sample generator + shared analyzer
│   └── data/               # baked JSON (committed sample; live snapshot in CI)
├── surveillance-radar/     # Next.js 3D globe — published at /radar/ (see its README)
├── replygraph/             # ReplyGraph app — see replygraph/README.md
│   ├── backend/            # FastAPI + SQLite
│   ├── frontend/           # React + Vite
│   └── demo/index.html     # Static sample-data demo — published at /replygraph/
├── betterask/              # BetterAsk Chrome extension source
└── .github/workflows/      # GitHub Pages build & deploy (pages.yml)
```

The site is built and deployed by `.github/workflows/pages.yml` on every push to
`main`: it runs the Surveillance Radar static export, refreshes ComplaintGraph's
data from the public CFPB API (falling back to the committed sample), and
assembles the portfolio landing page plus each project page into the published
site. For each project's own setup, see
[`complaintgraph/README.md`](./complaintgraph/README.md),
[`surveillance-radar/README.md`](./surveillance-radar/README.md) and
[`replygraph/README.md`](./replygraph/README.md).

---

## About

Built by **Rishva Iyer** under the unEvilGenius Labs banner. Each project aims to
do one focused thing well, locally, and on your terms.
