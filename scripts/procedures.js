// scripts/procedures.js
// -------------------------------------------------------------
// Road Safety Audit Procedures – Rendering & Filtering
// Requires: defs.js (escapeHtml, escapeAttr)
// Data file: data/procedures.json
// -------------------------------------------------------------

/* eslint-disable no-console */
'use strict';

// ---------- State ----------
let PROCEDURES_DATA = [];           // full dataset
let proceduresLoaded = false;       // fetch completion flag

// ---------- Helper: Build mandatory content (keeps your badge box) ----------
function buildMandatoryContent(item) {
  if (typeof escapeHtml !== 'function') {
    console.error("Helper 'escapeHtml' missing from global scope.");
    return `<div class="mandatoryDiv"><div>${item.text ?? ''}</div></div>`;
  }

  const text = item.text ?? '';
  const escapedText = escapeHtml(text);

  // Detect list start (• bullets or 1) 2) ...)
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

// ---------- Rendering ----------
function renderProcedureItem(item) {
  const paraNo = item.paraNo ?? '';
  const numberHtml = `<span class="para-no">${escapeHtml(paraNo)}</span>`;
  const contentHtml = item.mandatory
    ? buildMandatoryContent(item)
    : `<p class="para-content">${escapeHtml(item.text ?? '')}</p>`;

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
function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) =>
    String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' })
  );
}

/**
 * Populate only the Headings initially.
 * Subheadings are populated dynamically based on selected heading.
 */
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

/**
 * Compute and fill subheading options for the currently selected heading.
 * Keeps previous selection if still valid.
 */
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
        item.paraNo,    // 👉 include paragraph number in search
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

    populateFilters();         // headings + initial subheadings
    applyFilters();            // initial render
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

    // Subheading + mandatory already have inline handlers; no extra needed
  }

  function tryStart() {
    const container = document.querySelector('.procedure-app-container');
    if (!container) return false;

    // Kick off the loader
    loadProcedures();

    // Wire the filter controls
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

// Expose globals used by inline handlers (if bundlers/minifiers change scope)
window.applyFilters = window.applyFilters || applyFilters;
window.loadProcedures = window.loadProcedures || loadProcedures;
window.updateSubheadingOptions = window.updateSubheadingOptions || updateSubheadingOptions;
