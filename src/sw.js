/** 
 * GREEK PWA - Service Worker
 * Optimized for offline use and App Shell architecture.
 */

// Inlined config for SW compatibility (Classic Script mode)
const CONFIG = {
    APP_CACHE_NAME: 'greek-v17',
    LESSON_CACHE_PREFIX: 'pwa-lessons-',
    LESSON_CACHE_VERSION: 'v2',
    DEFAULT_LANG: 'el'
};

const I18N_LANGS = ['el'];
const LESSON_CACHES = I18N_LANGS.map(lang => `${CONFIG.LESSON_CACHE_PREFIX}${lang}-${CONFIG.LESSON_CACHE_VERSION}`);

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
    '/css/checklist.css',
    '/css/callouts.css',
    '/css/progress.css',
    '/css/footer.css',
    '/css/lessons.css',
    '/css/errors.css',
    '/css/transitions.css',
    '/js/config.js',
    '/js/lesson-utils.js',
    '/js/route-utils.js',
    '/js/state.js',
    '/js/theme.js',
    '/js/i18n.js',
    '/js/data.js',
    '/js/karaoke.js',
    '/js/router.js',
    '/js/pwa.js',
    '/js/main.js',
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
        caches.open(CONFIG.APP_CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

/**
 * Service Worker Activate Event
 * Cleans up old caches to ensure the latest version is used
 * @param {ExtendableEvent} e 
 */
self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
    const WHITELIST = [CONFIG.APP_CACHE_NAME, 'pwa-fonts-v1', ...LESSON_CACHES];
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
 * Implements caching strategies:
 * - Fonts & Media: Cache-First
 * - Static Assets: Stale-While-Revalidate
 * - Lessons: Dynamic Cache-First with fallback
 * @param {FetchEvent} e 
 */
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // 0. App Shell: Handle navigation requests by serving index.html
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => {
                return caches.match('/index.html', { ignoreSearch: true }).then(response => {
                    return response || caches.match('/', { ignoreSearch: true });
                }).then(res => res || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
            })
        );
        return;
    }

    // 1. Font & Media caching strategy (Cache-First)
    if (url.origin === 'https://fonts.googleapis.com' || 
        url.origin === 'https://fonts.gstatic.com' ||
        url.pathname.includes('/assets/audio/') || 
        url.pathname.includes('/assets/images/')) {
        
        e.respondWith(
            caches.match(e.request, { ignoreSearch: true }).then(cached => {
                return cached || fetch(e.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') return response;
                    const clone = response.clone();
                    const cacheName = url.origin.includes('fonts') ? 'pwa-fonts-v1' : CONFIG.APP_CACHE_NAME;
                    caches.open(cacheName).then(cache => cache.put(e.request, clone));
                    return response;
                }).catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' }));
            })
        );
        return;
    }

    // 2. Dynamic caching for lesson data (specifically HTML fragments in data folder)
    if (url.pathname.includes('/data/') && url.pathname.includes('/lessons/')) {
        const lang = CONFIG.DEFAULT_LANG;
        const cacheName = `${CONFIG.LESSON_CACHE_PREFIX}${lang}-${CONFIG.LESSON_CACHE_VERSION}`;

        e.respondWith((async () => {
            const cache = await caches.open(cacheName);
            let response = await cache.match(e.request, { ignoreSearch: true });

            if (!response) {
                try {
                    response = await fetch(e.request);
                    if (response && response.status === 200) {
                        cache.put(e.request, response.clone());
                    }
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

    // 3. Static assets strategy (Stale-While-Revalidate)
    const isStatic = STATIC_ASSETS.some(asset => url.pathname === asset || (asset === '/' && url.pathname === '/index.html'));
    
    if (isStatic) {
        e.respondWith(
            caches.open(CONFIG.APP_CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(e.request, { ignoreSearch: true });
                const networkFetch = fetch(e.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(e.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => null);

                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return networkFetch.then(res => res || new Response('', { 
                    status: 503, 
                    statusText: 'Service Unavailable',
                    headers: new Headers({'Content-Type': 'application/javascript'}) 
                }));
            })
        );
        return;
    }

    // Default: Cache First, Fallback to Network
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((response) => {
            return response || fetch(e.request).catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' }));
        })
    );
});
