// scripts/procedures.js
// -------------------------------------------------------------
// Road Safety Audit Procedures – Rendering & Filtering
// Requires: defs.js (escapeHtml, escapeAttr)
// Data file: data/procedures.json
// -------------------------------------------------------------

/* eslint-disable no-console */
'use strict';

// ---------- State ----------
let PROCEDURES_DATA = [];                // full dataset
let proceduresLoaded = false;            // fetch completion flag
let SUB_DROPDOWN_FIXED_WIDTH_PX = null;  // locked pixel width for subheading <select>

// ---------- Small utilities ----------
function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) =>
    String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' })
  );
}

// ---------- Subheading width helpers ----------
/**
 * Measure how wide a <select> needs to be to fit the widest value.
 * We clone the real select so we get the same fonts, padding, arrow, etc.
 */
function measureSelectWidthForValues(selectEl, values, minPx = 220) {
  if (!selectEl) return minPx;

  // Shallow clone to inherit computed styles (size/appearance), empty options
  const probe = selectEl.cloneNode(false);
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  probe.innerHTML = '';

  // Single OPTION reused for each value
  const opt = document.createElement('option');
  probe.appendChild(opt);
  document.body.appendChild(probe);

  let max = 0;
  for (const v of values) {
    opt.textContent = String(v ?? '');
    // Force layout to get accurate width that includes the select arrow UI
    const w = probe.offsetWidth;
    if (w > max) max = w;
  }

  document.body.removeChild(probe);

  // Small buffer for focus/UA differences
  const buffered = Math.ceil(max + 6);
  return Math.max(minPx, buffered);
}

/**
 * Compute and lock the Subheading select width to the maximum across ALL subheadings.
 * Call this after data load; re-apply in updateSubheadingOptions().
 */
function computeAndLockSubheadingWidth() {
  const subSelect = document.getElementById('filter-subheading');
  if (!subSelect) return;

  const allSubs = uniqueSorted(PROCEDURES_DATA.map(x => x.subheading).filter(Boolean));
  SUB_DROPDOWN_FIXED_WIDTH_PX = measureSelectWidthForValues(subSelect, allSubs, /*minPx*/ 220);
  subSelect.style.width = SUB_DROPDOWN_FIXED_WIDTH_PX + 'px';
}

// ---------- Placeholder → Table (special content) ----------
const RSA_TABLE_TOKEN_RE = /<<\s*insert image of RSA team requirements\s*>>/i;

function hasRsaTeamRequirementsPlaceholder(rawText) {
  return RSA_TABLE_TOKEN_RE.test(String(rawText || ''));
}

function splitOnRsaTablePlaceholder(rawText) {
  return String(rawText || '').split(RSA_TABLE_TOKEN_RE); // [before, after]
}

function renderRsaTeamRequirementsTable() {
  // Static, trusted HTML
  return `
    <table>
      <thead>
        <tr>
          <th>Role</th>
          <th>Training</th>
          <th>Experience</th>
          <th>RSAs Completed</th>
          <th>CPD</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>RSA Team Leader</td>
          <td>10-day course or condensed equivalent</td>
          <td>Minimum 4 years</td>
          <td>At least 5 in past 12 months</td>
          <td>Minimum 2 days in past 12 months</td>
        </tr>
        <tr>
          <td>RSA Team Member</td>
          <td>10-day course or condensed equivalent</td>
          <td>Minimum 1 year</td>
          <td>At least 5 in past 24 months</td>
          <td>Minimum 2 days in past 12 months</td>
        </tr>
        <tr>
          <td>RSA Observer</td>
          <td>2-day course</td>
          <td>Not required</td>
          <td>Not required</td>
          <td>Not required</td>
        </tr>
      </tbody>
    </table>
  `;
}

