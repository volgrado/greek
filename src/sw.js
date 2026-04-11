/** 
 * GREEK PWA - Service Worker
 * Optimized for offline use and App Shell architecture.
 * v20 - Master Shell Fallback Fix (SPA Sub-path support)
 */

const CONFIG = {
    APP_CACHE_NAME: 'greek-v20',
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
    '/css/mode-switcher.css',
    '/css/utilities.css',
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

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CONFIG.APP_CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets v20...');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
    const WHITELIST = [CONFIG.APP_CACHE_NAME, 'pwa-fonts-v1', ...LESSON_CACHES];
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (!WHITELIST.includes(key)) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // 0. App Shell: SPA Navigation Fallback for ANY sub-path
    if (e.request.mode === 'navigate') {
        e.respondWith((async () => {
            const cache = await caches.open(CONFIG.APP_CACHE_NAME);
            
            // 1. Try exact URL match (e.g. for / or /index.html)
            let response = await cache.match(e.request, { ignoreSearch: true });
            
            // 2. ABSOLUTE GLOBAL FALLBACK: if we are on /lessons/x, we must return the master index.html
            // We use the full URL to ensure matching succeeds regardless of current path.
            if (!response) {
                const shellUrl = new URL('/index.html', self.location.origin).href;
                response = await cache.match(shellUrl, { ignoreSearch: true });
            }

            // 3. Last resort: try just '/'
            if (!response) {
                const rootUrl = new URL('/', self.location.origin).href;
                response = await cache.match(rootUrl, { ignoreSearch: true });
            }

            if (response) {
                // Background update the cache for the specific URL being requested
                fetch(e.request).then(res => {
                    if (res.status === 200) cache.put(e.request, res.clone());
                }).catch(() => {});
                
                return response;
            }

            // If absolutely nothing is in cache, try network and fallback to a string
            return fetch(e.request).catch(() => {
                return new Response('Offline: App shell not found.', { 
                    status: 200, 
                    headers: {'Content-Type': 'text/html'} 
                });
            });
        })());
        return;
    }

    // 1. Static Assets: Cache-First
    const isStatic = STATIC_ASSETS.some(asset => url.pathname === asset || (asset === '/' && url.pathname === '/index.html'));
    if (isStatic) {
        e.respondWith(
            caches.match(e.request, { ignoreSearch: true }).then(cached => {
                return cached || fetch(e.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CONFIG.APP_CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                }).catch(() => new Response('', { status: 503 }));
            })
        );
        return;
    }

    // 2. Font & Media: Cache-First
    if (url.origin.includes('fonts.') || 
        url.pathname.includes('/assets/audio/') || 
        url.pathname.includes('/assets/images/')) {
        
        e.respondWith(
            caches.match(e.request, { ignoreSearch: true }).then(cached => {
                return cached || fetch(e.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        const cacheName = url.origin.includes('fonts') ? 'pwa-fonts-v1' : CONFIG.APP_CACHE_NAME;
                        caches.open(cacheName).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                }).catch(() => new Response('', { status: 404 }));
            })
        );
        return;
    }

    // 3. Lesson Data: Stale-While-Revalidate
    if (url.pathname.includes('/data/') && url.pathname.includes('/lessons/')) {
        const cacheName = `${CONFIG.LESSON_CACHE_PREFIX}${CONFIG.DEFAULT_LANG}-${CONFIG.LESSON_CACHE_VERSION}`;
        e.respondWith(
            caches.match(e.request, { ignoreSearch: true }).then(cached => {
                const network = fetch(e.request).then(res => {
                    if (res.status === 200) {
                        const clone = res.clone();
                        caches.open(cacheName).then(c => c.put(e.request, clone));
                    }
                    return res;
                }).catch(() => null);

                return cached || network || new Response('Offline Content Non-existent.', { status: 200 });
            })
        );
        return;
    }

    // Default: Cache First
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then(res => res || fetch(e.request))
    );
});
