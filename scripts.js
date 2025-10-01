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

        // If a main button was clicked, update the sub-navigation visibility
        if (pageId !== 'home' && pageId !== 'advice') {
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

// Dummy function for the download buttons
function downloadFile(templateName) {
    alert(`Downloading: ${templateName}\n\nNOTE: You will need to implement the actual file download logic here (e.g., linking to a file hosted on GitHub).`);
}

// Set the initial page load to the home screen
document.addEventListener('DOMContentLoaded', () => {
    // Check if a hash is present in the URL (for deep linking)
    const hash = window.location.hash.substring(1);
    const initialPage = hash || 'home';
    showPage(initialPage);
    
    // Ensure the main 'overview' page is shown for any sub-pages
    if (document.querySelector('.sub-page.active-page')) {
        document.getElementById('overview').classList.add('active-page');
    }
});
