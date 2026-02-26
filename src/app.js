/**
 * @typedef {Object} Lesson
 * @property {string} id - Unique identifier for the lesson
 * @property {string} title - Human-readable title
 * @property {string} [num] - Optional lesson number
 */

/**
 * @typedef {Object} Database
 * @property {string} home - Raw HTML for the home screen
 * @property {Object.<string, Lesson[]>} structure - Curriculum structure organized by sections
 */

/**
 * @typedef {Object} I18NStrings
 * @property {string} label - Language label (e.g., 'EL')
 * @property {string} symbol - Cultural symbol (e.g., 'Ω')
 * @property {string} title - Page title
 * @property {string} themeToggle - Tooltip for theme toggle
 * @property {string} downloadToggle - Tooltip for download button
 * @property {string} langToggle - Tooltip for language toggle
 * @property {string} footer - Footer HTML content
 * @property {string} dataFile - Path to curriculum JSON
 * @property {string} lessonsPath - Path to lesson HTML fragments
 * @property {string} errorTitle - Title for error screen
 * @property {string} errorOffline - Offline error message
 * @property {string} errorNotFound - 404 error message
 * @property {string} errorRetry - Retry button text
 * @property {string} errorBack - Back to curriculum button text
 */

/** @type {HTMLElement} */
const app = document.getElementById('app');
/** @type {HTMLButtonElement} */
const themeToggle = document.getElementById('theme-toggle');
/** @type {HTMLButtonElement} */
const langToggle = document.getElementById('lang-toggle');
/** @type {HTMLButtonElement} */
const downloadToggle = document.getElementById('download-toggle');
/** @type {HTMLElement} */
const langLabel = document.getElementById('lang-label');
/** @type {HTMLElement} */
const footer = document.getElementById('footer');
/** @type {HTMLElement} */
const logoText = document.getElementById('logo-text');
/** @type {HTMLElement} */
const logoSymbol = document.getElementById('logo-symbol');
/** @type {HTMLButtonElement} */
const searchBtn = document.getElementById('search-btn');

/** 
 * i18n Configuration
 * @type {Object.<string, I18NStrings>} 
 */
const I18N = {
    el: {
        label: 'EL',
        symbol: 'Ω',
        title: 'GREEK',
        themeToggle: 'Change Theme',
        downloadToggle: 'Download Offline',
        langToggle: 'Change Course',
        footer: '&copy; 2026 / GREEK PROJECT',
        dataFile: 'public/data/el/curriculum.json',
        lessonsPath: 'public/data/el/lessons/',
        errorTitle: 'Oops!',
        errorOffline: 'You are offline and this lesson hasn\'t been downloaded.',
        errorNotFound: 'Lesson content not found.',
        errorRetry: 'Retry',
        errorBack: 'Back to Curriculum',
        resetProgress: 'Reset Progress',
        resetConfirm: 'Confirm Reset?'
    },
    es: {
        label: 'ES',
        symbol: 'Ñ',
        title: 'SPANISH',
        themeToggle: 'Change Theme',
        downloadToggle: 'Download Offline',
        langToggle: 'Change Course',
        footer: '&copy; 2026 / SPANISH PROJECT',
        dataFile: 'public/data/es/curriculum.json',
        lessonsPath: 'public/data/es/lessons/',
        errorTitle: 'Oops!',
        errorOffline: 'You are offline and this lesson hasn\'t been downloaded.',
        errorNotFound: 'Lesson content not found.',
        errorRetry: 'Retry',
        errorBack: 'Back to Curriculum',
        resetProgress: 'Reset Progress',
        resetConfirm: 'Confirm Reset?'
    }
};

/** @type {string} */
let currentLang = localStorage.getItem('lang') || 'el';
/** @type {Database|null} */
let db = null;
/** @type {Object.<string, string>} */
let lessonCache = {};
/** @type {Set<string>} */
const viewedLessons = new Set(JSON.parse(localStorage.getItem('viewed') || '[]'));
/** @type {Array<{id: string, title: string, content: string}>} */
let searchIndex = [];

/**
 * Saves a lesson ID as viewed
 * @param {string} id 
 */
const markAsViewed = (id) => {
    viewedLessons.add(id);
    localStorage.setItem('viewed', JSON.stringify([...viewedLessons]));
};

/**
 * Silently fetches the next lesson into cache
 * @param {string} currentId 
 */
