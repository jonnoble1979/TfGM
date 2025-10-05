// procedures.js

// ---------- State & helpers ----------
let PROCEDURES_DATA = [];
let proceduresLoaded = false;


/**
 * Converts text containing an intro sentence followed by list markers 
 * into the required <div class="mandatoryDiv">...</div> structure.
 * This relies on the global function 'escapeHtml' defined in your other script.
 */
function convertTextToMandatoryDiv(item) {
    // Check for the global function defined in your defs.js
    if (typeof escapeHtml !== 'function') {
        console.error("Helper function 'escapeHtml' is missing from the global scope.");
        return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${item.text}</div></div>`;
    }

    const text = item.text;
    const escapedText = escapeHtml(text);
    
    // Pattern to find the start of a list 
    const listStartPattern = /(\n• |\n\d+\) )/;
    const parts = escapedText.split(listStartPattern);

    if (parts.length <= 2) {
        return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${escapedText}</div></div>`;
    }

    const introText = parts[0].trim();
    let listItemsHtml = '';
    let listTag = '';

    for (let i = 1; i < parts.length; i += 2) {
        const delimiter = parts[i].trim();
        const content = parts[i + 1] ? parts[i + 1].trim() : '';

        if (!listTag) {
            listTag = delimiter.includes('•') ? 'ul' : 'ol';
        }
        
        if (content) {
            const formattedContent = content.replaceAll('\n', '<br>'); 
            listItemsHtml += `<li>${formattedContent}</li>`;
        }
    }
    
    if (listItemsHtml) {
        return `
            <div class="mandatoryDiv" data-parano="${item.paraNo}">
                <div>${introText}</div>
                <${listTag}>
                    ${listItemsHtml}
                </${listTag}>
            </div>
        `;
    } else {
        return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${escapedText}</div></div>`;
    }
}


/**
 * Renders a single procedure item.
 */
function renderProcedureItem(item) {
    if (item.mandatory) {
        return convertTextToMandatoryDiv(item);
    } else {
        return `<p data-parano="${item.paraNo}">${escapeHtml(item.text)}</p>`;
    }
}


/**
 * Renders the full list of procedures, grouped by Heading and Subheading.
 */
function renderProcedures(data) {
    const resultsContainer = document.getElementById('procedures-results');
    if (!resultsContainer) return;

    if (!proceduresLoaded) {
        resultsContainer.innerHTML = `<p>Loading procedures...</p>`;
        return;
    }

    if (data.length === 0) {
        resultsContainer.innerHTML = '<p>No procedure comments match the current filters.</p>';
        return;
    }

    // Grouping logic: Map<Heading, Map<Subheading, [Items]>>
    const grouped = data.reduce((acc, item) => {
        if (!acc.has(item.heading)) acc.set(item.heading, new Map());
        const subheadingMap = acc.get(item.heading);
        if (!subheadingMap.has(item.subheading)) subheadingMap.set(item.subheading, []);
        subheadingMap.get(item.subheading).push(item);
        return acc;
    }, new Map());

    let html = '';

    for (const [heading, subheadingMap] of grouped) {
        html += `<h3 class="procedure-heading">${escapeHtml(heading)}</h3>`;
        
        for (const [subheading, items] of subheadingMap) {
            html += `<h4 class="procedure-subheading">${escapeHtml(subheading)}</h4>`;
            
            html += `<div class="procedure-group">`;
            items.forEach(item => {
                html += renderProcedureItem(item);
            });
            html += `</div>`;
        }
    }

    resultsContainer.innerHTML = html;
}


/**
 * Populates the Heading and Subheading dropdowns with unique options.
 */
function populateFilters() {
    const headings = new Set();
    const subheadings = new Set();

    PROCEDURES_DATA.forEach(item => {
        headings.add(item.heading);
        subheadings.add(item.subheading);
    });

    const headingSelect = document.getElementById('filter-heading');
    headings.forEach(h => {
        headingSelect.innerHTML += `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`;
    });

    const subheadingSelect = document.getElementById('filter-subheading');
    subheadings.forEach(s => {
        subheadingSelect.innerHTML += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
    });
}


// ---------- Filtering ----------

/**
 * Filters the data based on current UI input.
 * Declared globally to be accessible by HTML inline handlers (onchange="applyFilters()").
 */
function applyFilters() {
    if (!proceduresLoaded) return;
    
    const headingFilter = document.getElementById('filter-heading').value;
    const subheadingFilter = document.getElementById('filter-subheading').value;
    const mandatoryFilter = document.getElementById('filter-mandatory').checked;
    const searchText = document.getElementById('search-text').value.toLowerCase().trim();

    let filteredData = PROCEDURES_DATA.filter(item => {
        if (headingFilter && item.heading !== headingFilter) return false;
        if (subheadingFilter && item.subheading !== subheadingFilter) return false;
        if (mandatoryFilter && item.mandatory !== true) return false;

        if (searchText) {
            const searchTargets = [
                item.text,
                item.heading,
                item.subheading
            ].map(s => String(s).toLowerCase());
            
            if (!searchTargets.some(target => target.includes(searchText))) {
                return false;
            }
        }
        
        return true;
    });

    renderProcedures(filteredData);
}


// ---------- Data loading ----------

/**
 * Loads the procedure data from the JSON file.
 * Declared globally to be called from the DOMContentLoaded event listener.
 */
async function loadProcedures() {
    proceduresLoaded = false;
    try {
        // ✅ Ensure the filename/path is exactly correct (case-sensitive on many hosts)
        const res = await fetch('/data/procedures.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching data/procedures.json`);
        
        const data = await res.json();
        PROCEDURES_DATA = data;
        proceduresLoaded = true;
        
        console.log(`Procedures loaded: ${PROCEDURES_DATA.length}`);

        populateFilters();
        applyFilters(); // Initial render with loaded data
    } catch (err) {
        proceduresLoaded = true; // load finished (failed)
        console.error('Failed to load procedures:', err);
        document.getElementById('procedures-results').innerHTML = 
            `<p style="color: #b91c1c; padding: 20px; border: 1px solid #ffdddd;">
                ❌ Failed to load procedures data: <code>${escapeHtml(err.message)}</code>
            </p>`;
    }
}


// Put this at the bottom of procedures.js
(function bootProceduresOnceTheUIExists() {
  function tryStart() {
    // only run if the app container exists in DOM
    const container = document.querySelector('.procedure-app-container');
    if (!container) return false;
    // kick off the load
    if (typeof loadProcedures === 'function') loadProcedures();
    return true;
  }

  // If DOM already loaded and container exists, start immediately
  if (document.readyState !== 'loading' && tryStart()) return;

  // Otherwise, watch for the container to be inserted
  const mo = new MutationObserver(() => {
    if (tryStart()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();

