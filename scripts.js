
App Shell JS
   - Hash-based page loader with fetch & section caching
   - Simple sticky header shrink on scroll
   - Existing table filter utilities preserved
   ========================================================= */

'use strict';

// ---------------- ROUTING ----------------
// Map logical page IDs to their HTML partials.
const ROUTES = {
  home: 'pages/home.html',
  // Add your pages here:
  // about: 'pages/about.html',
  // contact: 'pages/contact.html',
  // etc.
};

// --------------- PAGE LOADER ---------------
/**
 * Loads/shows a page section. If the section already exists in #content,
 * it is shown and others are hidden. Otherwise, it fetches the HTML and injects it.
 * Supports optional filePath override for backward compatibility.
 */
function showPage(pageId, filePathOverride) {
  const content = document.getElementById('content');
  if (!content) return;

  // Hide all existing sections
  content.querySelectorAll('#content > section').forEach(sec => {
    sec.style.display = 'none';
  });

  // If section already loaded, just show it
  let section = document.getElementById(pageId);
  if (section) {
    section.style.display = 'block';
    // Update hash (without adding history entry)
    if (location.hash.slice(1) !== pageId) {
      history.replaceState(null, '', `#${pageId}`);
    }
    window.scrollTo(0, 0);
    return;
  }

  // Determine file path to fetch
  const filePath = filePathOverride ?? ROUTES[pageId];
  if (!filePath) {
    content.innerHTML = `<p class="note">Sorry, that section could not be loaded.</p>`;
    return;
  }

  // Fetch and inject the page
  fetch(filePath)
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
      content.querySelectorAll('#content > section').forEach(s => (s.style.display = 'none'));
      sec.style.display = 'block';

      // Update hash (without adding history entry)
      if (location.hash.slice(1) !== pageId) {
        history.replaceState(null, '', `#${pageId}`);
      }

      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error(err);
      content.innerHTML = `<p class="note">Sorry, that section could not be loaded.</p>`;
    });
}

// Expose for inline handlers if needed
window.showPage = showPage;

// Helper: show based on current hash (defaults to 'home')
function showPageFromHash() {
  const pageId = (window.location.hash || '').replace(/^#/, '') || 'home';
  showPage(pageId);
}

// --------------- LEGACY NAV (kept for reference) ---------------
function showPageOld(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active-page');
  });
  const newPage = document.getElementById(pageId);
  if (newPage) {
    newPage.classList.add('active-page');
    window.scrollTo(0, 0);
  }
  // Clear any active definition filter when switching main pages (if function exists)
  if (typeof filterDefinitions === 'function') {
    filterDefinitions('');
  }
}

// --------------- TABLE FILTERS (unchanged) ---------------
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

// --------------- UTILITIES (unchanged) ---------------
function downloadFile(templateName) {
  console.log(`Initiating download for: ${templateName}`);
  // Implement actual download trigger here if needed.
}

// --------------- BOOTSTRAP ---------------
document.addEventListener('DOMContentLoaded', () => {
  // 1) Definitions sidebar render (if functions/elements exist)
  if (typeof renderDefinitions === 'function') {
    try { renderDefinitions(); } catch (e) { console.warn('renderDefinitions failed:', e); }
  }
  // Add scoping class to the sidebar defs table for CSS stacking (if present)
  const defsList = document.getElementById('definitions-list');
  if (defsList) {
    const defsTable = defsList.closest('table');
    if (defsTable) defsTable.classList.add('definitions-table');
    // Wire search input if present (keeps both inline and JS listeners working)
    const input = document.getElementById('definition-search');
    if (input && typeof renderDefinitions === 'function') {
      input.addEventListener('input', e => renderDefinitions(e.target.value));
    }
  }

  // 2) Page routing
  showPageFromHash();                      // initial load (uses ROUTES map)
  window.addEventListener('hashchange', showPageFromHash);

  // 3) Sticky nav: simple shrink on scroll
  const nav = document.getElementById('top-nav');
  if (nav) {
    const THRESHOLD = 10; // px before shrinking
    const updateNavShrink = () => {
      if (window.scrollY > THRESHOLD) {
        nav.classList.add('shrink');
      } else {
        nav.classList.remove('shrink');
      }
    };
    updateNavShrink(); // in case the page loads scrolled
    window.addEventListener('scroll', updateNavShrink, { passive: true });

    // OPTIONAL: make body top padding match header height exactly (uncomment if you used CSS var approach)
    // const setNavSpace = () => {
    //   document.documentElement.style.setProperty('--nav-space', `${nav.offsetHeight}px`);
    // };
    // setNavSpace();
    // window.addEventListener('resize', setNavSpace);
    // window.addEventListener('scroll', setNavSpace, { passive: true });
  }
});