const prefetchNext = async (currentId) => {
    const lessons = getFlatLessons();
    const idx = lessons.findIndex(l => l.id === currentId);
    if (idx !== -1 && idx < lessons.length - 1) {
        const nextId = lessons[idx + 1].id;
        if (!lessonCache[nextId]) {
            fetchLessonHTML(nextId); // Fetch and cache
        }
    }
};

/**
 * Updates all UI static strings based on current language
 * @returns {void}
 */
const updateUIStrings = () => {
    if (!I18N[currentLang]) currentLang = 'el';
    const strings = I18N[currentLang];

    document.documentElement.lang = currentLang;
    if (langLabel) langLabel.textContent = strings.label;
    if (themeToggle) themeToggle.title = strings.themeToggle;
    if (downloadToggle) downloadToggle.title = strings.downloadToggle;
    if (langToggle) langToggle.title = strings.langToggle;

    if (footer) {
        footer.innerHTML = `<div>${strings.footer}</div><a href="#" id="reset-link" style="font-size: 0.5rem; opacity: 0.5; border: none; margin-top: 0.5rem; display: inline-block;">${strings.resetProgress}</a>`;
        document.getElementById('reset-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            resetProgress(e.target);
        });
    }

    document.title = strings.title;
    if (logoText) logoText.textContent = strings.title;
    if (logoSymbol) logoSymbol.textContent = strings.symbol;
    if (searchBtn) searchBtn.title = "Search Lessons";
};

// Theme Management
/** @type {string[]} */
const themes = ['light', 'dark', 'sepia'];
/** @type {string} */
let currentTheme = localStorage.getItem('theme');
if (!currentTheme) {
    currentTheme = localStorage.getItem('dark-mode') === 'true' ? 'dark' : 'light';
}

/** @type {Object.<string, string>} */
const themeIcons = {
    light: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', // Sun
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>', // Moon
    sepia: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>' // Book
};

/**
 * Applies the selected theme to the document
 * @param {string} theme - 'light', 'dark', or 'sepia'
 * @returns {void}
 */
const applyTheme = (theme) => {
    document.documentElement.classList.remove('dark-mode', 'sepia-mode');
    if (theme !== 'light') {
        document.documentElement.classList.add(`${theme}-mode`);
    }
    document.getElementById('theme-icon').innerHTML = themeIcons[theme];
};

applyTheme(currentTheme);

themeToggle.addEventListener('click', () => {
    const nextThemeIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    currentTheme = themes[nextThemeIndex];
    localStorage.setItem('theme', currentTheme);
    localStorage.setItem('dark-mode', currentTheme === 'dark'); // fallback for backwards compatibility
    applyTheme(currentTheme);
});

/**
 * Clears all viewed lessons from storage and UI with an inline confirmation
 * @param {HTMLElement} linkElement - The trigger element
 * @returns {void}
 */
const resetProgress = (linkElement) => {
    const strings = I18N[currentLang];

    if (linkElement.textContent === strings.resetProgress) {
        // First click: Change text and wait
        linkElement.textContent = strings.resetConfirm;
        linkElement.style.color = '#e53e3e'; // Red warning
        linkElement.style.opacity = '1';

        setTimeout(() => {
            linkElement.textContent = strings.resetProgress;
            linkElement.style.color = 'inherit';
            linkElement.style.opacity = '0.5';
        }, 3000);
        return;
    }

    // Second click within 3s: Actual reset
    viewedLessons.clear();
    localStorage.removeItem('viewed');
    linkElement.textContent = 'Done!';

    if (window.location.hash === '#/' || window.location.hash === '' || window.location.hash === '#/curriculum') {
        route(); // Refresh home UI
    }

    setTimeout(() => {
        updateUIStrings(); // Restore footer state
    }, 1500);
};

downloadToggle.addEventListener('click', async () => {
    if (!db || !db.structure) return;

    downloadToggle.style.opacity = '0.5';

    const lessons = getFlatLessons();
    const lang = currentLang;
    const cacheName = `pwa-lessons-${lang}-v2`;
    const urlsToCache = lessons.map(l => `${I18N[lang].lessonsPath}${l.id}.html`);

    try {
        const cache = await caches.open(cacheName);
        await cache.addAll(urlsToCache);

        const oldIcon = downloadToggle.innerHTML;
        downloadToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        downloadToggle.style.opacity = '1';

        setTimeout(() => {
            downloadToggle.innerHTML = oldIcon;
        }, 3000);
    } catch (e) {
        console.error("Download failed", e);
        downloadToggle.style.opacity = '1';
    }
});

