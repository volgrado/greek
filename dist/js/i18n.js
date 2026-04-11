// Imports removed for classic script compatibility

// Element selection helpers (using dynamic lookups to avoid nulls at module load time)
const getEl = (id) => document.getElementById(id);

const updateUIStrings = () => {
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
        // Show what the CURRENT mode is
        if (state.viewMode === 'grammar') {
            modeLabel.textContent = strings.grammar?.toUpperCase() || "G";
        } else if (state.viewMode === 'vocabulary') {
            modeLabel.textContent = strings.vocabulary?.toUpperCase() || "L";
        } else {
            modeLabel.textContent = strings.exercises?.toUpperCase() || "P";
        }
    }

    document.title = strings.title;
    const logoSymbol = getEl('logo-symbol');
    const logoText = getEl('logo-text');
    if (logoText) logoText.textContent = strings.title;
    if (logoSymbol) logoSymbol.textContent = strings.symbol;
};

const resetProgress = (linkElement, routeFn) => {
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
        if (state.db && routeFn) routeFn();
    }

    setTimeout(() => {
        updateUIStrings();
    }, 1500);
};

const initI18n = (routeFn) => {
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


    const modeMenu = getEl('mode-menu');

    if (modeSwitchBtn && modeMenu) {
        // 1. Positioning & Collision Detection
        modeMenu.addEventListener('beforetoggle', (e) => {
            if (e.newState === 'open') {
                const rect = modeSwitchBtn.getBoundingClientRect();
                const menuWidth = 124; 
                
                // Align to right of button by default
                let left = rect.right - menuWidth;
                
                // Collision detection: keep on screen
                if (left < 16) left = 16;
                if (left + menuWidth > window.innerWidth - 16) {
                    left = window.innerWidth - menuWidth - 16;
                }

                modeMenu.style.left = `${left}px`;
                modeMenu.style.top = `${rect.bottom + 4}px`;

                // Highlight active item
                modeMenu.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.mode === state.viewMode);
                });
            }
        });

        // 2. Selection Logic
        modeMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                handleModeSwitch(item.dataset.mode);
                if (modeMenu.hidePopover) modeMenu.hidePopover();
            });
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
            resetProgress(clearProgressBtn, routeFn);
        });
    }
};
