/**
 * Application entry point: boots subsystems and wires offline status on load.
 */

import { initTheme } from './theme.js';
import { updateUIStrings, initI18n } from './i18n.js';
import { loadData } from './data.js';
import { route, initRouter } from './router.js';
import { initPWA } from './pwa.js';
import { initPractice } from './practice.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initI18n(route);
    initRouter();
    initPWA();
    initPractice();



    loadData().then(() => {
        route();
    });

    // Offline status monitoring
    const offlineIndicator = document.getElementById('offline-indicator');
    const updateOnlineStatus = () => {
        if (offlineIndicator) {
            offlineIndicator.hidden = navigator.onLine;
        }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Initial check
});
