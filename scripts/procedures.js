// Use a self-executing anonymous function (IIFE) to contain local variables and prevent global pollution.
(function() {
    let PROCEDURES_DATA = [];
    let dataLoaded = false;
    
    // NOTE: This assumes 'escapeHtml' is defined in a globally accessible script (like defs.js).
    // If you get a ReferenceError for 'escapeHtml', you must define it globally (like in your 'defs.js').

    /**
     * Converts text containing an intro sentence followed by list markers 
     * into the required <div class="mandatoryDiv">...</div> structure.
     */
    function convertTextToMandatoryDiv(item) {
        // Assume 'escapeHtml' is available globally
        if (typeof escapeHtml !== 'function') {
            console.error("Helper function 'escapeHtml' is missing from the global scope.");
            return `<div class="mandatoryDiv" data-parano="${item.paraNo}"><div>${item.text}</div></div>`;
        }

        const text = item.text;
        const escapedText = escapeHtml(text);
        
        // Pattern to find the start of a list 
        const listStartPattern = /(\n• |\n\d+\) )/;
        const parts = escapedText.split(listStartPattern);

        // If no list marker is found, or it's not a multi-part structure, return as a simple mandatory paragraph
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
     * Renders a single procedure item using the correct element and class.
     */
    function renderProcedureItem(item) {
        if (item.mandatory) {
            return convertTextToMandatoryDiv(item);
        } else {
            return `<p data-parano="${item.paraNo}">${escapeHtml(item.text)}</p>`;
        }
    }


    /**
     * Filters the data based on current UI input and calls the renderer.
     * EXPLICITLY GLOBAL for HTML event handlers.
     */
    window.applyFilters = function() {
        if (!dataLoaded) return;
        
        const headingFilter = document.getElementById('filter-heading').value;
        const subheadingFilter = document.getElementById('filter-subheading').value;
        const mandatoryFilter = document.getElementById('filter-mandatory').checked;
        const searchText = document.getElementById('search-text').value.toLowerCase().trim();

        let filteredData = PROCEDURES_DATA.filter(item => {
            // 1. Heading Filter
            if (headingFilter && item.heading !== headingFilter) return false;

            // 2. Subheading Filter
            if (subheadingFilter && item.subheading !== subheadingFilter) return false;

            // 3. Mandatory Filter
            if (mandatoryFilter && item.mandatory !== true) return false;

            // 4. Search Text Filter
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


    /**
     * Renders the full list of procedures, grouped by Heading and Subheading.
     */
    function renderProcedures(data) {
        const resultsContainer = document.getElementById('procedures-results');
        if (!resultsContainer) return;

        if (data.length === 0) {
            resultsContainer.innerHTML = '<p>No procedure comments match the current filters.</p>';
            return;
        }

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

    /**
     * Loads the procedure data from the JSON file.
     * EXPLICITLY GLOBAL for the DOMContentLoaded event.
     */
    window.loadProceduresComponent = async function() {
        try {
            const res = await fetch('data/procedures.json');
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching data/procedures.json`);
            
            PROCEDURES_DATA = await res.json();
            dataLoaded = true;
            
            populateFilters();
            applyFilters(); 
        } catch (err) {
            dataLoaded = false;
            console.error('Failed to load procedures:', err);
            document.getElementById('procedures-results').innerHTML = 
                `<p style="color: #b91c1c; padding: 20px; border: 1px solid #ffdddd;">
                    ❌ Failed to load procedures data from <code>data/procedures.json</code>. 
                    Please ensure the file exists at this path. Error: ${escapeHtml(err.message)}
                </p>`;
        }
    }
})();
