// ComplaintGraph — CFPB ingest.
//
// Fetches recent complaints for each curated company from the public CFPB
// Consumer Complaint Database and bakes them into static JSON the dashboard
// reads. No API key required. Runs in CI (open internet); the committed sample
// dataset is the fallback if this ever fails.
//
// Usage:  node scripts/ingest-cfpb.mjs
// Env:    CG_MONTHS (lookback window, default 18)
//         CG_MAX_PER_COMPANY (page cap, default 5000)
//
// Docs: https://cfpb.github.io/api/ccdb/api.html

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCompany, COMPANIES } from './lib/analyze.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'data');
const API = 'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';

const MONTHS = Number(process.env.CG_MONTHS || 18);
const MAX_PER_COMPANY = Number(process.env.CG_MAX_PER_COMPANY || 5000);
const PAGE = 100;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function windowDates() {
  const max = new Date();
  const min = new Date(max);
  min.setUTCMonth(min.getUTCMonth() - MONTHS);
  return { min: isoDate(min), max: isoDate(max) };
}

// One page of raw hits for a company.
async function fetchPage(companyName, window, frm) {
  const url = new URL(API);
  url.searchParams.set('company', companyName);
  url.searchParams.set('date_received_min', window.min);
  url.searchParams.set('date_received_max', window.max);
  url.searchParams.set('size', String(PAGE));
  url.searchParams.set('frm', String(frm));
  url.searchParams.set('no_aggs', 'true');
  url.searchParams.set('sort', 'created_date_desc');
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${companyName} (frm=${frm})`);
  const json = await res.json();
  const hits = json?.hits?.hits ?? [];
  const totalRaw = json?.hits?.total;
  const total = typeof totalRaw === 'object' ? totalRaw?.value ?? 0 : totalRaw ?? 0;
  return { hits, total };
}

// Map a CFPB hit `_source` to our normalized record shape.
function normalize(src) {
  return {
    date_received: (src.date_received || '').slice(0, 10),
    product: src.product || '',
    issue: src.issue || '',
    state: src.state || '',
    company_response: src.company_response || '',
    timely: String(src.timely || '').toLowerCase() === 'yes',
    narrative: src.complaint_what_happened || '',
  };
}

async function fetchCompany(company, window) {
  const records = [];
  let frm = 0;
  let total = Infinity;
  while (frm < total && records.length < MAX_PER_COMPANY) {
    const { hits, total: t } = await fetchPage(company.name, window, frm);
    total = t;
    if (!hits.length) break;
    for (const h of hits) records.push(normalize(h._source || {}));
    frm += PAGE;
  }
  return records;
}

async function main() {
  const window = windowDates();
  const snapshotDate = isoDate(new Date());
  await mkdir(join(DATA_DIR, 'companies'), { recursive: true });

  const indexEntries = [];
  let ok = 0;

  for (const company of COMPANIES) {
    try {
      process.stdout.write(`Fetching ${company.displayName}… `);
      const records = await fetchCompany(company, window);
      const built = buildCompany({
        slug: company.slug,
        name: company.name,
        displayName: company.displayName,
        dataSource: 'cfpb',
        snapshotDate,
        window,
        records,
      });
      await writeFile(
        join(DATA_DIR, 'companies', `${company.slug}.json`),
        `${JSON.stringify(built, null, 2)}\n`,
      );
      indexEntries.push({
        slug: company.slug,
        display_name: company.displayName,
        name: company.name,
        kind: company.kind,
        total_complaints: built.total_complaints,
        signal_score: built.signal.score,
        signal_band: built.signal.band,
      });
      ok += 1;
      console.log(`${built.total_complaints} complaints, signal ${built.signal.score}`);
    } catch (err) {
      // Fail loud per-company but keep going; the workflow keeps the committed
      // sample file for any company that errors here.
      console.error(`FAILED: ${company.displayName}: ${err.message}`);
    }
  }

  if (ok === 0) {
    throw new Error('All company fetches failed — keeping committed sample data.');
  }

  const index = {
    generated: snapshotDate,
    data_source: 'cfpb',
    window,
    note: 'Public CFPB Consumer Complaint Database snapshot. Signals are exploratory, not verdicts.',
    companies: indexEntries.sort((a, b) => b.signal_score - a.signal_score),
  };
  await writeFile(join(DATA_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`\nWrote ${ok}/${COMPANIES.length} companies to ${DATA_DIR}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
