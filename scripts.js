// --- loads HTML into each section  //


function showPage(pageId, filePath) {
    // Hide all sections
    document.querySelectorAll('#content > section').forEach(sec => sec.style.display = 'none');

    // If section already loaded, just show it
    let section = document.getElementById(pageId);
    if (section) {
        section.style.display = 'block';
        window.scrollTo(0, 0);
        return;
    }

    // Otherwise, fetch and inject it
    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error('Section not found');
            return response.text();
        })
        .then(html => {
            const sec = document.createElement('section');
            sec.id = pageId;
            sec.className = 'page active-page';
            sec.innerHTML = html;
            document.getElementById('content').appendChild(sec);
            // Hide others, show this one
            document.querySelectorAll('#content > section').forEach(s => s.style.display = 'none');
            sec.style.display = 'block';
            window.scrollTo(0, 0);
        })
        .catch(err => {
            document.getElementById('content').innerHTML = "<p class='note'>Sorry, that section could not be loaded.</p>";
        });
}

// Optionally, load a default section on page load
window.addEventListener('DOMContentLoaded', function() {
    showPage('home', 'pages/home.html');
});




// --- PAGE NAVIGATION LOGIC ---
function showPageOld(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });
    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active-page');
        window.scrollTo(0, 0);
    }
    // Clear any active definition filter when switching main pages
    filterDefinitions('');
}


// --- FILTERING LOGIC FOR TABLES ---
function filterTable(organisation) {
    const table = document.getElementById('responsibilities-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const orgData = row.getAttribute('data-org');
        if (organisation === 'all' || orgData === organisation) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterStageTable(stage) {
    const table = document.getElementById('stages-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const stageData = row.getAttribute('data-stage');
        if (stage === 'all' || stageData === String(stage)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


// --- UTILITY FUNCTIONS ---
function downloadFile(templateName) {
    // Replaces alert() with a custom message box or just logs
    console.log(`Initiating download for: ${templateName}`);
    // In a real application, you would trigger the file download here.
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load all definitions into the sidebar on startup
    renderDefinitions();
    
    // 2. Set the initial page load based on hash or default to 'home'
    const hash = window.location.hash.substring(1);
    const initialPage = hash || 'home';
    showPage(initialPage);
});
