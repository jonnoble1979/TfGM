// =========================
// procedures.js (robust loader/normaliser)
// =========================

// ---- Fallbacks if your helpers aren't already present ----
if (typeof escapeHtml !== 'function') {
  window.escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
if (typeof escapeAttr !== 'function') window.escapeAttr = escapeHtml;
if (typeof pickField !== 'function') {
  window.pickField = function pickField(obj, ...names) {
    if (!obj || typeof obj !== 'object') return undefined;
    const keys = Object.keys(obj);
    for (const name of names) {
      if (obj[name] != null) return obj[name];
      const k = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (k && obj[k] != null) return obj[k];
    }
    return undefined;
  };
}

const PROC_APP = document.getElementById('proceduresApp');
const PROC_DATA_URL = (PROC_APP && PROC_APP.dataset && PROC_APP.dataset.src) || 'data/procedures.json';

let PROC_DATA = [];
let PROC_READY = false;

// ---- Small utils ----
const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
const dedupe = arr => Array.from(new Set(arr || []));

function toBool(val) {
  if (typeof val === 'boolean') return val;
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(s)) return true;
  if (['false', 'no', 'n', '0'].includes(s)) return false;
  return null;
}

// Allow <u> from trusted JSON while escaping everything else
function safeHtmlWithUnderline(s) {
  const PH_OPEN = '___OPEN_U___';
  const PH_CLOSE = '___CLOSE_U___';
  const src = String(s || '').replaceAll('<u>', PH_OPEN).replaceAll('</u>', PH_CLOSE);
  const esc = escapeHtml(src);
  return esc.replaceAll(PH_OPEN, '<u>').replaceAll(PH_CLOSE, '</u>');
}

function splitLeadAndBullets(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { lead: '', bullets: [] };
  const lead = lines[0];
  const bullets = [];
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    const m = ln.match(/^([•\-]|\d+[\)\.])\s*(.*)$/);
    if (m) {
      bullets.push(m[2] || '');
    } else if (bullets.length) {
      bullets[bullets.length - 1] += ' ' + ln;
    } else {
      bullets.push(ln);
    }
  }
  return { lead, bullets };
}

// ---- Rendering (same structure as before) ----
function renderMandatory(rec) {
  const { lead, bullets } = splitLeadAndBullets(rec.text);
  const wrapper = document.createElement('div');
  wrapper.className = 'mandatoryDiv';
  wrapper.setAttribute('data-para', rec.paraNo);

  const leadDiv = document.createElement('div');
  leadDiv.innerHTML = safeHtmlWithUnderline(lead);
  wrapper.appendChild(leadDiv);

  if (bullets.length) {
    const ul = document.createElement('ul');
    for (const b of bullets) {
      const li = document.createElement('li');
      li.innerHTML = safeHtmlWithUnderline(b);
      ul.appendChild(li);
    }
    wrapper.appendChild(ul);
  }
  return wrapper;
}

function renderNormal(rec) {
  const div = document.createElement('div');
  div.className = 'comment';
  div.setAttribute('data-para', rec.paraNo);
  div.innerHTML = safeHtmlWithUnderline(rec.text).replace(/\n/g, '<br>');
  return div;
}

function renderResults(records, container) {
  container.innerHTML = '';
  if (!records.length) {
    container.innerHTML = '<div class="emptyState">No results match your filters.</div>';
    return;
  }

  const byHeading = new Map();
  for (const r of records) {
    if (!byHeading.has(r.heading)) byHeading.set(r.heading, new Map());
    const bySub = byHeading.get(r.heading);
    if (!bySub.has(r.subheading)) bySub.set(r.subheading, []);
    bySub.get(r.subheading).push(r);
  }

  const headings = Array.from(byHeading.keys()).sort(naturalCompare);
  for (const h of headings) {
    const hEl = document.createElement('h2');
    hEl.className = 'rsaHeading';
    hEl.textContent = h;
    container.appendChild(hEl);

    const bySub = byHeading.get(h);
    const subs = Array.from(bySub.keys()).sort(naturalCompare);
    for (const s of subs) {
      const sEl = document.createElement('h3');
      sEl.className = 'rsaSubheading';
      sEl.textContent = s;
      container.appendChild(sEl);

      for (const rec of bySub.get(s)) {
        const node = rec.mandatory ? renderMandatory(rec) : renderNormal(rec);
        container.appendChild(node);
      }
    }
  }
}

function populateHeadingDropdown(data, selHeading, selSubheading) {
  const headings = dedupe(data.map(d => d.heading)).sort(naturalCompare);
  selHeading.innerHTML = '<option value="__ALL__">All headings</option>' +
    headings.map(h => `<option value="${escapeAttr(h)}">${escapeHtml(h)}</option>`).join('');
  selSubheading.innerHTML = '<option value="__ALL__">All subheadings</option>';
  selSubheading.disabled = true;
}

function populateSubheadingDropdown(data, currentHeading, selSubheading) {
  let subs;
  if (currentHeading && currentHeading !== '__ALL__') {
    subs = dedupe(data.filter(d => d.heading === currentHeading).map(d => d.subheading)).sort(naturalCompare);
    selSubheading.disabled = false;
  } else {
    subs = dedupe(data.map(d => d.subheading)).sort(naturalCompare);
    selSubheading.disabled = true;
  }
  selSubheading.innerHTML = '<option value="__ALL__">All subheadings</option>' +
    subs.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('');
}

