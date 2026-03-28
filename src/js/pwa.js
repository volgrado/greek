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
            const staticCacheName = CONFIG.APP_CACHE_NAME;

            const urlsToCache = lessons.map(l => `${I18N[lang].lessonsPath}${l.id}.html`);
            
            // Phase 1: Download Lessons
            let count = 0;
            const total = urlsToCache.length;

            try {
                const lessonCache = await caches.open(lessonCacheName);
                const staticCache = await caches.open(staticCacheName);

                for (const url of urlsToCache) {
                    count++;
                    if (downloadStatusText) downloadStatusText.textContent = `Downloading ${count}/${total}...`;
                    
                    // Fetch and cache the lesson
                    const response = await fetch(url);
                    if (response.ok) {
                        await lessonCache.put(url, response.clone());
                        
                        // Phase 2: Scrape for media (Audio/VTT)
                        const html = await response.text();
                        const audioMatch = html.match(/src="([^"]+\.mp3)"/);
                        if (audioMatch) {
                            const audioUrl = audioMatch[1];
                            const vttUrl = audioUrl.replace('.mp3', '.vtt');
                            
                            // Download audio and vtt into static cache
                            try {
                                const audioRes = await fetch(audioUrl);
                                if (audioRes.ok) await staticCache.put(audioUrl, audioRes);
                                
                                const vttRes = await fetch(vttUrl);
                                if (vttRes.ok) await staticCache.put(vttUrl, vttRes);
                            } catch (err) {
                                console.warn("Media download failed", audioUrl, err);
                            }
                        }
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