// Language Management
/**
 * Switches the application course/language
 * @param {string} lang - 'el' or 'es'
 * @returns {Promise<void>}
 */
const switchLanguage = async (lang) => {
    currentLang = lang;
    lessonCache = {}; // Clear cache on language switch
    localStorage.setItem('lang', lang);
    updateUIStrings();
    await loadData();

    // Return to home menu to avoid 404s (lessons are not shared between langs)
    window.location.hash = '#/';
    route();
};

langToggle.addEventListener('click', () => {
    const nextLang = currentLang === 'el' ? 'es' : 'el';
    switchLanguage(nextLang);
});

/**
 * Returns a flat array of all lessons in the current database
 * @returns {Lesson[]}
 */
const getFlatLessons = () => {
    if (!db || !db.structure) return [];
    const flat = [];
    for (const section in db.structure) {
        flat.push(...db.structure[section]);
    }
    return flat;
};

/**
 * Creates the HTML for the bottom navigation block (Prev/Menu/Next)
 * @param {string} currentId - The ID of the current lesson
 * @returns {string} HTML string
 */
const createNavBlockHTML = (currentId) => {
    const lessons = getFlatLessons();
    const currentIndex = lessons.findIndex(l => l.id === currentId);

    if (currentIndex === -1) return '';

    let prevLink = '<span></span>';
    if (currentIndex > 0) {
        const prev = lessons[currentIndex - 1];
        prevLink = `<a href="#/lessons/${prev.id}">← ${prev.title}</a>`;
    }

    let nextLink = '<span></span>';
    if (currentIndex < lessons.length - 1) {
        const next = lessons[currentIndex + 1];
        nextLink = `<a href="#/lessons/${next.id}">${next.title} →</a>`;
    }

    return `
    <div class="lesson-nav">
        ${prevLink}
        <a href="#/" class="menu-btn">MENU</a>
        ${nextLink}
    </div>`;
};

/**
 * Loads the curriculum data from the server
 * @returns {Promise<void>}
 */
const loadData = async () => {
    try {
        const r = await fetch(`${I18N[currentLang].dataFile}?v=${Date.now()}`);
        if (!r.ok) throw new Error('Data fetch failed');
        db = await r.json();
    } catch (e) {
        console.warn("Curriculum fetch failed, trying cache...", e);
        // The Service Worker should handle the fallback if we've been here before
        const r = await fetch(I18N[currentLang].dataFile);
        db = await r.json();
    }
};

/**
 * Loads the search index for the current language
 * @returns {Promise<void>}
 */
const loadSearchIndex = async () => {
    try {
        const r = await fetch(`public/data/${currentLang}/search.json`);
        if (!r.ok) throw new Error('Search index fetch failed');
        searchIndex = await r.json();
    } catch (e) {
        console.warn("Could not load search index", e);
    }
};

/**
 * Normalizes text for better searching (removes accents/diacritics)
 * @param {string} text 
 * @returns {string}
 */
const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

/**
 * Advanced Vanilla Fuzzy Search
 * @param {string} query 
 * @param {Array} data 
 */
const fuzzySearch = (query, data) => {
    if (!query) return [];

    const nQuery = normalizeText(query);
    const queryChars = nQuery.split('');

    return data.map(item => {
        const nTitle = normalizeText(item.title);
        const nContent = normalizeText(item.content);

        // Exact substring match check
        const titleIdx = nTitle.indexOf(nQuery);
        const contentIdx = nContent.indexOf(nQuery);

        let score = 0;

        // Primary Scoring: Exact/Substring matches
        if (titleIdx === 0) score += 1000;       // exact title start
        else if (titleIdx > 0) score += 500;     // title substring
        else if (contentIdx === 0) score += 200; // content start
        else if (contentIdx > 0) score += 100;   // content substring

        // Secondary Scoring: Sequential Fuzzy matching
        // We check how many characters match and how "tight" the match is
        const getFuzzyScore = (text) => {
            let fScore = 0;
            let currentIdx = 0;
            let wordCount = 0;
            let totalDist = 0;

            for (let char of queryChars) {
                const foundIdx = text.indexOf(char, currentIdx);
                if (foundIdx === -1) return 0;

                // Bonus for match at start of words
                if (foundIdx === 0 || text[foundIdx - 1] === ' ') fScore += 50;

                totalDist += (foundIdx - currentIdx);
                currentIdx = foundIdx + 1;
                wordCount++;
            }

            // Score = Match strength - penalty for distance between characters
            return fScore + (wordCount * 10) - totalDist;
        };

        if (score === 0) {
            const fTitleScore = getFuzzyScore(nTitle);
            const fContentScore = getFuzzyScore(nContent);
            score = Math.max(fTitleScore * 2, fContentScore); // Title match worth 2x
        }

        return { ...item, score };
    })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
};


