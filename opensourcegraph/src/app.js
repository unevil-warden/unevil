// OpenSourceGraph — dashboard front-end. Vanilla JS, no dependencies.
// Reads the baked static JSON in ./data/ and renders everything with inline SVG.

const DATA = './data';
const cache = new Map();
const state = { index: null, compareMode: false, selected: null, compareSel: [null, null] };

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Risk band → color. Higher score = more reason to look closer.
function bandColor(band) {
  return { Low: 'var(--green)', Moderate: 'var(--gold)', Elevated: 'var(--amber)', High: 'var(--red)' }[band] || 'var(--t2)';
}
function bandBg(band) {
  return {
    Low: 'rgba(0,229,160,.10)', Moderate: 'rgba(245,197,24,.12)',
    Elevated: 'rgba(255,180,84,.12)', High: 'rgba(255,107,107,.12)',
  }[band] || 'var(--s2)';
}

async function fetchJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const json = await res.json();
  cache.set(url, json);
  return json;
}
const loadPackage = (slug) => fetchJSON(`${DATA}/packages/${slug}.json`);

// ---------------------------------------------------------------------------
// SVG charts
// ---------------------------------------------------------------------------

// Donut gauge for the 0–100 signal score.
function gauge(score, band) {
  const r = 58, c = 70, circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, score / 100));
  const color = bandColor(band);
  return `
  <div class="gauge">
    <svg viewBox="0 0 140 140" aria-label="Risk signal ${score} of 100">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="11"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${circ}"
        stroke-dashoffset="${circ * (1 - frac)}" transform="rotate(-90 ${c} ${c})"/>
    </svg>
    <div class="num"><b style="color:${color}">${score}</b><span>/ 100 risk</span></div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Leaderboard + chips
// ---------------------------------------------------------------------------
function renderBadge() {
  const badge = $('#sourceBadge');
  const idx = state.index;
  if (idx.data_source === 'sample') {
    badge.className = 'badge sample';
    badge.textContent = `Sample data · ${idx.packages.length} packages`;
    badge.title = idx.note || '';
  } else {
    badge.className = 'badge';
    badge.textContent = `Live snapshot · ${idx.generated}`;
    badge.title = idx.note || '';
  }
}

function renderLeaderboard() {
  const board = $('#leaderboard');
  board.innerHTML = '';
  const q = $('#search').value.trim().toLowerCase();
  const rows = state.index.packages.filter(
    (p) => !q || p.display_name.toLowerCase().includes(q) || p.ecosystem.toLowerCase().includes(q) || (p.repo || '').toLowerCase().includes(q),
  );
  if (!rows.length) {
    board.appendChild(el('div', 'empty', 'No matching packages.'));
    return;
  }
  rows.forEach((p, i) => {
    const row = el('button', 'lb-row');
    row.innerHTML = `
      <span class="lb-rank">${String(i + 1).padStart(2, '0')}</span>
      <span class="lb-name">${esc(p.display_name)}<span class="eco-tag">${esc(p.ecosystem)}</span><small>${esc(p.repo || '')}</small></span>
      <span class="lb-vol">${p.health_score}<small>health</small></span>
      <span class="score-pill" style="color:${bandColor(p.signal_band)};background:${bandBg(p.signal_band)}">
        ${p.signal_score}<small>${p.signal_band} risk</small></span>`;
    row.addEventListener('click', () => selectPackage(p.slug));
    board.appendChild(row);
  });
}

function renderChips() {
  const wrap = $('#packageChips');
  wrap.innerHTML = '';
  state.index.packages.forEach((p) => {
    const chip = el('button', 'chip');
    chip.dataset.slug = p.slug;
    chip.innerHTML = `<span class="dot" style="background:${bandColor(p.signal_band)}"></span>${esc(p.display_name)}`;
    chip.addEventListener('click', () => {
      if (state.compareMode) toggleCompare(p.slug);
      else selectPackage(p.slug);
    });
    wrap.appendChild(chip);
  });
}
function syncChips() {
  document.querySelectorAll('.chip').forEach((chip) => {
    const s = chip.dataset.slug;
    const active = state.compareMode ? state.compareSel.includes(s) : state.selected === s;
    chip.classList.toggle('active', active);
  });
}

// A sub-signal row: value bar + evidence + source + confidence label.
function signalComponent(cmp, color) {
  return `
    <div class="sig-comp">
      <div class="sc-top">
        <span class="sc-label">${esc(cmp.label)} <span class="sc-weight">× ${cmp.weight}</span></span>
        <span class="sc-val">${cmp.value}/100</span>
      </div>
      <div class="meter"><div style="width:${cmp.value}%;background:${color}"></div></div>
      <div class="sc-ev">${esc(cmp.evidence)}</div>
      <div class="sc-meta">
        <span class="tag src">${esc(cmp.source)}</span>
        <span class="tag conf-${esc(cmp.confidence)}">${esc(cmp.confidence)} confidence</span>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------