// ---------- Mandatory content builder (keeps your badge box) ----------
function buildMandatoryContent(item) {
  if (typeof escapeHtml !== 'function') {
    console.error("Helper 'escapeHtml' missing from global scope.");
    return `<div class="mandatoryDiv"><div>${item.text ?? ''}</div></div>`;
  }

  const raw = item.text ?? '';

  // 1) SPECIAL CASE: table placeholder in mandatory paragraph
  if (hasRsaTeamRequirementsPlaceholder(raw)) {
    const [before, after] = splitOnRsaTablePlaceholder(raw);
    const beforeHtml = before && before.trim() ? `<div>${escapeHtml(before.trim())}</div>` : '';
    const afterHtml  = after  && after.trim()  ? `<div>${escapeHtml(after.trim())}</div>`  : '';
    return `
      <div class="mandatoryDiv">
        ${beforeHtml}
        ${renderRsaTeamRequirementsTable()}
        ${afterHtml}
      </div>
    `;
  }

  // 2) Regular mandatory text, possibly with bullet/numbered lists
  const escapedText = escapeHtml(raw);

  // Detect start of list (• bullets or 1) 2) ...)
  const listStartPattern = /(\n• |\n\d+\) )/;
  const parts = escapedText.split(listStartPattern);

  // No list => simple mandatory box with text
  if (parts.length <= 2) {
    return `<div class="mandatoryDiv"><div>${escapedText}</div></div>`;
  }

  // List present => intro + list
  const introText = parts[0].trim();
  let listItemsHtml = '';
  let listTag = '';

  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = (parts[i] || '').trim();
    const content = parts[i + 1] ? parts[i + 1].trim() : '';

    if (!listTag) listTag = delimiter.includes('•') ? 'ul' : 'ol';
    if (content) {
      const formatted = content.replaceAll('\n', '<br>');
      listItemsHtml += `<li>${formatted}</li>`;
    }
  }

  return listItemsHtml
    ? `
      <div class="mandatoryDiv">
        <div>${introText}</div>
        <${listTag}>
          ${listItemsHtml}
        </${listTag}>
      </div>
    `
    : `<div class="mandatoryDiv"><div>${escapedText}</div></div>`;
}

// ---------- Standard content builder (non-mandatory) ----------
function buildStandardContent(item) {
  if (typeof escapeHtml !== 'function') {
    console.error("Helper 'escapeHtml' missing from global scope.");
    return `<p class="para-content">${item.text ?? ''}</p>`;
  }

  const raw = item.text ?? '';

  // SPECIAL CASE: table placeholder
  if (hasRsaTeamRequirementsPlaceholder(raw)) {
    const [before, after] = splitOnRsaTablePlaceholder(raw);
    const beforeHtml = before && before.trim() ? `<div>${escapeHtml(before.trim())}</div>` : '';
    const afterHtml  = after  && after.trim()  ? `<div>${escapeHtml(after.trim())}</div>`  : '';
    // Use a DIV wrapper so the table isn't nested inside <p> (invalid)
    return `
      <div class="para-content">
        ${beforeHtml}
        ${renderRsaTeamRequirementsTable()}
        ${afterHtml}
      </div>
    `;
  }

  // Normal paragraph
  return `<p class="para-content">${escapeHtml(raw)}</p>`;
}

// ---------- Rendering ----------
function renderProcedureItem(item) {
  const paraNo = item.paraNo ?? '';
  const numberHtml = `<span class="para-no">${escapeHtml(paraNo)}</span>`;
  const contentHtml = item.mandatory
    ? buildMandatoryContent(item)
    : buildStandardContent(item);

  return `
    <div class="procedure-item ${item.mandatory ? 'is-mandatory' : ''}"
         data-parano="${escapeAttr(paraNo)}">
      ${numberHtml}
      <div class="para-text">
        ${contentHtml}
      </div>
    </div>
  `;
}