/**
 * Highlights the matched query in a string
 * @param {string} text 
 * @param {string} query 
 * @returns {string}
 */
const highlightText = (text, query) => {
    if (!query) return text;

    const nText = normalizeText(text);
    const nQuery = normalizeText(query);

    // 1. Exact substring match (ignoring accents)
    const exactIdx = nText.indexOf(nQuery);
    if (exactIdx !== -1) {
        const originalPart = text.substring(exactIdx, exactIdx + query.length);
        // Note: For Greek, query length might differ from normalized length if accents are multibyte, 
        // but here we are using standard normalization. A more robust way is to slice the original.
        return text.substring(0, exactIdx) +
            `<mark class="search-highlight">${text.substring(exactIdx, exactIdx + query.length)}</mark>` +
            text.substring(exactIdx + query.length);
    }

    // 2. Character-by-character fuzzy highlighting
    let result = '';
    let queryIdx = 0;
    const queryChars = nQuery.split('');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nChar = normalizeText(char);
        if (queryIdx < queryChars.length && nChar === queryChars[queryIdx]) {
            result += `<mark class="search-highlight">${char}</mark>`;
            queryIdx++;
        } else {
            result += char;
        }
    }
    return result;
};


/**
 * Renders the curriculum into a container (used for both Home and Search Empty state)
 * @param {HTMLElement} container 
 */
const renderCurriculum = (container) => {
    container.innerHTML = db.home;

    // Restore collapse states
    const collapsedSections = JSON.parse(localStorage.getItem('collapsedChapters') || '[]');
    collapsedSections.forEach(id => {
        container.querySelector(`.curriculum-section[data-section-id="${id}"]`)?.classList.add('collapsed');
    });

    // Add toggle listeners
    container.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            const id = section.getAttribute('data-section-id');
            const isCollapsed = section.classList.toggle('collapsed');

            // Save state
            let current = JSON.parse(localStorage.getItem('collapsedChapters') || '[]');
            if (isCollapsed) {
                if (!current.includes(id)) current.push(id);
            } else {
                current = current.filter(cid => cid !== id);
            }
            localStorage.setItem('collapsedChapters', JSON.stringify(current));
        });
    });

    // Mark viewed lessons
    container.querySelectorAll('.curriculum-link').forEach(link => {
        const id = link.getAttribute('href').split('/').pop();
        if (viewedLessons.has(id)) {
            link.classList.add('viewed');
        }
        // If clicking inside a drawer, close the drawer
        link.addEventListener('click', () => {
            searchDrawer.classList.remove('is-open');
            document.body.classList.remove('search-mode');
        });
    });
};

/**
 * Global Search Drawer Logic
 */
const searchDrawer = document.getElementById('search-drawer');
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');
const closeSearchBtn = document.getElementById('close-search');

