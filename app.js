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
    const strings = I18N[currentLang];
    langLabel.textContent = strings.label;
    themeToggle.title = strings.themeToggle;
    downloadToggle.title = strings.downloadToggle;
    langToggle.title = strings.langToggle;
    footer.innerHTML = `<div>${strings.footer}</div><a href="#" id="reset-link" style="font-size: 0.5rem; opacity: 0.5; border: none; margin-top: 0.5rem; display: inline-block;">${strings.resetProgress}</a>`;

    // Add listener to the newly created link
    document.getElementById('reset-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetProgress(e.target);
    });

    document.title = strings.title;
    logoText.textContent = strings.title;
    logoSymbol.textContent = strings.symbol;
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
    const urlsToCache = lessons.map(l => `${I18N[currentLang].lessonsPath}${l.id}.html`);

    try {
        const cache = await caches.open('greek-lessons-v2-html');
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
    const r = await fetch(`${I18N[currentLang].dataFile}?v=${Date.now()}`);
    db = await r.json();
};

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
        const html = await r.text();

        // Detect offline fallback from Service Worker (sw.js returns a specific HTML)
        if (html.includes('You are Offline')) return { error: 'OFFLINE' };

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
        app.innerHTML = db.home;
        // Mark viewed lessons in the UI
        app.querySelectorAll('.curriculum-link').forEach(link => {
            const id = link.getAttribute('href').split('/').pop();
            if (viewedLessons.has(id)) {
                link.classList.add('viewed');
            }
        });
    } else if (hash.startsWith('/lessons/')) {
        const id = hash.replace('/lessons/', '');
        const res = await fetchLessonHTML(id);

        if (typeof res === 'string') {
            const lessonHTML = res;
            // Find metadata for orientation
            let chapterName = '';
            let lessonNum = '';
            for (const section in db.structure) {
                const lesson = db.structure[section].find(l => l.id === id);
                if (lesson) {
                    chapterName = section;
                    lessonNum = lesson.num;
                    break;
                }
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
                    <a href="#/" class="lang-toggle" style="padding: 0.8rem 1.5rem;">
                        ${strings.errorBack}
                    </button>
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
loadData().then(route);

// Register Service Worker for Offline access (PWA Core)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
