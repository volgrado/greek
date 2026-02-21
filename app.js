const app = document.getElementById('app');
const themeToggle = document.getElementById('theme-toggle');
const langToggle = document.getElementById('lang-toggle');
const downloadToggle = document.getElementById('download-toggle');
const langLabel = document.getElementById('lang-label');
const footer = document.getElementById('footer');
const logoText = document.getElementById('logo-text');
const logoSymbol = document.getElementById('logo-symbol');

// i18n Configuration
const I18N = {
    el: {
        label: 'EL',
        symbol: 'Ω',
        title: 'GREEK',
        themeToggle: 'Change Theme',
        downloadToggle: 'Download Offline',
        langToggle: 'Change Language',
        footer: '&copy; 2026 / GREEK PROJECT',
        dataFile: 'public/data/el/curriculum.json',
        lessonsPath: 'public/data/el/lessons/'
    },
    es: {
        label: 'ES',
        symbol: 'Ñ',
        title: 'SPANISH',
        themeToggle: 'Change Theme',
        downloadToggle: 'Download Offline',
        langToggle: 'Change Language',
        footer: '&copy; 2026 / SPANISH PROJECT',
        dataFile: 'public/data/es/curriculum.json',
        lessonsPath: 'public/data/es/lessons/'
    }
};

let currentLang = localStorage.getItem('lang') || 'el';
let db = null;
let lessonCache = {};

const updateUIStrings = () => {
    const strings = I18N[currentLang];
    langLabel.textContent = strings.label;
    themeToggle.title = strings.themeToggle;
    downloadToggle.title = strings.downloadToggle;
    langToggle.title = strings.langToggle;
    footer.innerHTML = strings.footer;
    document.title = strings.title;
    logoText.textContent = strings.title;
    logoSymbol.textContent = strings.symbol;
};

// Theme Management
const themes = ['light', 'dark', 'sepia'];
let currentTheme = localStorage.getItem('theme');
if (!currentTheme) {
    currentTheme = localStorage.getItem('dark-mode') === 'true' ? 'dark' : 'light';
}

const themeIcons = {
    light: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', // Sun
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>', // Moon
    sepia: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>' // Book
};

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

// Extractor de Lecciones para Navegación
const getFlatLessons = () => {
    if (!db || !db.structure) return [];
    const flat = [];
    for (const section in db.structure) {
        flat.push(...db.structure[section]);
    }
    return flat;
};

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

// El Navegador de Estados
const loadData = async () => {
    const r = await fetch(`${I18N[currentLang].dataFile}?v=${Date.now()}`);
    db = await r.json();
};

const fetchLessonHTML = async (id) => {
    if (lessonCache[id]) return lessonCache[id];
    try {
        const r = await fetch(`${I18N[currentLang].lessonsPath}${id}.html`);
        if (!r.ok) throw new Error('Not found');
        const html = await r.text();
        lessonCache[id] = html;
        return html;
    } catch (e) {
        return null;
    }
};

const route = async () => {
    if (!db) return;
    const hash = window.location.hash.slice(1) || '/';

    app.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--muted-text);">Loading...</div>';

    if (hash === '/' || hash === '/curriculum') {
        app.innerHTML = db.home; // db.home is now raw HTML
    } else if (hash.startsWith('/lessons/')) {
        const id = hash.replace('/lessons/', '');
        const lessonHTML = await fetchLessonHTML(id);

        if (lessonHTML) {
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
        } else {
            app.innerHTML = `
            <div style="padding: 5rem; text-align: center">
                <h1 style="color: #e53e3e">404: Lesson HTML not found</h1>
                <a href="#/">Back to Curriculum</a>
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