function applyFiltersAndRender({ data, els }) {
  const h = els.heading.value;
  const s = els.subheading.value;
  const mandOnly = els.mandatory.checked;
  const q = els.search.value.trim().toLowerCase();

  let filtered = data.slice();
  if (h !== '__ALL__') filtered = filtered.filter(r => r.heading === h);
  if (s !== '__ALL__' && !els.subheading.disabled) filtered = filtered.filter(r => r.subheading === s);
  if (mandOnly) filtered = filtered.filter(r => r.mandatory === true);
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    filtered = filtered.filter(r => {
      const t = (r.text || '').toLowerCase();
      return terms.every(term => t.includes(term));
    });
  }
  renderResults(filtered, els.results);
}

function clearFilters({ data, els }) {
  els.heading.value = '__ALL__';
  populateSubheadingDropdown(data, '__ALL__', els.subheading);
  els.mandatory.checked = false;
  els.search.value = '';
  applyFiltersAndRender({ data, els });
}

// ---- Robust normaliser ----
function unwrapArrayish(obj) {
  if (Array.isArray(obj)) return obj;

  if (obj && typeof obj === 'object') {
    // Common wrappers
    for (const key of ['records', 'items', 'data', 'value', 'values', 'rows']) {
      if (Array.isArray(obj[key])) return obj[key];
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        // maybe a dict of rows
        const vals = Object.values(obj[key]);
        if (vals.length && typeof vals[0] === 'object') return vals;
      }
    }

    // Single array property objects: { something: [ ... ] }
    const arrayProp = Object.entries(obj).find(([, v]) => Array.isArray(v));
    if (arrayProp) return arrayProp[1];

    // Dict of row objects: { "1": {...}, "2": {...} }
    const vals = Object.values(obj);
    if (vals.length && vals.every(v => v && typeof v === 'object' && !Array.isArray(v))) {
      return vals;
    }
  }
  return [];
}

function normalizeProcedures(input) {
  const raw = unwrapArrayish(input);
  const out = [];
  for (const r of raw) {
    out.push({
      paraNo: String(pickField(r, 'paraNo', 'Paragraph No', 'para', 'id') ?? '').trim(),
      heading: String(pickField(r, 'heading', 'Heading') ?? '').trim(),
      subheading: String(pickField(r, 'subheading', 'Subheading', 'section') ?? '').trim(),
      text: String(pickField(r, 'text', 'Paragraph Text', 'content') ?? ''),
      mandatory: toBool(pickField(r, 'mandatory', 'Mandatory (Boxed)', 'isMandatory'))
    });
  }
  return out;
}

// ---- Loading with inline fallback ----
async function loadProcedures() {
  // Option A: inline JSON fallback
  const inline = document.getElementById('proceduresData');
  if (inline) {
    try {
      const inlineJson = JSON.parse(inline.textContent || '[]');
      return normalizeProcedures(inlineJson);
    } catch (e) {
      console.warn('Inline proceduresData present but invalid JSON, will try fetch.', e);
    }
  }

  // Option B: fetch from URL
  const res = await fetch(PROC_DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${PROC_DATA_URL}`);
  const json = await res.json();
  return normalizeProcedures(json);
}

// ---- Boot ----
function initProceduresUI() {
  const els = {
    heading: document.getElementById('procHeading'),
    subheading: document.getElementById('procSubheading'),
    mandatory: document.getElementById('procMandatory'),
    search: document.getElementById('procSearch'),
    clear: document.getElementById('procClear'),
    results: document.getElementById('procResults')
  };

  if (!els.heading || !els.subheading || !els.mandatory || !els.search || !els.clear || !els.results) {
    console.warn('procedures.js: missing expected DOM nodes');
    return;
  }

  // Debounced search
  let typingTimer = 0;
  els.search.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => applyFiltersAndRender({ data: PROC_DATA, els }), 200);
  });
  els.heading.addEventListener('change', () => {
    populateSubheadingDropdown(PROC_DATA, els.heading.value, els.subheading);
    applyFiltersAndRender({ data: PROC_DATA, els });
  });
  els.subheading.addEventListener('change', () => applyFiltersAndRender({ data: PROC_DATA, els }));
  els.mandatory.addEventListener('change', () => applyFiltersAndRender({ data: PROC_DATA, els }));
  els.clear.addEventListener('click', () => clearFilters({ data: PROC_DATA, els }));

  els.results.innerHTML = '<div class="loading">Loading…</div>';

  loadProcedures()
    .then(data => {
      PROC_DATA = data;
      PROC_READY = true;

      console.log(`Procedures loaded: ${PROC_DATA.length}`);
      console.table(PROC_DATA.slice(0, 10)); // 🔎 sanity preview in console

      if (!PROC_DATA.length) {
        els.results.innerHTML = '<div class="error">Loaded 0 rows. Check the JSON shape and field names.</div>';
        return;
      }

      populateHeadingDropdown(PROC_DATA, els.heading, els.subheading);
      populateSubheadingDropdown(PROC_DATA, '__ALL__', els.subheading);
      applyFiltersAndRender({ data: PROC_DATA, els });
    })
    .catch(err => {
      PROC_READY = true;
      console.error('Failed to load procedures:', err);
      els.results.innerHTML = `<div class="error">Failed to load: ${escapeHtml(err.message)}<br><small>Path checked: ${escapeHtml(PROC_DATA_URL)}</small></div>`;
    });
}

document.addEventListener('DOMContentLoaded', initProceduresUI);
