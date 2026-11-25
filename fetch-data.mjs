#!/usr/bin/env node
// Fetch Taskmarket market data server-side and write JSON snapshots into data/.
// Runs hourly via GitHub Actions (refresh.yml). No keys needed: the API is public.
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://api.taskmarket.dev';
const CHAINS = [4217, 8453]; // Tempo, Base
const RANGES = ['7d', '30d', '90d', 'all'];

async function get(path) {
  const res = await fetch(BASE + path, { headers: { 'User-Agent': 'tm-visualizer/1.0' } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

mkdirSync('data', { recursive: true });
const fetchedAt = new Date().toISOString();
const out = { fetchedAt, chains: {} };

for (const chainId of CHAINS) {
  const c = {};
  c.stats = await get(`/api/market/stats?chainId=${chainId}`);
  c.breakdowns = await get(`/api/stats/breakdowns?chainId=${chainId}`);
  for (const range of RANGES) {
    c[`timeseries_${range}`] = await get(`/api/stats/platform-time-series?chainId=${chainId}&range=${range}&bucket=day`);
  }
  c.heatmap_mode_30d = await get(`/api/stats/activity-heatmap?chainId=${chainId}&range=30d&dimension=mode`);
  c.heatmap_hour_30d = await get(`/api/stats/activity-heatmap?chainId=${chainId}&range=30d&dimension=hourOfWeek`);
  c.feed = await get(`/api/stats/activity-feed?chainId=${chainId}&limit=50`);
  // distinct posters per week: page through recent tasks
  const posters = new Map();
  let cursor = null;
  for (let page = 0; page < 5; page++) {
    let p = `/api/tasks?chainId=${chainId}&sort=newest&limit=100`;
    if (cursor) p += `&cursor=${encodeURIComponent(cursor)}`;
    const d = await get(p);
    const list = d.tasks || [];
    for (const t of list) {
      const code = t.referenceCode || t.id;
      const created = t.createdAt || '';
      if (!created) continue;
      posters.set(code, { requester: t.requester, created, reward: t.reward ?? null, mode: t.mode ?? null, status: t.status ?? null });
    }
    cursor = d.nextCursor || d.cursor;
    if (!cursor || list.length < 100) break;
  }
  c.tasksRecent = [...posters.values()];
  out.chains[chainId] = c;
}

out.distinctPostersPerWeek = computeWeeklyPosters(out);
writeFileSync('data/snapshot.json', JSON.stringify(out));

function computeWeeklyPosters(o) {
  const weeks = {};
  for (const [chainId, c] of Object.entries(o.chains)) {
    for (const t of c.tasksRecent || []) {
      const d = new Date(t.created);
      if (isNaN(d)) continue;
      const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); // Monday
      const key = dt.toISOString().slice(0, 10);
      weeks[key] ??= {};
      weeks[key][chainId] ??= new Set();
      weeks[key][chainId].add(t.requester);
    }
  }
  return Object.fromEntries(Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([cid, s]) => [cid, s.size]))]));
}
