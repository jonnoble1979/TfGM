// scripts/procedures.js
// -------------------------------------------------------------
// Road Safety Audit Procedures – Rendering & Filtering
// Requires: defs.js (escapeHtml, escapeAttr)
// Data file: data/procedures.json
// -------------------------------------------------------------

/* eslint-disable no-console */
'use strict';

// ---------- State ----------
let PROCEDURES_DATA = [];  // full dataset
let proceduresLoaded = false; // fetch completion flag

// ---------- Helpers ----------

/**
 * Build the inner content block for mandatory items (no para number inside).
 * Returns your .mandatoryDiv (badge + content preserved).
 */
function buildMandatoryContent(item) {
  if (typeof escapeHtml !== 'function') {
    console.error("Helper 'escapeHtml' missing from global scope.");
    return `<div class="mandatoryDiv"><div>${item.text ?? ''}</div></div>`;
  }

  const text = item.text ?? '';
  const escapedText = escapeHtml(text);

  // Detect start of list (• bullets or 1) 2) ...)
  const listStartPattern = /(\n• |\n\d+\) )/;
  const parts = escapedText.split(listStartPattern);

  // No list => simple mandatory box with text
  if (parts.length <= 2) {
    return `<div class="mandatoryDiv"><div>${escapedText}</div></div>`;
  }

  const introText = parts[0].trim();
  let listItemsHtml = '';
  let listTag = '';

  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = (parts[i] || '').trim();
    const content = parts[i + 1] ? parts[i + 1].trim() : '';

    if (!listTag) listTag = delimiter.includes('•') ? 'ul' : 'ol';
    if (content) {
      const formattedContent = content.replaceAll('\n', '<br>');
      listItemsHtml += `<li>${formattedContent}</li>`;
    }
  }

  if (listItemsHtml) {
    return `
      <div class="mandatoryDiv">
        <div>${introText}</div>
        <${listTag}>
          ${listItemsHtml}
        </${listTag}>
      </div>
    `;
  }

  return `<div class="mandatoryDiv"><div>${escapedText}</div></div>`;
}

/**
 * Renders a single procedure item with a hanging number column.
 * Left column: para number (always visible in the gutter).
 * Right column: content (mandatory box or plain text).
 */
function renderProcedureItem(item) {
  const paraNo = item.paraNo ?? '';
  const numberHtml = `<span class="para-no">${escapeHtml(paraNo)}</span>`;
  const contentHtml = item.mandatory
    ? buildMandatoryContent(item)                                   // badge stays inside the box
    : `<p class="para-content">${escapeHtml(item.text ?? '')}</p>`; // normal paragraph

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

/**
 * Renders the full list of procedures, grouped by Heading and Subheading.
 */
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

  // Sort headings/subheadings alphabetically for consistent UI
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
      items.forEach(it => {
        html += renderProcedureItem(it);
      });
      html += `</div>`;
    }
  }

  resultsContainer.innerHTML = html;
}

/**
 * Populates the Heading and Subheading dropdowns with unique options.
 * (Clears previous options to avoid duplication on re-load.)
 */
function populateFilters() {
  const headingSelect = document.getElementById('filter-heading');
  const subheadingSelect = document.getElementById('filter-subheading');
  if (!headingSelect || !subheadingSelect) return;

  // Keep the first “All …” option; clear others
  headingSelect.length = 1;
  subheadingSelect.length = 1;

  const headings = new Set();
  const subheadings = new Set();

  PROCEDURES_DATA.forEach(item => {
    if (item.heading) headings.add(item.heading);
    if (item.subheading) subheadings.add(item.subheading);
  });

  [...headings].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach(h => {
      headingSelect.insertAdjacentHTML(
        'beforeend',
        `<option value="${escapeAttr(h)}">${escapeHtml(h)}</option>`
      );
    });

  [...subheadings].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach(s => {
      subheadingSelect.insertAdjacentHTML(
        'beforeend',
        `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`
      );
    });
}

// ---------- Filtering (global for inline handlers) ----------

/**
 * Filters the data based on current UI input.
 * Declared globally to be accessible by HTML inline handlers.
 */
function applyFilters() {
  if (!proceduresLoaded) return;

  const headingFilter = (document.getElementById('filter-heading')?.value) || '';
  const subheadingFilter = (document.getElementById('filter-subheading')?.value) || '';
  const mandatoryFilter = !!(document.getElementById('filter-mandatory')?.checked);
  const searchText = (document.getElementById('search-text')?.value || '').toLowerCase().trim();

  const filtered = PROCEDURES_DATA.filter(item => {
    if (headingFilter && item.heading !== headingFilter) return false;
    if (subheadingFilter && item.subheading !== subheadingFilter) return false;
    if (mandatoryFilter && item.mandatory !== true) return false;

    if (searchText) {
      const targets = [item.text, item.heading, item.subheading]
        .map(s => String(s ?? '').toLowerCase());
      if (!targets.some(t => t.includes(searchText))) return false;
    }
    return true;
  });

  renderProcedures(filtered);
}

// ---------- Data loading ----------

/**
 * Loads the procedure data from the JSON file.
 * Declared globally to be callable from boot logic.
 */
async function loadProcedures() {
  proceduresLoaded = false;
  try {
    // Relative path & correct case (GitHub Pages is case-sensitive)
    const res = await fetch('data/procedures.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching data/procedures.json`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('procedures.json did not return an array');

    PROCEDURES_DATA = data;
    proceduresLoaded = true;

    console.log(`Procedures loaded: ${PROCEDURES_DATA.length}`);
    if (PROCEDURES_DATA.length) {
      console.table(PROCEDURES_DATA.slice(0, 5));
    }

    populateFilters();
    applyFilters(); // Initial render
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
  function wireSearchBox() {
    const input = document.getElementById('search-text');
    if (input && !input.__procHooked) {
      input.addEventListener('input', applyFilters);
      input.__procHooked = true;
    }
  }

  function tryStart() {
    const container = document.querySelector('.procedure-app-container');
    if (!container) return false;

    // Kick off the loader
    if (typeof loadProcedures === 'function') loadProcedures();

    // Attach live search handler
    wireSearchBox();
    return true;
  }

  // If DOM already parsed, try immediately
  if (document.readyState !== 'loading') {
    if (tryStart()) return;
  }

  // Otherwise, watch for the container to be injected
  const mo = new MutationObserver(() => {
    if (tryStart()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

// Expose globals used by inline handlers (if bundlers/minifiers change scope)
window.applyFilters = window.applyFilters || applyFilters;
window.loadProcedures = window.loadProcedures || loadProcedures;
