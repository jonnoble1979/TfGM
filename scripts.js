
/* =========================================================
   App Shell JS (merged & hardened)
   - Keeps your original showPage(filePath) behavior
   - Adds simple sticky header shrink on scroll
   - Guards optional functions to prevent hard failures
   - Supports hash-based navigation (optional, non-breaking)
   ========================================================= */

'use strict';

/**
 * Loads/shows a page section.
 * If the section already exists in #content, it is shown and others are hidden.
 * Otherwise, it fetches the HTML and injects it.
 * @param {string} pageId - the section id to use in the DOM
 * @param {string} [filePath] - optional path to the HTML partial to fetch
 */
function showPage(pageId, filePath) {
  const content = document.getElementById('content');
  if (!content) return;

  // Hide all sections
  document.querySelectorAll('#content > section').forEach(sec => (sec.style.display = 'none'));

  // If section already loaded, just show it
  let section = document.getElementById(pageId);
  if (section) {
    section.style.display = 'block';
    window.scrollTo(0, 0);
    return;
  }

  // Need a file path to fetch if section isn't in DOM yet
  const resolvedPath = filePath || `pages/${pageId}.html`; // sensible default
  fetch(resolvedPath, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Section not found (${response.status})`);
      return response.text();
    })
    .then(html => {
      const sec = document.createElement('section');
      sec.id = pageId;
      sec.className = 'page active-page';
      sec.innerHTML = html;
      content.appendChild(sec);

      // Hide others (safety), show this one
      document.querySelectorAll('#content > section').forEach(s => (s.style.display = 'none'));
      sec.style.display = 'block';

      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error('showPage error:', err);
      content.innerHTML = `<p class="note">Sorry, that section could not be loaded.</p>`;
    });
}

// Legacy function preserved (no change)
function showPageOld(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active-page');
  });
  const newPage = document.getElementById(pageId);
  if (newPage) {
    newPage.classList.add('active-page');
    window.scrollTo(0, 0);
  }
  // Clear any active definition filter when switching main pages (guarded)
  if (typeof filterDefinitions === 'function') {
    filterDefinitions('');
  }
}

/* ------------ FILTERING LOGIC FOR TABLES (unchanged) ------------ */
function filterTable(organisation) {
  const table = document.getElementById('responsibilities-table');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const orgData = row.getAttribute('data-org');
    row.style.display = (organisation === 'all' || orgData === organisation) ? '' : 'none';
  });
}

function filterStageTable(stage) {
  const table = document.getElementById('stages-table');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const stageData = row.getAttribute('data-stage');
    row.style.display = (stage === 'all' || stageData === String(stage)) ? '' : 'none';
  });
}

/* ------------ UTILITIES (unchanged) ------------ */
function downloadFile(templateName) {
  console.log(`Initiating download for: ${templateName}`);
  // Implement actual download trigger here if needed.
}

/* ------------ BOOTSTRAP ------------ */
document.addEventListener('DOMContentLoaded', () => {
  // 1) Definitions sidebar render (guarded)
  if (typeof renderDefinitions === 'function') {
    try { renderDefinitions(); } catch (e) { console.warn('renderDefinitions failed:', e); }
  }

  // Add scoping class to the sidebar defs table (for stacked Term/Definition CSS)
  const defsList = document.getElementById('definitions-list');
  if (defsList) {
    const defsTable = defsList.closest('table');
    if (defsTable) defsTable.classList.add('definitions-table');

    // Wire search input if present
    const input = document.getElementById('definition-search');
    if (input && typeof renderDefinitions === 'function') {
      input.addEventListener('input', (e) => renderDefinitions(e.target.value));
    }
  }

  // 2) Initial page load
  // If the URL has a hash like #about, try load pages/about.html automatically.
  const hashId = (window.location.hash || '').replace('#', '');
  if (hashId) {
    showPage(hashId, `pages/${hashId}.html`);
  } else {
    // Fallback to your original behavior
    showPage('home', 'pages/home.html');
  }

  // Also react to hash changes (optional, harmless if you don’t use it)
  window.addEventListener('hashchange', () => {
    const id = (window.location.hash || '').replace('#', '') || 'home';
    showPage(id, `pages/${id}.html`);
  });

  // 3) Sticky nav: simple shrink on scroll
  const nav = document.getElementById('top-nav');
  if (nav) {
    const THRESHOLD = 10; // px before shrinking
    const updateNavShrink = () => {
      if (window.scrollY > THRESHOLD) nav.classList.add('shrink');
      else nav.classList.remove('shrink');
    };
    updateNavShrink(); // in case page loads scrolled
    window.addEventListener('scroll', updateNavShrink, { passive: true });
  }
});
