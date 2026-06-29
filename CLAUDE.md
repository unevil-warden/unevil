# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this repo is

**unEvilGenius Labs** — an umbrella monorepo of independent, local-first,
privacy-respecting tools. There is no shared build system or shared code across
projects; each subdirectory is its own self-contained app with its own stack,
dependencies, and README. The only thing that ties them together is the
**portfolio landing page** and a single GitHub Pages workflow that publishes all
of them to one site.

When working on a task, first identify **which project** it belongs to and treat
that subdirectory as the working root. Don't assume a tool or convention from one
project applies to another.

## Repository layout

```
.
├── index.html                  # Portfolio landing page — published at /  (plain HTML)
├── betterask.html              # BetterAsk download page — published at /betterask/
├── betterask-extension.zip     # Packaged BetterAsk extension (linked from its page)
├── surveillance-radar/         # Next.js 3D globe — published at /radar/
├── replygraph/                 # Local-first macOS iMessage assistant (FastAPI + React)
│   ├── backend/                # FastAPI + SQLite
│   ├── frontend/               # React + Vite
│   └── demo/index.html         # Static sample-data demo — published at /replygraph/
├── betterask/                  # BetterAsk Chrome extension source (Vite + React + TS)
├── README.md                   # Human-facing overview (keep in sync with reality)
└── .github/workflows/pages.yml # The only CI: builds & deploys the multi-page site
```

`index.html`, `betterask.html`, and the various `demo/index.html` files are
**hand-written static HTML** — there is no framework or build step for them. Edit
the HTML directly.

## Deployment (the one piece of shared infrastructure)

`.github/workflows/pages.yml` runs on every push to `main` (and via
`workflow_dispatch`). It:

1. Builds the Surveillance Radar Next.js app as a **static export** with
   `NEXT_PUBLIC_BASE_PATH=/<repo>/radar` baked in (so assets resolve under the
   subpath), after running `pnpm ingest:atlas`.
2. Assembles `_site/`: portfolio `index.html` at `/`, the radar export at
   `/radar/`, the ReplyGraph static demo at `/replygraph/`, and `betterask.html`
   + the extension zip at `/betterask/`.
3. Deploys to GitHub Pages.

Only Surveillance Radar is actually *built* in CI; the other published pages are
copied as-is. ReplyGraph's real app and the BetterAsk extension are **not**
deployed — only their static demo / download pages are.

Because the radar is served from a subpath, any new asset or data URL it loads
must respect `NEXT_PUBLIC_BASE_PATH`. Locally that env var is empty, so the app
runs at the root.

---

## Project: Surveillance Radar (`surveillance-radar/`)

Interactive dark 3D globe ("FlightRadar24 for surveillance tech") visualizing the
EFF *Atlas of Surveillance* dataset. **Public data only, with attribution.**

- **Stack:** Next.js 14 (App Router, `output: "export"`), React 18, TypeScript,
  MapLibre GL (globe projection), supercluster, Tailwind, Zod. Package manager is
  **pnpm**.
- **Layout:**
  - `app/` — `layout.tsx`, `page.tsx`, `globals.css`.
  - `components/` — `MapExperience.tsx` (top-level), `map/` (`Globe.tsx`,
    `Controls.tsx`, `RecordDrawer.tsx`), `layout/Footer.tsx`.
  - `lib/atlas/` — pure data logic: `schema.ts` (Zod), `normalize.ts`,
    `geocode.ts`, `filters.ts`, `search.ts`, `theme.ts`.
  - `scripts/ingest-atlas.ts` — the data pipeline (run via `pnpm ingest:atlas`).
  - `data/raw/` (input CSVs, incl. `sample-atlas.csv` demo), `data/centroids/`
    (`us-places.json` offline geocoder table), `data/processed/`
    (`atlas-records.json` + `atlas-summary.json`, generated).
