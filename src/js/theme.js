import { state } from './state.js';

const themeToggle = document.getElementById('theme-toggle');
const themes = ['light', 'dark', 'sepia'];

const themeIcons = {
    light: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', // Sun
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>', // Moon
    sepia: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>' // Book
};

export const applyTheme = (theme) => {
    document.documentElement.classList.remove('dark-mode', 'sepia-mode');
    if (theme !== 'light') {
        document.documentElement.classList.add(`${theme}-mode`);
    }
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerHTML = themeIcons[theme];
};

export const initTheme = () => {
    // 1. Subscribe to changes via our new Proxy Signal
    state.subscribe('currentTheme', (theme) => {
        applyTheme(theme);
        localStorage.setItem('theme', theme);
        localStorage.setItem('dark-mode', theme === 'dark');
    });

    // 2. Initial paint
    applyTheme(state.currentTheme);

    // 3. User interaction just modifies the reactive variable
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const nextThemeIndex = (themes.indexOf(state.currentTheme) + 1) % themes.length;
            // Modifying state natively triggers the Signal Proxy to re-render DOM
            state.currentTheme = themes[nextThemeIndex];
        });
    }
};
