
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
