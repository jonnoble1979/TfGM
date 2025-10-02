
'use strict';



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
