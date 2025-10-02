
// ---------- State & helpers ----------
let DEFINITIONS = [];      // [{ term, definition }, ...]
let defsLoaded = false;    // tracks whether the fetch completed (success or fail)

const escapeHtml = s => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const escapeAttr = escapeHtml;

// Case-insensitive field picker with synonyms
function pickField(obj, ...names) {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = Object.keys(obj);
  for (const name of names) {
    // direct key
    if (obj[name] != null) return obj[name];
    // case-insensitive match
    const k = keys.find(k => k.toLowerCase() === name.toLowerCase());
    if (k && obj[k] != null) return obj[k];
  }
  return undefined;
}

// Normalize arbitrary shapes to [{ term, definition }]
function normalizeDefinitions(data) {
  const out = [];
  if (Array.isArray(data)) {
    for (const d of data) {
      const term = pickField(d, 'term', 'Term', 'name', 'Name', 'key', 'Key');
      const definition = pickField(d, 'definition', 'Definition', 'description', 'Description', 'text', 'Text', 'desc', 'Desc', 'definitionText');
      if (term && definition != null) {
        out.push({ term: String(term), definition: String(definition) });
      }
    }
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object') {
        const term = pickField(value, 'term', 'Term', 'name', 'Name', 'key', 'Key') ?? key;
        const definition = pickField(value, 'definition', 'Definition', 'description', 'Description', 'text', 'Text', 'desc', 'Desc', 'definitionText');
        if (definition != null) {
          out.push({ term: String(term), definition: String(definition) });
        }
      } else {
        // { "Term": "Definition" } style
        out.push({ term: String(key), definition: String(value) });
      }
    }
  }
  // Sort A–Z by term for a stable UI
  out.sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
  return out;
}

// ---------- Data loading ----------
async function loadDefinitions() {
  defsLoaded = false;
  try {
    // ✅ Ensure the filename/path is exactly correct (case-sensitive on many hosts)
    const res = await fetch('data/definitions.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching definitions.json`);
    const data = await res.json();

    DEFINITIONS = normalizeDefinitions(data);
    defsLoaded = true;

    console.log(`Definitions loaded: ${DEFINITIONS.length}`);
    console.table(DEFINITIONS.slice(0, 10)); // preview first 10 in console

    renderDefinitions(); // initial render with all items
  } catch (err) {
    defsLoaded = true; // load finished (failed)
    console.error('Failed to load definitions:', err);
    const tbody = document.getElementById('definitions-list');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="2" style="color:#b91c1c">
          Failed to load definitions: ${escapeHtml(err.message)}
        </td></tr>`;
    }
  }
}

// ---------- Rendering ----------

function renderDefinitions(filterTerm = '') {
  const tbody = document.getElementById('definitions-list');
  if (!tbody) return;

  // Show loading state if fetch not done yet
  if (!defsLoaded) {
    tbody.innerHTML = `<tr><td colspan="2">Loading definitions…</td></tr>`;
    return;
  }

  // No data at all (e.g., JSON empty or all rows filtered out by normalization)
  if (DEFINITIONS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">No definitions available.</td></tr>`;
    return;
  }

  const q = filterTerm.toLowerCase().trim();

  // Exact filter if the raw term exists (e.g., when clicking a term)
  const termSet = new Set(DEFINITIONS.map(d => d.term));
  const isExactFilter = termSet.has(filterTerm);

  const filtered = DEFINITIONS.filter(d => {
    if (!q) return true; // no query => all
    const t = d.term.toLowerCase();
    const def = d.definition.toLowerCase();
    return isExactFilter ? d.term === filterTerm : (t.includes(q) || def.includes(q));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">No definitions match your search.</td></tr>`;
    return;
  }

  // NOTE: removed inline width and added classes for targeted CSS
  tbody.innerHTML = filtered.map(d => `
    <tr class="definition-item" data-term="${escapeAttr(d.term)}">
      <th scope="row" class="term">${escapeHtml(d.term)}</th>
      <td class="definition">${escapeHtml(d.definition)}</td>
    </tr>
  `).join('');
}


// Keep your inline handler working
function filterDefinitionsSidebar() {
  const input = document.getElementById('definition-search');
  renderDefinitions(input ? input.value : '');
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  loadDefinitions();

  // If you also want an event listener (not just inline HTML oninput)
  const input = document.getElementById('definition-search');
  if (input) {
    input.addEventListener('input', (e) => renderDefinitions(e.target.value));
  }
});

//for the render
document.addEventListener('DOMContentLoaded', () => {
  loadDefinitions();

  // Keep the inline handler working
  const input = document.getElementById('definition-search');
  if (input) {
    input.addEventListener('input', (e) => renderDefinitions(e.target.value));
  }

  // 🔖 Add a scoping class to the sidebar defs table (no HTML change needed)
  const list = document.getElementById('definitions-list');
  if (list) {
    const table = list.closest('table');
    if (table) {
      table.classList.add('definitions-table');
    }
  }

