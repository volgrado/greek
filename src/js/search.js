import { state } from './state.js';


const searchDrawer = document.getElementById('search-drawer');
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');
const closeSearchBtn = document.getElementById('close-search');
const searchBtn = document.getElementById('search-btn');

export const fuzzySearch = (query, docStore, invertedIndex) => {
    if (!query) return [];

    // 1. Tokenize Query into normalized words (including Greek range)
    const queryTokens = state.normalizeText(query).split(/[^a-z0-9\u0370-\u03ff]+/).filter(Boolean);
    if (queryTokens.length === 0) return [];

    let matchingIds = null;
    const indexKeys = Object.keys(invertedIndex);

    // 2. Intersect inverted index (O(1) dictionary lookups + prefix scan)
    for (const token of queryTokens) {
        const matchingKeys = indexKeys.filter(k => k.startsWith(token));

        const tokenIds = new Set();
        for (const k of matchingKeys) {
            for (const id of invertedIndex[k]) {
                tokenIds.add(id);
            }
        }

        if (matchingIds === null) {
            matchingIds = new Set(tokenIds);
        } else {
            matchingIds = new Set([...matchingIds].filter(id => tokenIds.has(id)));
        }

        if (matchingIds.size === 0) break;
    }

    if (!matchingIds || matchingIds.size === 0) return [];

    // 3. Map matched IDs to documents and apply simple scoring for ranking
    const nQuery = state.normalizeText(query);

    return Array.from(matchingIds).map(id => {
        const item = docStore[id];
        let score = 0;

        if (item) {
            const nTitle = state.normalizeText(item.title);
            const nContent = state.normalizeText(item.content);

            // Exact match in title is high priority
            if (nTitle === nQuery) score += 2000;
            else if (nTitle.includes(nQuery)) score += 1000;
            else if (nContent.includes(nQuery)) score += 500;
            else score += 100;
        }

        return { ...item, score };
    })
        .filter(item => item && item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
};

export const updateGlobalSearch = (renderCurriculumFn) => {
    if (!globalSearchInput || !globalSearchResults) return;
    const query = globalSearchInput.value.trim();

    if (query.length < 2) {
        renderCurriculumFn(globalSearchResults);
        return;
    }

    const results = fuzzySearch(query, state.searchIndex, state.invertedIndex);

    if (results.length === 0) {
        globalSearchResults.innerHTML = '<div class="search-empty">No matching lessons found.</div>';
        return;
    }

    globalSearchResults.innerHTML = results.map(res => {
        const metaText = res.chapter ? `${res.chapter}${res.num ? ` · Lesson ${res.num}` : ''}` : '';

        const href = `/lessons/${res.id}`;

        return `
            <a href="${href}" class="search-result-item">
                <div class="lesson-meta">${metaText}</div>
                <strong>${res.title}</strong>
                <p>${res.content.substring(0, 140)}...</p>
            </a>
        `;
    }).join('');
};

export const initSearch = (renderCurriculumFn) => {
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => updateGlobalSearch(renderCurriculumFn));
    }

    // Native Popover API Listeners
    if (searchDrawer) {
        searchDrawer.addEventListener('beforetoggle', (e) => {
            if (e.newState === 'open') {
                document.body.classList.add('search-mode');
                setTimeout(() => globalSearchInput.focus(), 50);
                updateGlobalSearch(renderCurriculumFn);
            } else {
                document.body.classList.remove('search-mode');
                globalSearchInput.value = '';
            }
        });
    }

    // Close search on navigation (already handled by router closing all drawers)
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            if (searchDrawer.hidePopover) searchDrawer.hidePopover();
        });
    }
};
