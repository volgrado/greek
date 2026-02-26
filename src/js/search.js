import { state } from './state.js';


const searchDrawer = document.getElementById('search-drawer');
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');
const closeSearchBtn = document.getElementById('close-search');
const searchBtn = document.getElementById('search-btn');

export const fuzzySearch = (query, docStore, invertedIndex) => {
    if (!query) return [];

    // 1. Tokenize Query into normalized words
    const queryTokens = state.normalizeText(query).split(/[^a-z0-9]+/).filter(Boolean);
    if (queryTokens.length === 0) return [];

    let matchingIds = null;
    const indexKeys = Object.keys(invertedIndex);

    // 2. Intersect inverted index for all tokens (O(1) dictionary lookups + prefix scan)
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
            // Intersect sets
            matchingIds = new Set([...matchingIds].filter(id => tokenIds.has(id)));
        }

        if (matchingIds.size === 0) break; // early exit
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
            const titleIdx = nTitle.indexOf(nQuery);
            const contentIdx = nContent.indexOf(nQuery);

            if (titleIdx === 0) score += 1000;
            else if (titleIdx > 0) score += 500;
            else if (contentIdx === 0) score += 200;
            else if (contentIdx > 0) score += 100;
            else score += 50;
        }

        return { ...item, score };
    })
        .filter(item => item && item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
};

export const highlightText = (text, query) => {
    if (!query) return text;
    const nText = state.normalizeText(text);
    const nQuery = state.normalizeText(query);

    const exactIdx = nText.indexOf(nQuery);
    if (exactIdx !== -1) {
        return text.substring(0, exactIdx) +
            `<mark class="search-highlight">${text.substring(exactIdx, exactIdx + query.length)}</mark>` +
            text.substring(exactIdx + query.length);
    }

    let result = '';
    let queryIdx = 0;
    const queryChars = nQuery.split('');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nChar = state.normalizeText(char);
        if (queryIdx < queryChars.length && nChar === queryChars[queryIdx]) {
            result += `<mark class="search-highlight">${char}</mark>`;
            queryIdx++;
        } else {
            result += char;
        }
    }
    return result;
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
        const lowerQuery = query.toLowerCase();
        const lowerContent = res.content.toLowerCase();
        let snippet = res.content.substring(0, 160);

        if (!state.normalizeText(res.title).includes(state.normalizeText(query)) && !state.normalizeText(snippet).includes(state.normalizeText(query))) {
            const index = lowerContent.indexOf(lowerQuery);
            if (index !== -1) {
                const start = Math.max(0, index - 60);
                const end = Math.min(res.content.length, index + 100);
                snippet = (start > 0 ? '...' : '') + res.content.substring(start, end);
            }
        }

        const metaText = res.chapter ? `${res.chapter}${res.num ? ` · Lesson ${res.num}` : ''}` : '';

        return `
            <a href="#/lessons/${res.id}" class="search-result-item" onclick="document.getElementById('search-drawer').classList.remove('is-open'); document.body.classList.remove('search-mode');">
                <div class="lesson-meta">${metaText}</div>
                <strong>${highlightText(res.title, query)}</strong>
                <p>${highlightText(snippet, query)}...</p>
            </a>
        `;
    }).join('');
};

export const initSearch = (renderCurriculumFn) => {
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => updateGlobalSearch(renderCurriculumFn));
    }

    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            searchDrawer.classList.remove('is-open');
            document.body.classList.remove('search-mode');
            globalSearchInput.value = '';
        });
    }

    if (searchBtn && searchDrawer && globalSearchInput) {
        searchBtn.addEventListener('click', () => {
            const isOpen = searchDrawer.classList.toggle('is-open');
            document.body.classList.toggle('search-mode', isOpen);
            if (isOpen) {
                globalSearchInput.focus();
                updateGlobalSearch(renderCurriculumFn);
            } else {
                globalSearchInput.value = '';
            }
        });
    }
};
