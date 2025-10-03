
function showPage(pageId, filePath) {
  const content = document.getElementById('content');
  if (!content) return;

  // Remove previous transient messages from earlier attempts
  content.querySelectorAll('.load-error, .load-info').forEach(n => n.remove());

  // Helper: all already-loaded sections
  const getSections = () => Array.from(content.querySelectorAll('#content > section'));

  // If already loaded, just switch visibility
  const already = document.getElementById(pageId);
  if (already) {
    getSections().forEach(sec => (sec.style.display = 'none'));
    already.style.display = 'block';
    window.scrollTo(0, 0);
    return;
  }

  // Build the path to fetch
  const resolvedPath = filePath || (pageId ? `pages/${pageId}.html` : null);
  if (!resolvedPath) {
    console.warn('showPage called without a pageId/filePath');
    return;
  }

  // Remember what was visible (so we can restore it if fetch fails)
  const previouslyVisible = getSections().find(sec => sec.style.display !== 'none');

  // Optional: small loading note (you can remove this if you don’t want it)
  const loading = document.createElement('p');
  loading.className = 'note load-info';
  loading.textContent = 'Loading…';
  content.prepend(loading);

  fetch(resolvedPath, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Section not found (${response.status})`);
      return response.text();
    })
    .then(html => {
      // Inject new section
      const sec = document.createElement('section');
      sec.id = pageId;
      sec.className = 'page active-page';
      sec.innerHTML = html;
      content.appendChild(sec);

      // Now hide others and show the new one
      getSections().forEach(s => (s.style.display = 'none'));
      sec.style.display = 'block';

      // Clear transient messages
      loading.remove();
      content.querySelectorAll('.load-error').forEach(n => n.remove());

      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error('showPage error:', err);
      loading.remove();

      // Keep whatever was visible before
      if (previouslyVisible) {
        previouslyVisible.style.display = 'block';
      }

      // Show a removable error note
      const note = document.createElement('p');
      note.className = 'note load-error';
      note.textContent = 'Sorry, that section could not be loaded.';
      content.prepend(note);
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
