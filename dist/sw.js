/** @type {string} */
const CACHE_NAME = 'greek-zero-v4';
/** @type {string[]} */
const LESSON_CACHES = ['pwa-lessons-el-v2', 'pwa-lessons-es-v2'];

/** @type {string[]} */
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './css/variables.css',
    './css/base.css',
    './css/typography.css',
    './css/layout.css',
    './css/components.css',
    './css/lessons.css',
    './app.js',
    './manifest.json',
    './assets/icon.svg',
    './public/data/el/curriculum.json',
    './public/data/es/curriculum.json',
    './public/data/el/search.json',
    './public/data/es/search.json'
];

/**
 * Service Worker Install Event
 * Caches static assets for offline use
 * @param {ExtendableEvent} e 
 */
self.addEventListener('install', (e) => {
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
        const cacheName = e.request.url.includes('/el/') ? 'pwa-lessons-el-v2' :
            e.request.url.includes('/es/') ? 'pwa-lessons-es-v2' : 'pwa-lessons-v2';

        e.respondWith(
            caches.open(cacheName).then(async (cache) => {
                const cachedResponse = await cache.match(e.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                try {
                    const networkResponse = await fetch(e.request);
                    cache.put(e.request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    return new Response(`
                        <div style="padding: 5rem; text-align: center; font-family: sans-serif; line-height: 1.5;">
                            <h1 style="color: #e53e3e; margin-bottom: 1rem;">You are Offline</h1>
                            <p style="color: #757575;">This lesson hasn't been downloaded for offline use.</p>
                            <a href="#/" style="color: inherit; text-decoration: underline; margin-top: 2rem; display: inline-block;">Back to Curriculum</a>
                        </div>
                    `, {
                        headers: {
                            'Content-Type': 'text/html',
                            'X-Offline-Fallback': 'true'
                        }
                    });
                }
            })
        );
        return;
    }

    // Static assets strategy (cache first, fallback to network)
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((response) => response || fetch(e.request))
    );
});