const updateGlobalSearch = () => {
    const query = globalSearchInput.value.trim();

    if (query.length < 2) {
        renderCurriculum(globalSearchResults);
        return;
    }

    const results = fuzzySearch(query, searchIndex);

    if (results.length === 0) {
        globalSearchResults.innerHTML = '<div class="search-empty">No matching lessons found.</div>';
        return;
    }

    globalSearchResults.innerHTML = results.map(res => {
        const lowerQuery = query.toLowerCase();
        const lowerContent = res.content.toLowerCase();
        let snippet = res.content.substring(0, 160);

        if (!normalizeText(res.title).includes(normalizeText(query)) && !normalizeText(snippet).includes(normalizeText(query))) {
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

globalSearchInput.addEventListener('input', updateGlobalSearch);

closeSearchBtn.addEventListener('click', () => {
    searchDrawer.classList.remove('is-open');
    document.body.classList.remove('search-mode');
    globalSearchInput.value = '';
});

// Open search from button
searchBtn.addEventListener('click', () => {
    const isOpen = searchDrawer.classList.toggle('is-open');
    document.body.classList.toggle('search-mode', isOpen);
    if (isOpen) {
        globalSearchInput.focus();
        updateGlobalSearch(); // Initial render (shows curriculum)
    } else {
        globalSearchInput.value = '';
    }
});


/**
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error type ('NOT_FOUND', 'OFFLINE', 'NETWORK')
 */

/**
 * Fetches the HTML content for a specific lesson
 * @param {string} id - Lesson ID
 * @returns {Promise<string|ErrorResponse>}
 */
const fetchLessonHTML = async (id) => {
    if (lessonCache[id]) return lessonCache[id];
    try {
        const r = await fetch(`${I18N[currentLang].lessonsPath}${id}.html`);
        if (!r.ok) return { error: 'NOT_FOUND' };

        // Detect offline fallback from Service Worker (sw.js now returns a special header)
        if (r.headers.has('X-Offline-Fallback')) return { error: 'OFFLINE' };

        const html = await r.text();
        lessonCache[id] = html;
        return html;
    } catch (e) {
        return { error: 'NETWORK' };
    }
};

/**
 * Main routing function that handles hash changes and content rendering
 * @returns {Promise<void>}
 */
const route = async () => {
    if (!db) return;
    const hash = window.location.hash.slice(1) || '/';

    app.innerHTML = `
        <div class="skeleton-loader">
            <div class="skeleton-meta"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line" style="width: 60%"></div>
        </div>
    `;

    if (hash === '/' || hash === '/curriculum') {
        renderCurriculum(app);
    } else if (hash.startsWith('/lessons/')) {
        const id = hash.replace('/lessons/', '');
        const res = await fetchLessonHTML(id);

        if (typeof res === 'string') {
            const lessonHTML = res;
            // Find metadata for orientation
            let chapterName = '';
            let lessonNum = '';
            let cIdx = 1;
            for (const section in db.structure) {
                const lesson = db.structure[section].find(l => l.id === id);
                if (lesson) {
                    chapterName = `${cIdx}. ${section}`;
                    lessonNum = lesson.hierarchical_num;
                    break;
                }
                cIdx++;
            }

            const metaHTML = chapterName ? `
                <div class="lesson-meta">
                    ${chapterName} ${lessonNum ? `&middot; LESSON ${lessonNum}` : ''}
                </div>
            ` : '';

            const navHTML = createNavBlockHTML(id);
            app.innerHTML = metaHTML + lessonHTML + navHTML;

            // Mark as viewed and prefetch next
            markAsViewed(id);
            prefetchNext(id);
        } else {
            const errorType = res ? res.error : 'NOT_FOUND';
            const strings = I18N[currentLang];
            const isConnError = errorType === 'OFFLINE' || errorType === 'NETWORK';

            app.innerHTML = `
            <div style="padding: 5rem 1rem; text-align: center; max-width: 500px; margin: 0 auto;">
                <h1 style="color: #e53e3e; font-size: 2.5rem; margin-bottom: 1rem;">${strings.errorTitle}</h1>
                <p style="color: var(--muted-text); margin-bottom: 2.5rem; font-family: var(--font-ui); font-size: 0.9rem; line-height: 1.6;">
                    ${isConnError ? strings.errorOffline : strings.errorNotFound}
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" class="lang-toggle" style="background: var(--text); color: var(--bg); border: none; padding: 0.8rem 1.5rem;">
                        ${strings.errorRetry}
                    </button>
                    <a href="#/" class="lang-toggle" style="padding: 0.8rem 1.5rem; text-decoration: none; display: inline-block;">
                        ${strings.errorBack}
                    </a>
                </div>
            </div>`;
        }
    } else {
        app.innerHTML = `
        <div style="padding: 5rem; text-align: center">
            <h1 style="color: #e53e3e">404: Node not found</h1>
            <a href="#/">Back to Curriculum</a>
        </div>`;
    }
    window.scrollTo(0, 0);
};

window.onhashchange = route;

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith('/lessons/')) return;

    const currentId = hash.replace('/lessons/', '');
    const lessons = getFlatLessons();
    const currentIndex = lessons.findIndex(l => l.id === currentId);

    if (currentIndex === -1) return;

    if (e.key === 'ArrowRight' && currentIndex < lessons.length - 1) {
        window.location.hash = `#/lessons/${lessons[currentIndex + 1].id}`;
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        window.location.hash = `#/lessons/${lessons[currentIndex - 1].id}`;
    }
});

// Initialize
updateUIStrings();
loadData().then(() => {
    loadSearchIndex();
    route();
});

// Event Listeners (Removed old search listener)

// Register Service Worker for Offline access (PWA Core)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
