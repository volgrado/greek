import { state } from './state.js';
import { I18N } from './config.js';
import { loadData } from './data.js';

// Element selection helpers (using dynamic lookups to avoid nulls at module load time)
const getEl = (id) => document.getElementById(id);

export const updateUIStrings = () => {
    const langLabel = getEl('lang-label');
    const themeToggle = getEl('theme-toggle');
    const footerRoot = getEl('footer-root');
    const modeLabel = getEl('mode-label');
    const downloadStatusText = getEl('download-status-text');
    const downloadToggle = getEl('download-toggle');
    if (!I18N[state.currentLang]) state.currentLang = 'el';
    const strings = I18N[state.currentLang];

    document.documentElement.lang = state.currentLang;
    if (langLabel) langLabel.textContent = strings.label;
    if (themeToggle) themeToggle.title = strings.themeToggle;
    if (footerRoot) {
        const downloadLabel = getEl('footer-download-label');
        const clearLabel = getEl('footer-clear-label');
        const courseName = getEl('footer-course-name');

        if (downloadLabel) downloadLabel.textContent = strings.downloadToggle;
        if (clearLabel) clearLabel.textContent = strings.resetProgress;
        if (courseName) courseName.textContent = strings.courseName;

        if (downloadStatusText) {
            downloadStatusText.textContent = state.isDownloaded ? "Offline Ready" : "Ready to Download";
            downloadToggle.classList.toggle('is-downloaded', state.isDownloaded);
        }
    }

    if (modeLabel) {
        // Show what the NEXT mode will be
        modeLabel.textContent = state.viewMode === 'grammar' ? "LEXIS" : "GRAMMAR";
    }

    document.title = strings.title;
    const logoSymbol = getEl('logo-symbol');
    const logoText = getEl('logo-text');
    const searchBtn = getEl('search-btn');

    if (logoText) logoText.textContent = strings.title;
    if (logoSymbol) logoSymbol.textContent = strings.symbol;
    if (searchBtn) searchBtn.title = "Search Lessons";
};

export const resetProgress = (linkElement) => {
    const strings = I18N[state.currentLang];
    const clearLabel = linkElement.querySelector('span') || linkElement;
    if (clearLabel.textContent === strings.resetProgress) {
        clearLabel.textContent = strings.resetConfirm;
        linkElement.classList.add('active-warning'); // Visual feedback if needed

        setTimeout(() => {
            clearLabel.textContent = strings.resetProgress;
            linkElement.classList.remove('active-warning');
        }, 3000);
        return;
    }

    state.clearViewed();
    clearLabel.textContent = 'Done!';

    if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '/curriculum') {
        const routeFn = window._route; // Get globally if needed or pass it
        if (state.db && routeFn) routeFn();
    }

    setTimeout(() => {
        updateUIStrings();
    }, 1500);
};

export const initI18n = (routeFn) => {
    // 1. Subscribe to changes via our new Proxy Signal
    state.subscribe('currentLang', async (lang) => {
        localStorage.setItem('lang', lang);
        updateUIStrings();
        await loadData();

        if (window.navigation) window.navigation.navigate('/');
        else window.location.href = '/';

        if (routeFn) routeFn();
    });

    // 2. Initial string paint
    updateUIStrings();

    // 3. User interaction just modifies the reactive variable
    const langToggle = getEl('lang-toggle');
    const modeSwitchBtn = getEl('mode-switch-btn');
    const clearProgressBtn = getEl('clear-progress');

    const handleModeSwitch = (newMode) => {
        state.viewMode = newMode;
        localStorage.setItem('viewMode', newMode);
        updateUIStrings();

        // If inside a lesson, return to curriculum
        if (window.location.pathname.includes('/lessons/')) {
            if (window.navigation) window.navigation.navigate('/');
            else window.location.href = '/';
        } else {
            routeFn();
        }
    };

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const nextLang = state.currentLang === 'el' ? 'es' : 'el';
            state.lessonCache = {};
            state.currentLang = nextLang;
        });
    }

    if (modeSwitchBtn) {
        modeSwitchBtn.addEventListener('click', () => {
            const nextMode = state.viewMode === 'grammar' ? 'vocabulary' : 'grammar';
            handleModeSwitch(nextMode);
        });

        // Sync updates from other tabs
        state.subscribe('viewMode', (mode) => {
            updateUIStrings();
            routeFn();
        });
    }

    state.subscribe('isDownloaded', () => {
        updateUIStrings();
    });

    if (clearProgressBtn) {
        clearProgressBtn.addEventListener('click', (e) => {
            resetProgress(clearProgressBtn);
        });
    }
};
