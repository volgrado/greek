/** 
 * GREEK PWA - Service Worker
 * Optimized for offline use and App Shell architecture.
 * v18 - Bulletproof Offline Fix
 */

const CONFIG = {
    APP_CACHE_NAME: 'greek-v18',
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
            console.log('[SW] Caching static assets...');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.error('[SW] addAll failed! One of the assets is likely missing:', err);
                // We'll still try to install by doing it one by one if it fails,
                // but for now let's just log it.
                throw err;
            });
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
                    console.log('[SW] Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // 0. App Shell: Navigation requests must survive offline
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(async () => {
                console.log('[SW] Network failed for navigation. serving index.html shell...');
                const cache = await caches.open(CONFIG.APP_CACHE_NAME);
                // Try index.html first, then root / (standard PWA fallback)
                const shell = await cache.match('/index.html', { ignoreSearch: true });
                if (shell) return shell;
                
                const root = await cache.match('/', { ignoreSearch: true });
                if (root) return root;

                // Absolute fallback
                return new Response('Offline: Resource not cached.', { 
                    status: 200, 
                    headers: {'Content-Type': 'text/html'} 
                });
            })
        );
        return;
    }

    // 1. Static Assets: Cache-First strategy for manifests and foundational UI
    const isStatic = STATIC_ASSETS.some(asset => url.pathname === asset || (asset === '/' && url.pathname === '/index.html'));
    
    if (isStatic) {
        e.respondWith(
            caches.match(e.request, { ignoreSearch: true }).then(cached => {
                // Return cache if we have it, otherwise fetch and cache it
                return cached || fetch(e.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CONFIG.APP_CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                }).catch(() => {
                    // Fallback for JS/CSS if everything fails
                    return new Response('', { status: 503 });
                });
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

    // 3. Lesson Data: Custom logic for HTML fragments
    if (url.pathname.includes('/data/') && url.pathname.includes('/lessons/')) {
        const cacheName = `${CONFIG.LESSON_CACHE_PREFIX}${CONFIG.DEFAULT_LANG}-${CONFIG.LESSON_CACHE_VERSION}`;
        e.respondWith(
            caches.match(e.request, { ignoreSearch: true }).then(cached => {
                return cached || fetch(e.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(cacheName).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                }).catch(() => {
                    // Return the "Offline lesson" UI fragment
                    return new Response(`
                        <div class="error-container p-8 text-center" style="font-family: var(--font-ui, sans-serif);">
                            <h1>Offline</h1>
                            <p>Lesson not downloaded yet.</p>
                            <a href="/">Back</a>
                        </div>
                    `, { headers: { 'Content-Type': 'text/html' } });
                });
            })
        );
        return;
    }

    // Default: Cache First
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then(res => res || fetch(e.request).catch(() => new Response('', { status: 404 })))
    );
});