- **Commands** (run from `surveillance-radar/`):
  - `pnpm install`
  - `pnpm dev` — local dev server
  - `pnpm ingest:atlas` — regenerate processed data from `data/raw/`
  - `pnpm build` — static export to `out/`
  - `pnpm lint`
- **Data pipeline:** `ingest-atlas.ts` is **header-tolerant** (maps common column
  variants), validates with Zod, then geocodes **offline** from
  `data/centroids/us-places.json` in order `city+state` → `county+state` →
  `state`. No geocoding API calls — it must work during static builds. Each
  record records its `geocodeSource`. To improve coverage, extend the centroid
  table rather than adding a network dependency.
- **Real data:** ships with a small demo CSV. Real Atlas data is a manual
  download saved to `data/raw/atlas-of-surveillance.csv` (see project README).
  Don't commit large real datasets.
- **Conventions:** keep data-transformation logic in `lib/atlas/` (testable, pure)
  and rendering in `components/`. Preserve EFF attribution and the "absence of a
  marker ≠ absence of surveillance" framing in the UI. `eslint.ignoreDuringBuilds`
  is on, so lint won't fail the build — run `pnpm lint` yourself.

---

## Project: ReplyGraph (`replygraph/`)

Local-first macOS app that reads **your own** iMessage history (read-only), ranks
threads, drafts replies in your voice, flags risky tone, and extracts follow-ups.
Two processes: a FastAPI backend and a Vite/React frontend.

- **Stack:** Python 3.11+ (FastAPI, SQLAlchemy 2.0, Pydantic 2, `anthropic`,
  `pyperclip`), React 18 + Vite (plain JS/JSX, npm). Node 18+.
- **Backend layout (`backend/`):**
  - `main.py` — all FastAPI routes (threads, drafts, rewrites, approve/deny,
    follow-ups, analytics, style profile). Single app, no separate router files.
  - `db.py` — SQLAlchemy engine; SQLite at `backend/data/replygraph.db`.
  - `models.py`, `schemas.py` (Pydantic I/O), `config.py` (JSON settings in
    `backend/data/`).
  - `services/` — the logic, one module per concern: `imessage_reader.py`,
    `ingest.py`, `thread_ranker.py`, `draft_generator.py`, `prompt_builder.py`,
    `rewrite`/`tone_risk_detector.py`, `followup_extractor.py`,
    `relationship_analytics.py`, `style_profile.py`, `token_estimator.py`,
    `clipboard_sender.py`, `markdown_exporter.py`, `obsidian_exporter.py`,
    `dashboard_settings.py`.
  - `dev_seed.py` — seed data so the app runs on Linux without a real `chat.db`.
- **Frontend layout (`frontend/src/`):** `App.jsx`, `api.js`, `main.jsx`,
  `styles.css`, `icons.jsx`, and `components/` (`Inbox`, `Dashboard`, `Settings`,
  `Analytics`, `FollowUps`, `Exports`). Vite dev server proxies `/api/*` →
  `http://localhost:8000` (strips the `/api` prefix).
