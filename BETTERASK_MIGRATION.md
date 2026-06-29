# BetterAsk → standalone `betterask` repo

This prepares the `betterask/` Chrome extension (in this monorepo) as a
standalone, ready-to-push project with its own git history.

## Deliverables

- **`betterask.bundle`** — a git bundle of the standalone project (single
  `main` branch, one initial commit). Clone from it, point it at your
  `betterask` repo, and push.
- A zip of the working tree was also produced and sent in chat for
  convenience (no git history).

The only change from the in-repo copy is the README Quick Start, which no
longer assumes a `cd betterask` subdirectory.

## Push it to the betterask repo

```bash
# 1. Clone the standalone history out of the bundle
git clone betterask.bundle betterask
cd betterask

# 2. Point origin at your real betterask repo (create it on GitHub first)
git remote set-url origin git@github.com:<owner>/betterask.git
#   or: git remote set-url origin https://github.com/<owner>/betterask.git

# 3. Push
git push -u origin main
```

## Verify the bundle (optional)

```bash
git bundle verify betterask.bundle
```

## Build & load the extension

```bash
npm install
npm run build      # outputs dist/
# chrome://extensions → Developer Mode → Load Unpacked → select dist/
```
