// --- loads HTML into each section  //


function showPage(pageId, filePath) {
    // Hide all sections
    document.querySelectorAll('#content > section').forEach(sec => sec.style.display = 'none');

    // If section already loaded, just show it
    let section = document.getElementById(pageId);
    if (section) {
        section.style.display = 'block';
        window.scrollTo(0, 0);
        return;
    }

    // Otherwise, fetch and inject it
    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error('Section not found');
            return response.text();
        })
        .then(html => {
            const sec = document.createElement('section');
            sec.id = pageId;
            sec.className = 'page active-page';
            sec.innerHTML = html;
            document.getElementById('content').appendChild(sec);
            // Hide others, show this one
            document.querySelectorAll('#content > section').forEach(s => s.style.display = 'none');
            sec.style.display = 'block';
            window.scrollTo(0, 0);
        })
        .catch(err => {
            document.getElementById('content').innerHTML = "<p class='note'>Sorry, that section could not be loaded.</p>";
        });
}

// Optionally, load a default section on page load
window.addEventListener('DOMContentLoaded', function() {
    showPage('home', 'pages/home.html');
});





// --- DEFINITIONS RENDERING AND FILTERING LOGIC ---

// Holds normalized definitions as an array: [{ term, definition }, ...]
let DEFINITIONS = [];

/** Escape helpers to avoid accidental HTML injection */
const escapeHtml = s => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const escapeAttr = escapeHtml;

/** Fetch and normalize JSON from /data/definitions.json */
async function loadDefinitions() {
  try {
    // ✅ Make sure this path matches your actual file name and location
    const res = await fetch('data/definitions.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching definitions.json`);

    const data = await res.json();

    // Normalize: support either an array or an object keyed by term
    if (Array.isArray(data)) {
      // Expecting [{ term: "...", definition: "..." }, ...]
      DEFINITIONS = data
        .filter(d => d && d.term && d.definition)
        .map(d => ({ term: String(d.term), definition: String(d.definition) }));
    } else if (data && typeof data === 'object') {
      // Expecting { "Term": "Definition", ... } OR { "key": {term, definition}, ... }
      DEFINITIONS = Object.entries(data).map(([key, value]) => {
        if (value && typeof value === 'object') {
          return {
            term: String(value.term ?? key),
            definition: String(value.definition ?? '')
          };
        }
        return { term: String(key), definition: String(value) };
      });
    } else {
      throw new Error('Unexpected JSON shape for definitions');
    }

    renderDefinitions(); // initial render
  } catch (err) {
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


// Renders <tr> rows inside <tbody id="definitions-list">
function renderDefinitions(filterTerm = '') {
  const tbody = document.getElementById('definitions-list');
  if (!tbody) return;

  const q = filterTerm.toLowerCase().trim();

  // Build a set of exact terms for quick exact-match detection
  const termSet = new Set(DEFINITIONS.map(d => d.term));
  const isExactFilter = termSet.has(filterTerm);

  const filtered = DEFINITIONS.filter(d => {
    if (!q) return true; // show all if empty
    const t = d.term.toLowerCase();
    const def = d.definition.toLowerCase();
    return isExactFilter
      ? d.term === filterTerm
      : (t.includes(q) || def.includes(q));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">No definitions match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(d => `
    <tr class="definition-item" data-term="${escapeAttr(d.term)}">
      <th scope="row" style="width:35%">${escapeHtml(d.term)}</th>
      <td>${escapeHtml(d.definition)}</td>
    </tr>
  `).join('');
}


// Main filter function called by search input or link click
function filterDefinitions(searchTerm) {
    const searchInput = document.getElementById('definition-search');
    
    if (searchTerm) {
        // If called by a link click, update the search input to reflect the filter
        searchInput.value = searchTerm;
    }
    
    renderDefinitions(searchInput.value);
}

// --- PAGE NAVIGATION LOGIC ---
function showPageOld(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });
    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active-page');
        window.scrollTo(0, 0);
    }
    // Clear any active definition filter when switching main pages
    filterDefinitions('');
}


// --- FILTERING LOGIC FOR TABLES ---
function filterTable(organisation) {
    const table = document.getElementById('responsibilities-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const orgData = row.getAttribute('data-org');
        if (organisation === 'all' || orgData === organisation) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterStageTable(stage) {
    const table = document.getElementById('stages-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const stageData = row.getAttribute('data-stage');
        if (stage === 'all' || stageData === String(stage)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


// --- UTILITY FUNCTIONS ---
function downloadFile(templateName) {
    // Replaces alert() with a custom message box or just logs
    console.log(`Initiating download for: ${templateName}`);
    // In a real application, you would trigger the file download here.
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load all definitions into the sidebar on startup
    renderDefinitions();
    
    // 2. Set the initial page load based on hash or default to 'home'
    const hash = window.location.hash.substring(1);
    const initialPage = hash || 'home';
    showPage(initialPage);
});
