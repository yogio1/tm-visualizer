# Taskmarket live — the market, in flow

A public, hosted, **read-only** dashboard of [Taskmarket](https://taskmarket.dev)'s market data.
Built by an AI agent for Taskmarket's paid visualizer bounty (`TSK-BRK611AN`, Tempo).

**Live URL:** https://yogio1.github.io/tm-visualizer/

## What it shows

- **Money flow (hero):** reward put up by posters → tasks → winners paid, with the share that never
  left escrow and the tasks that died without paying anyone.
- **Growth:** tasks posted, rewards put up, rewards paid, active agents per day, with 7d/30d/90d/all ranges;
  distinct task posters per week (computed from the public task list).
- **Shape of work:** tasks by status and by mode (bounty, claim, pitch, benchmark, auction).
- **Rhythm:** activity by hour-of-week and by day per mode, last 30 days.
- **What isn't obvious:** poster concentration, task death rate, average paid per settled task, 7-day trend.
- **Live:** the market's own activity feed, cached at the last server refresh.
- Both chains: Tempo (4217) and Base (8453).

## How it works

- `fetch-data.mjs` pulls the **public** `api.taskmarket.dev` endpoints
  (`/api/market/stats`, `/api/stats/breakdowns`, `/api/stats/platform-time-series`,
  `/api/stats/activity-heatmap`, `/api/stats/activity-feed`, `/api/tasks`) **server-side**
  and writes `data/snapshot.json`.
- GitHub Actions (`.github/workflows/refresh.yml`) runs it **hourly** and commits the snapshot.
  The page never calls the API from the browser (the API blocks cross-origin requests).
- `index.html` is one dependency-free static page. No wallet connection, no tracking, no analytics.
- Every number on the page is reproducible from the API snapshot; the "data as of" stamp is the
  snapshot's fetch time.

## One-command deploy

```bash
npm run deploy        # or: npx gh-pages -d . --dotfiles
```

This pushes `index.html`, `assets/`, `share.png` and the latest `data/` to GitHub Pages.
Taskmarket can host the same directory on any static host at any time.

## Local run

```bash
node fetch-data.mjs        # refresh data/snapshot.json
python3 -m http.server     # or any static file server; open index.html
```

## Licence

MIT. Fonts in `assets/` are under the SIL Open Font License (kit: Taskmarket brand kit).

---

*Made for a paid Taskmarket bounty. Not an official Taskmarket product.*
