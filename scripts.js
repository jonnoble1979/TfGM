// --- DEFINITIONS DATA ---
const DEFINITIONS = {
    'Road Safety Audit (RSA)': {
        term: 'Road Safety Audit (RSA)',
        definition: 'An RSA is the staged evaluation of the changes to the highway during design, implementation and subsequent operation. It seeks to identify potential road safety hazards that may result in personal injury for any type of road user and to suggest measures to eliminate or mitigate those problems. This evaluation is carried out during the design stages (Stages 1 & 2), as closely as possible after the measures become operational (Stage 3), and with 12 months of validated Personal Injury Collision data to enable an accurate comparison between the ‘pre-construction period’ and control data for the ‘post-construction period’ after the scheme becomes operational (Stage 4).'
    },
    'Client': {
        term: 'Client',
        definition: 'The relevant Greater Manchester highway/roads authority under their statutory duty for road user safety. The Client may not commission and pay for the audit (e.g. for developer-led schemes) but they are the ones who require the audit to be undertaken. If the project is a local authority or developer-led, designated Scheme Manager will be identified in the relevant organisation.'
    },
    'Collision Investigation': {
        term: 'Collision Investigation',
        definition: 'The collection and examination of validated historical collision data over a period of time in order to identify common trends and factors which may have contributed to the collisions. This could also include the detailed forensic investigation of single collisions, any provisional collision data and operational incident data that may be available.'
    }
};


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





// --- DEFINITIONS RENDERING AND FILTERING LOGIC ---

// Function to render all or filtered definitions
function renderDefinitions(filterTerm = '') {
    const listContainer = document.getElementById('definitions-list');
    let html = '';
    const lowerCaseFilter = filterTerm.toLowerCase().trim();
    
    // If the filter is explicitly set by clicking a term, it should match exactly
    const isExactFilter = Object.keys(DEFINITIONS).includes(filterTerm);
    
    for (const key in DEFINITIONS) {
        const def = DEFINITIONS[key];
        const lowerCaseTerm = def.term.toLowerCase();
        const lowerCaseDefinition = def.definition.toLowerCase();
        
        // Filtering Logic
        if (filterTerm === '' || 
            (isExactFilter && key === filterTerm) ||
            (!isExactFilter && (lowerCaseTerm.includes(lowerCaseFilter) || lowerCaseDefinition.includes(lowerCaseFilter)))
        ) {
            html += `
                <div class="definition-item" data-term="${def.term}">
                    <h4>${def.term}</h4>
                    <p>${def.definition}</p>
                </div>
            `;
        }
    }
    
    if (html === '') {
        html = '<p>No definitions match your search.</p>';
    }
    
    listContainer.innerHTML = html;
}

// Main filter function called by search input or link click
function filterDefinitions(searchTerm) {
    const searchInput = document.getElementById('definition-search');
    
    if (searchTerm) {
        // If called by a link click, update the search input to reflect the filter
        searchInput.value = searchTerm;
    }
    
    renderDefinitions(searchInput.value);
}

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
