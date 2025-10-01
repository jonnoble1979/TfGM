// Function to switch between main pages
function showPage(pageId) {
    // Hide ALL pages (ensuring only one is visible)
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });

    // Show ONLY the requested page
    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active-page');
        window.scrollTo(0, 0);
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

// Dummy function for the download buttons
function downloadFile(templateName) {
    alert(`Initiating download for: ${templateName}\n\nNOTE: The actual file paths must be correct in the HTML <a> tags for the download to work.`);
}

// Set the initial page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if a hash is present in the URL (for deep linking)
    const hash = window.location.hash.substring(1);
    
    // Default to the main 'home' section if no hash
    const initialPage = hash || 'home'; 
    showPage(initialPage);
});
