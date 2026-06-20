import { state } from './state.js';
import { I18N, CONFIG } from './config.js';


export const initPWA = () => {
    const downloadToggle = document.getElementById('download-toggle');
    const downloadStatusText = document.getElementById('download-status-text');

    if (downloadToggle) {
        downloadToggle.addEventListener('click', async () => {
            if (!state.db || !state.db.structure) return;

            downloadToggle.classList.add('is-loading');
            downloadToggle.disabled = true;

            const lessons = state.getFlatLessons();
            const lang = state.currentLang;
            const lessonCacheName = `${CONFIG.LESSON_CACHE_PREFIX}${lang}-${CONFIG.LESSON_CACHE_VERSION}`;

            const urlsToCache = lessons.map(l => `${I18N[lang].lessonsPath}${l.id}.html`);
            
            // Phase 1: Download Lessons
            let count = 0;
            const total = urlsToCache.length;

            try {
                const lessonCache = await caches.open(lessonCacheName);

                for (const url of urlsToCache) {
                    count++;
                    if (downloadStatusText) downloadStatusText.textContent = `Downloading ${count}/${total}...`;
                    
                    // Fetch and cache the lesson
                    const response = await fetch(url);
                    if (response.ok) {
                        await lessonCache.put(url, response.clone());
                    }
                }

                if (downloadStatusText) downloadStatusText.textContent = "Offline Ready";
                downloadToggle.classList.remove('is-loading');
                downloadToggle.classList.add('is-done');
                state.isDownloaded = true;

                setTimeout(() => {
                    downloadToggle.classList.remove('is-done');
                    downloadToggle.disabled = false;
                }, 3000);
            } catch (e) {
                console.error("Download failed", e);
                if (downloadStatusText) downloadStatusText.textContent = "Error";
                downloadToggle.classList.remove('is-loading');
                downloadToggle.disabled = false;
            }
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // Registered. The SW calls skipWaiting()/clients.claim(), so an
            // updated worker takes over fetches on the next navigation.
        });

        // Intentionally no reload on 'controllerchange': a new worker takes over
        // quietly to avoid reload loops on hard refreshes.
    }

    const updateDownloadStatusUI = (isDownloaded) => {
        if (!downloadToggle) return;
        
        if (isDownloaded) {
            if (downloadStatusText) downloadStatusText.textContent = "Offline Ready";
            downloadToggle.classList.add('is-done');
        } else {
            if (downloadStatusText) downloadStatusText.textContent = "";
            downloadToggle.classList.remove('is-done');
        }
    };

    // Check status whenever library or language changes
    const runCheck = async () => {
        state.isDownloaded = await state.checkDownloadStatus();
    };

    if (state.db) runCheck();
    state.subscribe('db', runCheck);
    state.subscribe('currentLang', runCheck);
    state.subscribe('isDownloaded', updateDownloadStatusUI);
};
