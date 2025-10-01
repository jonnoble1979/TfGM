function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
}

// Optionally, show the first section by default
document.addEventListener('DOMContentLoaded', () => {
  showSection('advice');
});
