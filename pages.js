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

  // Remove any previous transient error messages
  content.querySelectorAll('.load-error').forEach(n => n.remove());

  // Hide all already-loaded sections
  document.querySelectorAll('#content > section').forEach(sec => (sec.style.display = 'none'));

  // If section already loaded, just show it
  let section = document.getElementById(pageId);
  if (section) {
    section.style.display = 'block';
    window.scrollTo(0, 0);
    return;
  }

  // Build path
  const resolvedPath = filePath || (pageId ? `pages/${pageId}.html` : null);
  if (!resolvedPath) {
    console.warn('showPage called without a pageId/filePath');
    return;
  }

  console.info('[showPage] request', { pageId, resolvedPath });

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

      // Remove any previous error notes now that we have a good page
      content.querySelectorAll('.load-error').forEach(n => n.remove());

      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error('showPage error:', err);
      const note = document.createElement('p');
      note.className = 'note load-error';
      note.textContent = 'Sorry, that section could not be loaded.';
      content.prepend(note);
    });


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
