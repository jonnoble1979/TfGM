// scripts/procedures.js

// ---------- State & helpers ----------
let PROCEDURES_DATA = [];
let proceduresLoaded = false;

/**
 * Converts text containing an intro sentence followed by list markers
 * into the required <div class="mandatoryDiv">...</div> structure.
 * Relies on global 'escapeHtml' from defs.js.
 */
function convertTextToMandatoryDiv(item) {
  // Guard: ensure helper exists (you load defs.js first)
  if (typeof escapeHtml !== 'function') {
    console.error("Helper 'escapeHtml' missing from global scope.");
    return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${item.text}</div></div>`;
  }

  const text = item.text ?? '';
  const escapedText = escapeHtml(text);

  // Pattern to find the start of a list (• bullets or 1) 2) ... style)
  const listStartPattern = /(\n• |\n\d+\) )/;
  const parts = escapedText.split(listStartPattern);

  if (parts.length <= 2) {
    return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${escapedText}</div></div>`;
  }

  const introText = parts[0].trim();
  let listItemsHtml = '';
  let listTag = '';

  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = (parts[i] || '').trim();
    const content = parts[i + 1] ? parts[i + 1].trim() : '';

    if (!listTag) {
      listTag = delimiter.includes('•') ? 'ul' : 'ol';
    }
    if (content) {
      const formattedContent = content.replaceAll('\n', '<br>');
      listItemsHtml += `<li>${formattedContent}</li>`;
    }
  }

  if (listItemsHtml) {
    return `
      <div class="mandatoryDiv" data-parano="${item.paraNo}">
        <div>${introText}</div>
        <${listTag}>
          ${listItemsHtml}
        </${listTag}>
      </div>
    `;
  }
  return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${escapedText}</div></div>`;
}

/**
 * Renders a single procedure item.
 */
function renderProcedureItem(item) {
  if (item.mandatory) {
    return convertTextToMandatoryDiv(item);
  } else {
    return `<p data-parano="${item.paraNo}">${escapeHtml(item.text ?? '')}</p>`;
  }
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

  let html = '';

  for (const [heading, subMap] of grouped) {
    html += `<h3 class="procedure-heading">${escapeHtml(heading)}</h3>`;
    for (const [subheading, items] of subMap) {
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
 * Populates Heading and Subheading dropdowns with unique options.
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

  [...headings].sort().forEach(h => {
    headingSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${escapeAttr(h)}">${escapeHtml(h)}</option>`
    );
  });
  [...subheadings].sort().forEach(s => {
    subheadingSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`
    );
  });
}

// ---------- Filtering ----------
/**
 * Declared globally so inline handlers or other code can call it.
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
      const targets = [item.text, item.heading, item.subheading].map(s => String(s ?? '').toLowerCase());
      if (!targets.some(t => t.includes(searchText))) return false;
    }
    return true;
  });

  renderProcedures(filtered);
}

// ---------- Data loading ----------
/**
 * Loads the procedure data from the JSON file.
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
    populateFilters();
    applyFilters();
  } catch (err) {
    proceduresLoaded = true; // finished (failed)
    console.error('Failed to load procedures:', err);
    const el = document.getElementById('procedures-results');
    if (el) {
      el.innerHTML = `
        <p style="color:#b91c1c;padding:20px;border:1px solid #ffdddd;">
          ❌ Failed to load procedures data: <code>${(typeof escapeHtml==='function'?escapeHtml(err.message):String(err.message))}</code>
        </p>`;
    }
  }
}

// ---------- Boot (robust to injected HTML) ----------
(function bootProceduresOncePresent() {
  function tryStart() {
    const container = document.querySelector('.procedure-app-container');
    if (!container) return false;

    // Kick off the loader
    if (typeof loadProcedures === 'function') loadProcedures();

    // Attach live search handler (optional duplicate safety)
    const input = document.getElementById('search-text');
    if (input && !input.__procHooked) {
      input.addEventListener('input', applyFilters);
      input.__procHooked = true;
    }
    return true;
  }

  if (document.readyState !== 'loading') {
    if (tryStart()) return;
  }

  // If injected later, watch for it
  const mo = new MutationObserver(() => {
    if (tryStart()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