function renderProcedures(data) {
  const resultsContainer = document.getElementById('procedures-results');
  if (!resultsContainer) return;

  if (!proceduresLoaded) {
    resultsContainer.innerHTML = `<p>Loading procedures...</p>`;
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    resultsContainer.innerHTML = '<p>No procedure comments match the current filters.</p>';
    return;
  }

  // Group: Map<Heading, Map<Subheading, Item[]>>
  const grouped = data.reduce((acc, item) => {
    const h = item.heading ?? '';
    const s = item.subheading ?? '';
    if (!acc.has(h)) acc.set(h, new Map());
    const sub = acc.get(h);
    if (!sub.has(s)) sub.set(s, []);
    sub.get(s).push(item);
    return acc;
  }, new Map());

  const sortedHeadings = [...grouped.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  let html = '';

  for (const heading of sortedHeadings) {
    const subMap = grouped.get(heading);
    html += `<h3 class="procedure-heading">${escapeHtml(heading)}</h3>`;

    const sortedSubs = [...subMap.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    for (const subheading of sortedSubs) {
      const items = subMap.get(subheading);
      html += `<h4 class="procedure-subheading">${escapeHtml(subheading)}</h4>`;
      html += `<div class="procedure-group">`;
      items.forEach(it => { html += renderProcedureItem(it); });
      html += `</div>`;
    }
  }

  resultsContainer.innerHTML = html;
}

// ---------- Filters: population & cascading ----------
function populateFilters() {
  const headingSelect = document.getElementById('filter-heading');
  const subheadingSelect = document.getElementById('filter-subheading');
  if (!headingSelect || !subheadingSelect) return;

  // Clear to keep only the "All ..." option
  headingSelect.length = 1;
  subheadingSelect.length = 1;

  const headings = uniqueSorted(PROCEDURES_DATA.map(x => x.heading).filter(Boolean));
  headings.forEach(h => {
    headingSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${escapeAttr(h)}">${escapeHtml(h)}</option>`
    );
  });

  // Fill initial subheadings (no heading selected => all)
  updateSubheadingOptions();
}

function updateSubheadingOptions() {
  const headingSelect = document.getElementById('filter-heading');
  const subheadingSelect = document.getElementById('filter-subheading');
  if (!headingSelect || !subheadingSelect) return;

  const selectedHeading = headingSelect.value;
  const prevSub = subheadingSelect.value;

  // Clear to keep "All Subheadings"
  subheadingSelect.length = 1;

  const subs = uniqueSorted(
    PROCEDURES_DATA
      .filter(item => !selectedHeading || item.heading === selectedHeading)
      .map(item => item.subheading)
      .filter(Boolean)
  );

  subs.forEach(s => {
    subheadingSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`
    );
  });

  // Restore previous subheading if still applicable; otherwise reset to All
  subheadingSelect.value = subs.includes(prevSub) ? prevSub : '';

  // Re-apply locked width so the select doesn't jitter
  if (SUB_DROPDOWN_FIXED_WIDTH_PX) {
    subheadingSelect.style.width = SUB_DROPDOWN_FIXED_WIDTH_PX + 'px';
  }
}

// ---------- Filtering (global for inline handlers) ----------
function applyFilters() {
  if (!proceduresLoaded) return;

  const headingSelect = document.getElementById('filter-heading');
  const subheadingSelect = document.getElementById('filter-subheading');
  const mandatoryCheckbox = document.getElementById('filter-mandatory');
  const searchInput = document.getElementById('search-text');

  const headingFilter = (headingSelect?.value) || '';
  const subheadingFilter = (subheadingSelect?.value) || '';
  const mandatoryFilter = !!(mandatoryCheckbox?.checked);
  const searchText = (searchInput?.value || '').toLowerCase().trim();

  // Filter the base list
  const filtered = PROCEDURES_DATA.filter(item => {
    if (headingFilter && item.heading !== headingFilter) return false;
    if (subheadingFilter && item.subheading !== subheadingFilter) return false;
    if (mandatoryFilter && item.mandatory !== true) return false;

    if (searchText) {
      const targets = [
        item.paraNo,    // include paragraph number in search
        item.text,
        item.heading,
        item.subheading
      ].map(s => String(s ?? '').toLowerCase());
      if (!targets.some(t => t.includes(searchText))) return false;
    }
    return true;
  });

  renderProcedures(filtered);
}

// ---------- Data loading ----------
async function loadProcedures() {
  proceduresLoaded = false;
  try {
    const res = await fetch('data/procedures.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching data/procedures.json`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('procedures.json did not return an array');

    PROCEDURES_DATA = data;
    proceduresLoaded = true;

    console.log(`Procedures loaded: ${PROCEDURES_DATA.length}`);
    if (PROCEDURES_DATA.length) console.table(PROCEDURES_DATA.slice(0, 5));

    populateFilters();                // headings + initial subheadings
    computeAndLockSubheadingWidth();  // lock subheading select width to max across ALL
    applyFilters();                   // initial render
  } catch (err) {
    proceduresLoaded = true; // finished (failed)
    console.error('Failed to load procedures:', err);
    const el = document.getElementById('procedures-results');
    if (el) {
      const esc = (typeof escapeHtml === 'function') ? escapeHtml : (s => String(s));
      el.innerHTML = `
        <p style="color:#b91c1c;padding:20px;border:1px solid #ffdddd;">
          ❌ Failed to load procedures data: <code>${esc(err.message)}</code>
        </p>`;
    }
  }
}

// ---------- Boot (robust to injected HTML) ----------
(function bootProceduresOncePresent() {
  function wireFilterControls() {
    // Update subheadings when the heading changes (then filter)
    const headingSelect = document.getElementById('filter-heading');
    if (headingSelect && !headingSelect.__procHooked) {
      headingSelect.addEventListener('change', () => {
        updateSubheadingOptions();
        applyFilters();
      });
      headingSelect.__procHooked = true;
    }

    // Live search input
    const input = document.getElementById('search-text');
    if (input && !input.__procHooked) {
      input.addEventListener('input', applyFilters);
      input.__procHooked = true;
    }
    // Subheading select & mandatory checkbox already have inline handlers
  }

  function tryStart() {
    const container = document.querySelector('.procedure-app-container');
    if (!container) return false;

    loadProcedures();   // fetch + populate + render
    wireFilterControls();
    return true;
  }

  if (document.readyState !== 'loading') {
    if (tryStart()) return;
  }

  const mo = new MutationObserver(() => {
    if (tryStart()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

// Expose globals used by inline handlers (in case of scope changes)
window.applyFilters = window.applyFilters || applyFilters;
window.loadProcedures = window.loadProcedures || loadProcedures;
window.updateSubheadingOptions = window.updateSubheadingOptions || updateSubheadingOptions;
