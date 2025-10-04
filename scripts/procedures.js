// ---------- Flexible element resolution (NEW) ----------
function findWithin(root, fallbackId, ...selectors) {
  // Try data-role/class/selector inside the root first, then fallback to ID in the whole doc
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  if (fallbackId) {
    const byId = document.getElementById(fallbackId);
    if (byId) return byId;
  }
  return null;
}

function listMissing(els) {
  const missing = Object.entries(els)
    .filter(([, el]) => !el)
    .map(([k]) => k);
  return missing;
}

// ---- Boot (REPLACED) ----
function initProceduresUI() {
  // Root: prefer #proceduresApp, else allow data-procedures-root on any element
  const root = document.getElementById('proceduresApp') ||
               document.querySelector('[data-procedures-root]');
  if (!root) {
    console.warn('procedures.js: missing root (#proceduresApp or [data-procedures-root])');
    return;
  }

  // Allow overriding data source via data-src on root
  const src = root.dataset && root.dataset.src;
  if (src) {
    // global constant used by loader
    window.PROC_DATA_URL = src;
  }

  // Resolve required nodes.
  // Preferred: data-role selectors inside the root. Fallback: legacy IDs anywhere in document.
  const els = {
    heading:    findWithin(root, 'procHeading',    '[data-role="heading"]',    '#procHeading'),
    subheading: findWithin(root, 'procSubheading', '[data-role="subheading"]', '#procSubheading'),
    mandatory:  findWithin(root, 'procMandatory',  '[data-role="mandatory"]',  '#procMandatory', 'input[type="checkbox"][name="mandatory"]'),
    search:     findWithin(root, 'procSearch',     '[data-role="search"]',     '#procSearch', 'input[type="search"][name="search"]'),
    clear:      findWithin(root, 'procClear',      '[data-role="clear"]',      '#procClear', 'button[name="clear"]'),
    results:    findWithin(root, 'procResults',    '[data-role="results"]',    '#procResults')
  };

  const missing = listMissing(els);
  if (missing.length) {
    console.warn('procedures.js: missing expected DOM nodes:', missing);
    // Give a friendly hint on how to wire them without changing your markup:
    console.warn('Tip: add data-role="heading|subheading|mandatory|search|clear|results" to your existing controls, inside #proceduresApp.');
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

  // Initial state and load
  els.results.innerHTML = '<div class="loading">Loading…</div>';

  loadProcedures()
    .then(data => {
      PROC_DATA = data;
      PROC_READY = true;

      console.log(`Procedures loaded: ${PROC_DATA.length}`);
      console.table(PROC_DATA.slice(0, 10)); // sanity preview

      if (!PROC_DATA.length) {
        els.results.innerHTML = '<div class="error">Loaded 0 rows. Check JSON shape/fields.</div>';
        return;
      }

      populateHeadingDropdown(PROC_DATA, els.heading, els.subheading);
      populateSubheadingDropdown(PROC_DATA, '__ALL__', els.subheading);
      applyFiltersAndRender({ data: PROC_DATA, els });
    })
    .catch(err => {
      PROC_READY = true;
      console.error('Failed to load procedures:', err);
      els.results.innerHTML = `<div class="error">Failed to load: ${escapeHtml(err.message)}<br><small>Path checked: ${escapeHtml(window.PROC_DATA_URL || 'data/procedures.json')}</small></div>`;
    });
}

document.addEventListener('DOMContentLoaded', initProceduresUI);
