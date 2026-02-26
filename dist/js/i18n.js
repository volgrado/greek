import { state } from './state.js';
import { I18N } from './config.js';
import { loadData } from './data.js';

const langToggle = document.getElementById('lang-toggle');
const langLabel = document.getElementById('lang-label');
const themeToggle = document.getElementById('theme-toggle');
const downloadToggle = document.getElementById('download-toggle');
const footer = document.getElementById('footer');
const logoText = document.getElementById('logo-text');
const logoSymbol = document.getElementById('logo-symbol');
const searchBtn = document.getElementById('search-btn');

export const updateUIStrings = () => {
    if (!I18N[state.currentLang]) state.currentLang = 'el';
    const strings = I18N[state.currentLang];

    document.documentElement.lang = state.currentLang;
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

export const resetProgress = (linkElement) => {
    const strings = I18N[state.currentLang];

    if (linkElement.textContent === strings.resetProgress) {
        linkElement.textContent = strings.resetConfirm;
        linkElement.style.color = '#e53e3e';
        linkElement.style.opacity = '1';

        setTimeout(() => {
            linkElement.textContent = strings.resetProgress;
            linkElement.style.color = 'inherit';
            linkElement.style.opacity = '0.5';
        }, 3000);
        return;
    }

    state.viewedLessons.clear();
    localStorage.removeItem('viewed');
    linkElement.textContent = 'Done!';

    if (window.location.hash === '#/' || window.location.hash === '' || window.location.hash === '#/curriculum') {
        window.dispatchEvent(new Event('hashchange'));
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
        window.location.hash = '#/';
        if (routeFn) routeFn();
    });

    // 2. Initial string paint
    updateUIStrings();

    // 3. User interaction just modifies the reactive variable
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const nextLang = state.currentLang === 'el' ? 'es' : 'el';
            state.lessonCache = {};
            // Modifying state natively triggers the Signal Proxy to fetch data and re-render DOM
            state.currentLang = nextLang;
        });
    }
};
