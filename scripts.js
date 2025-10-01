// Function to switch between main pages
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });

    // Show the requested page
    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active-page');
        // Scroll to the top of the content area
        window.scrollTo(0, 0);

        // Ensure the main 'overview' page is shown for any sub-pages
        if (pageId === 'responsibilities' || pageId === 'applicability' || pageId === 'teamreqs' || pageId === 'auditbrief' || pageId === 'stages' || pageId === 'response' || pageId === 'checklist') {
            document.getElementById('overview').classList.add('active-page');
        }
    }
}

// Function to filter the Responsibilities table
function filterTable(organisation) {
    const table = document.getElementById('responsibilities-table');
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const orgData = row.getAttribute('data-org');

        if (organisation === 'all' || orgData === organisation) {
            row.style.display = ''; // Show
        } else {
            row.style.display = 'none'; // Hide
        }
    });
}

// Function to filter the RSA Stages table
function filterStageTable(stage) {
    const table = document.getElementById('stages-table');
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const stageData = row.getAttribute('data-stage');

        if (stage === 'all' || stageData === String(stage)) {
            row.style.display = ''; // Show
        } else {
            row.style.display = 'none'; // Hide
        }
    });
}

// Dummy function for the download buttons (the main functionality is now in the HTML links)
function downloadFile(templateName) {
    // This is for the in-page download buttons, which should use the same logic as the nav dropdown links
    alert(`Initiating download for: ${templateName}\n\nNOTE: The actual file paths must be correct in the HTML <a> tags for the download to work.`);
}

// Set the initial page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if a hash is present in the URL (for deep linking)
    const hash = window.location.hash.substring(1);
    
    // Default to the main 'home' section if no hash, as the content still starts there.
    const initialPage = hash || 'home'; 
    showPage(initialPage);
});
