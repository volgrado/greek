import { initTheme } from './theme.js';
import { updateUIStrings, initI18n } from './i18n.js';
import { loadData } from './data.js';
import { route, initRouter, renderCurriculum } from './router.js';
import { initPWA } from './pwa.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initI18n(route);
    initRouter();
    initPWA();

    if (document.startViewTransition) {
        console.log("🪄 View Transitions API supported and active.");
    } else {
        console.warn("⚠️ View Transitions API NOT supported in this browser.");
    }



    loadData().then(() => {
        route();
    });
});
