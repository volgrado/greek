import { state } from './state.js';
import { I18N } from './config.js';


export const initPWA = () => {
    const downloadToggle = document.getElementById('download-toggle');
    if (downloadToggle) {
        downloadToggle.addEventListener('click', async () => {
            if (!state.db || !state.db.structure) return;

            downloadToggle.style.opacity = '0.5';
            if (downloadStatusText) downloadStatusText.textContent = "Downloading...";

            const lessons = state.getFlatLessons();
            const lang = state.currentLang;
            const cacheName = `pwa-lessons-${lang}-v2`;
            const urlsToCache = lessons.map(l => `${I18N[lang].lessonsPath}${l.id}.html`);

            try {
                const cache = await caches.open(cacheName);
                await cache.addAll(urlsToCache);

                const oldIcon = downloadToggle.innerHTML;
                const label = downloadToggle.querySelector('span');
                const originalLabelText = label ? label.textContent : '';

                downloadToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' + (label ? `<span>Done</span>` : '');
                downloadToggle.style.opacity = '1';
                state.isDownloaded = true;

                setTimeout(() => {
                    downloadToggle.innerHTML = oldIcon;
                }, 3000);
            } catch (e) {
                console.error("Download failed", e);
                downloadToggle.style.opacity = '1';
                if (downloadStatusText) downloadStatusText.textContent = "Error";
            }
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { type: 'module' }).then(reg => {
            // Service Worker registered successfully.

            // If there's a waiting SW, let's force it to activate (optional safety, but skipWaiting in SW is better)
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // A new SW was just installed during this session! 
                        // It will take over because of skipWaiting().
                        console.log("New Service Worker installed.");
                    }
                });
            });
        });

        // We removed the auto-reload on controllerchange to avoid infinite HMR loops (especially on Hard Refreshes).
        // The new Service Worker will quietly take over all subsequent fetches.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("[PWA] Service Worker took over. Next navigation will use newest code.");
        });
    }

    // Initial check needs to wait for DB schema to be loaded
    const updateDownloadStatus = async () => {
        state.isDownloaded = await state.checkDownloadStatus();
    };

    if (state.db) {
        updateDownloadStatus();
    }
    state.subscribe('db', updateDownloadStatus);
};