- **Run:**
  - Backend: from `replygraph/backend/` create a venv and
    `pip install -r requirements.txt`, then run from `replygraph/` so the
    `backend` package resolves: `uvicorn backend.main:app --port 8000 --reload`.
    `/health` reports iMessage status.
  - Frontend: from `replygraph/frontend/` run `npm install && npm run dev`
    (http://localhost:5173).
- **Non-negotiable privacy invariants — do not break these:**
  - The Messages DB is opened **read-only**; ReplyGraph never writes to it.
  - **No auto-send.** Copy-to-clipboard only; never AppleScript-send.
  - **Local-only by default.** An LLM is used only when the user sets an API key
    *and* turns off `local_only_mode` (see `draft_generator.py`); otherwise
    offline heuristics are used. Nothing leaves the machine otherwise.
  - Emotional/relationship outputs are **estimates with confidence labels**, never
    stated as facts or diagnoses.
- **Demo vs app:** `demo/index.html` is a standalone static page with fake data
  (what gets published). The real app under `backend/` + `frontend/` is not
  deployed.

---

## Project: BetterAsk (`betterask/`)

Manifest V3 Chrome extension — "autocorrect for AI prompts." Detects vague prompts
in ChatGPT/Claude/Perplexity/Gemini, suggests clearer versions, and audits
responses. Local-first.

- **Stack:** Vite + `vite-plugin-web-extension`, React 18, TypeScript, Tailwind,
  Playwright (smoke test). npm.
- **Layout (`src/`):** organized by extension surface:
  - `background/` — service worker.
  - `content/` — injected scripts: `detector.ts`, `dom.ts`, `floating-ui.tsx`
    (the "✨ fix ask" pill), `response-audit-ui.tsx`, `index.tsx`.
  - `popup/`, `options/`, `dashboard/` — UI surfaces, each with its own
    `index.html` + `index.tsx`.
  - `shared/` — cross-surface logic: `improve.ts`, `heuristics.ts`, `rules.ts`,
    `learning.ts`, `responseAudit.ts`, `api.ts`, `storage.ts`, `reports.ts`,
    `types.ts`, `utils.ts`. Put reusable logic here.
- **`manifest.json`** is the source of truth for permissions, host matches, and
  entry points. Host permissions are limited to the four AI sites; keep
  permissions minimal. `web_accessible_resources` exposes the dashboard.
- **Commands** (from `betterask/`):
  - `npm install`
  - `npm run build` — `prebuild` regenerates icons (`scripts/generate-icons.mjs`),
    then Vite builds to `dist/`. Load `dist/` as an unpacked extension.
  - `npm run dev` — `vite build --watch`.
  - `npm run type-check` — `tsc --noEmit`.
  - `npm run test:smoke` — `node test/smoke.mjs` (Playwright).
  - See `TEST_CHECKLIST.md` for manual QA steps.
- **Conventions:** keep API/LLM use optional — heuristic improvement must work
  with no key (`shared/heuristics.ts` / `improve.ts`). Store events/rules locally
  (`shared/storage.ts`); no tracking or silent network calls. The published
  `dist/` is repackaged into `betterask-extension.zip` at the repo root for the
  download page.

---

## Shared principles (apply to every project)

These are product invariants, not just style preferences:

- **Local-first.** User data stays on the machine by default; nothing leaves it
  unless the user explicitly opts in (e.g. adds their own LLM API key).
- **Read-only where it counts.** Tools touching personal data open it read-only.
- **Honest about estimates.** Anything inferred (tone, relationship signals, token
  costs) is labeled as an estimate with confidence — never stated as fact.
- **No dark patterns.** No tracking, no silent network calls, no auto-sending.
- **Preserve attribution.** Surveillance Radar must keep EFF Atlas attribution and
  its data caveats.

## Working conventions for this repo

- **Stay within one project per change** unless the task is explicitly
  cross-cutting (e.g. the Pages workflow or the portfolio page).
- **Match the local stack.** Surveillance Radar uses **pnpm**; ReplyGraph frontend
  and BetterAsk use **npm**; ReplyGraph backend uses pip + venv. Don't introduce a
  different package manager into a project.
- **Keep READMEs and the portfolio in sync.** If you add/rename a project or change
  how it's built or published, update the root `README.md`, the relevant project
  README, `index.html`, and `.github/workflows/pages.yml` together.
- **Don't commit generated/large artifacts** beyond what's already tracked
  (e.g. `surveillance-radar/data/processed/` is regenerated by `ingest:atlas`;
  real Atlas CSVs are manual downloads and should not be committed).
- **No tests/CI beyond Pages.** There is no test runner wired into CI. Run a
  project's own checks locally (`pnpm lint`, `npm run type-check`,
  `npm run test:smoke`, the ReplyGraph `/health` endpoint) before declaring a
  change done.