async function selectPackage(slug) {
  state.selected = slug;
  syncChips();
  const p = await loadPackage(slug);
  const d = $('#detail');
  d.hidden = false;
  $('#compare').hidden = true;

  const sig = p.signal;
  const color = bandColor(sig.band);
  const f = p.facts;
  const repoHref = p.repo ? `https://github.com/${p.repo}` : null;
  const lic = sig.components.find((c) => c.key === 'license_risk');

  d.innerHTML = `
    <button class="back" id="backBtn">← back to leaderboard</button>
    <div class="dhead">
      <div>
        <h2>${esc(p.display_name)} <span class="eco-tag">${esc(p.ecosystem)}</span></h2>
        <div class="cfpb-name">${repoHref ? `repo: <a href="${esc(repoHref)}" target="_blank" rel="noopener">${esc(p.repo)}</a> · ` : ''}snapshot ${esc(p.snapshot_date)}</div>
      </div>
    </div>

    <div class="summary">${esc(p.summary)}</div>

    <div class="grid">
      <div class="card">
        <h3>Health / risk signal</h3>
        <div class="gauge-wrap">
          ${gauge(sig.score, sig.band)}
          <div>
            <span class="band-tag" style="color:${color};background:${bandBg(sig.band)}">${sig.band} risk</span>
            <p class="gauge-note">A transparent 0–100 score blending five public-data sub-signals (below).
            Higher means more reason to look closer — health reads as <strong>${sig.health_score}/100</strong>.
            This is <strong>not</strong> a verdict or an endorsement.</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>At a glance</h3>
        <div class="kpi-row">
          <div class="kpi"><div class="v">${f.scorecard ? f.scorecard.score : '—'}</div><div class="l">OpenSSF Scorecard</div></div>
          <div class="kpi"><div class="v">${f.vulns ? f.vulns.count : '—'}</div><div class="l">Known vulns</div></div>
        </div>
        <div class="kpi-row" style="margin-bottom:0">
          <div class="kpi"><div class="v">${f.maintenance && f.maintenance.last_release_days != null ? f.maintenance.last_release_days + 'd' : '—'}</div><div class="l">Since last release</div></div>
          <div class="kpi"><div class="v">${f.bus_factor ? Math.round(f.bus_factor.top_share * 100) + '%' : '—'}</div><div class="l">Top contributor</div></div>
        </div>
      </div>

      <div class="card full">
        <h3>How the health / risk signal is calculated</h3>
        ${sig.components.map((cmp) => signalComponent(cmp, color)).join('')}
        <p class="gauge-note" style="margin-top:14px">
          Score = Σ (value × weight). Each factor is in risk-direction (higher = more reason to look closer),
          with its named source and a confidence label. Low confidence means a source was missing — not that the project is fine.
        </p>
      </div>

      <div class="card">
        <h3>License</h3>
        <div class="kpi" style="min-width:auto">
          <div class="v" style="font-size:18px">${esc(f.license?.spdx_id || 'Unknown')}</div>
          <div class="l">${esc(lic.evidence)}</div>
        </div>
      </div>
      <div class="card">
        <h3>Maintenance</h3>
        <div class="kpi-row" style="margin-bottom:0">
          <div class="kpi"><div class="v">${f.maintenance && f.maintenance.last_commit_days != null ? f.maintenance.last_commit_days + 'd' : '—'}</div><div class="l">Since last commit</div></div>
          <div class="kpi"><div class="v">${f.maintenance && f.maintenance.releases_past_year != null ? f.maintenance.releases_past_year : '—'}</div><div class="l">Releases / yr</div></div>
        </div>
      </div>
    </div>`;

  $('#backBtn').addEventListener('click', () => {
    d.hidden = true;
    state.selected = null;
    syncChips();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  d.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// Compare view
// ---------------------------------------------------------------------------
function toggleCompare(slug) {
  const sel = state.compareSel;
  const i = sel.indexOf(slug);
  if (i >= 0) sel[i] = null;
  else if (!sel[0]) sel[0] = slug;
  else if (!sel[1]) sel[1] = slug;
  else sel[1] = slug; // replace second
  syncChips();
  renderCompare();
}

async function renderCompare() {
  const box = $('#compare');
  box.hidden = false;
  $('#detail').hidden = true;
  const [a, b] = state.compareSel;
  if (!a || !b) {
    box.innerHTML = `<div class="empty">Pick two packages above to compare them side by side.</div>`;
    return;
  }
  const [pa, pb] = await Promise.all([loadPackage(a), loadPackage(b)]);
  const col = (p) => {
    const color = bandColor(p.signal.band);
    return `
    <div class="card">
      <h3>${esc(p.display_name)} <span class="eco-tag">${esc(p.ecosystem)}</span></h3>
      <div class="gauge-wrap" style="margin-bottom:14px">
        ${gauge(p.signal.score, p.signal.band)}
        <span class="band-tag" style="color:${color};background:${bandBg(p.signal.band)}">${p.signal.band} · health ${p.signal.health_score}</span>
      </div>
      ${p.signal.components.map((cmp) => signalComponent(cmp, color)).join('')}
    </div>`;
  };
  box.innerHTML = `<div class="cmp-grid">${col(pa)}${col(pb)}</div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  try {
    state.index = await fetchJSON(`${DATA}/index.json`);
  } catch (err) {
    $('#leaderboard').innerHTML = `<div class="empty">Could not load data (${esc(err.message)}).<br>
      Serve this folder over HTTP — e.g. <code>npx serve opensourcegraph/src</code> — rather than opening the file directly.</div>`;
    return;
  }
  renderBadge();
  renderChips();
  renderLeaderboard();

  $('#search').addEventListener('input', renderLeaderboard);
  $('#compareToggle').addEventListener('change', (e) => {
    state.compareMode = e.target.checked;
    $('#boardLabel').textContent = state.compareMode ? 'Pick two to compare' : 'Risk leaderboard';
    state.compareSel = [null, null];
    state.selected = null;
    syncChips();
    if (state.compareMode) {
      $('#detail').hidden = true;
      renderCompare();
    } else {
      $('#compare').hidden = true;
    }
  });
}

boot();
