import { getFlatLessons, getLessonNavigation } from './js/lesson-utils.js';
import { matchLessonPath } from './js/route-utils.js';
import { CONFIG, I18N } from './js/config.js';

/** @type {string} */
const CACHE_NAME = CONFIG.APP_CACHE_NAME;
/** @type {string[]} */
const LESSON_CACHES = Object.keys(I18N).map(lang => `${CONFIG.LESSON_CACHE_PREFIX}${lang}-${CONFIG.LESSON_CACHE_VERSION}`);

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/css/variables.css',
    '/css/base.css',
    '/css/typography.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/tables.css',
    '/css/skeletons.css',
    '/css/search.css',
    '/css/checklist.css',
    '/css/callouts.css',
    '/css/progress.css',
    '/css/footer.css',
    '/css/lessons.css',
    '/css/errors.css',
    '/css/transitions.css',
    '/js/main.js',
    '/js/config.js',
    '/js/state.js',
    '/js/data.js',
    '/js/theme.js',
    '/js/i18n.js',
    '/js/search.js',
    '/js/router.js',
    '/js/pwa.js',
    '/js/lesson-utils.js',
    '/js/route-utils.js',
    '/manifest.json',
    '/assets/icon.svg',
    '/public/data/el/curriculum.json'
];

/**
 * Service Worker Install Event
 * Caches static assets for offline use
 * @param {ExtendableEvent} e 
 */
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

/**
 * Service Worker Activate Event
 * Cleans up old caches to ensure the latest version is used
 * @param {ExtendableEvent} e 
 */
self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
    const WHITELIST = [CACHE_NAME, 'pwa-fonts-v1', ...LESSON_CACHES];
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (!WHITELIST.includes(key)) {
                    console.log('[Service Worker] Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

/**
 * Service Worker Fetch Event
 * Implements caching strategies for static and dynamic assets
 * @param {FetchEvent} e 
 */
self.addEventListener('fetch', (e) => {
    // Font caching strategy for Google Fonts
    if (e.request.url.startsWith('https://fonts.googleapis.com') ||
        e.request.url.startsWith('https://fonts.gstatic.com')) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                return cached || fetch(e.request).then(response => {
                    const clone = response.clone();
                    caches.open('pwa-fonts-v1').then(cache => cache.put(e.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Dynamic caching for lesson data (specifically HTML fragments in data folder)
    if (e.request.url.includes('/data/') && e.request.url.includes('/lessons/')) {
        const lang = CONFIG.DEFAULT_LANG;
        const cacheName = `${CONFIG.LESSON_CACHE_PREFIX}${lang}-${CONFIG.LESSON_CACHE_VERSION}`;

        e.respondWith((async () => {
            const cache = await caches.open(cacheName);
            let response = await cache.match(e.request);

            if (!response) {
                try {
                    response = await fetch(e.request);
                    cache.put(e.request, response.clone());
                } catch (error) {
                    return new Response(`
                        <div class="error-container p-8 text-center" style="font-family: var(--font-ui, sans-serif); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: var(--bg, #fff); color: var(--text, #000);">
                            <h1 style="font-size: 2rem; margin-bottom: 1rem;">Offline</h1>
                            <p style="opacity: 0.7; margin-bottom: 2rem; max-width: 300px;">This lesson content hasn't been downloaded for offline use yet.</p>
                            <a href="/" style="display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; border: 1px solid currentColor; text-decoration: none; color: inherit; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;">Back to Curriculum</a>
                        </div>
                    `, {
                        headers: {
                            'Content-Type': 'text/html',
                            'X-Offline-Fallback': 'true'
                        }
                    });
                }
            }

            return response;
        })());
        return;
    }

    // Static assets strategy (cache first, fallback to network)
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((response) => response || fetch(e.request))
    );
});
