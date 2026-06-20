/**
 * GREEK PWA — Service Worker
 *
 * Offline-first app shell with per-route caching strategies. No dependencies.
 *
 * Cache versioning is automatic: scripts/build.py replaces __BUILD_ID__ with a
 * content hash, so every content change produces new cache names and the
 * activate handler purges the stale ones. No manual version bump required.
 */

const BUILD_ID = '__BUILD_ID__';
const LANG = 'el';

// Cache names. The lessons cache must stay in sync with src/js/config.js, which
// the offline-download feature in pwa.js writes to.
const CACHES = {
    app: `greek-app-${BUILD_ID}`,
    lessons: `greek-lessons-${LANG}-v2`,
    fonts: 'greek-fonts-v1',
};
const CURRENT_CACHES = Object.values(CACHES);

// App shell + static assets precached on install.
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/config.js',
    '/js/lesson-utils.js',
    '/js/route-utils.js',
    '/js/state.js',
    '/js/theme.js',
    '/js/i18n.js',
    '/js/data.js',
    '/js/router.js',
    '/js/pwa.js',
    '/js/practice.js',
    '/js/main.js',
    '/manifest.json',
    '/assets/icon.svg',
    `/public/data/${LANG}/curriculum.json`,
];
const PRECACHE_PATHS = new Set(PRECACHE_URLS);

// --- Caching strategies -----------------------------------------------------

// Serve from cache; on miss, fetch and cache. For immutable/static assets.
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
        return response;
    } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
    }
}

// Try network first, cache the result, fall back to cache offline. For content
// that should be fresh when online (the curriculum).
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
        return response;
    } catch {
        return (await caches.match(request, { ignoreSearch: true }))
            || new Response('', { status: 504, statusText: 'Offline' });
    }
}

// Serve cache immediately and refresh it in the background. For lesson content.
async function staleWhileRevalidate(request, cacheName) {
    const cached = await caches.match(request, { ignoreSearch: true });
    const network = fetch(request).then(async (response) => {
        if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
        return response;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504, statusText: 'Offline' });
}

// Navigation: return the cached app shell for any path (SPA routing happens
// client-side), refreshing it in the background.
async function appShell(request) {
    const cache = await caches.open(CACHES.app);
    const shell = await cache.match(request, { ignoreSearch: true })
        || await cache.match('/index.html', { ignoreSearch: true })
        || await cache.match('/', { ignoreSearch: true });
    if (shell) {
        fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); }).catch(() => {});
        return shell;
    }
    return fetch(request).catch(() => new Response('Offline: app shell unavailable.', {
        status: 200, headers: { 'Content-Type': 'text/html' },
    }));
}

// --- Routing ----------------------------------------------------------------

const isFont = (url) => url.origin.includes('fonts.') || url.pathname.includes('/assets/fonts/');
const isImage = (url) => url.pathname.includes('/assets/images/');
const isLesson = (url) => url.pathname.includes('/data/') && url.pathname.includes('/lessons/');
const isCurriculum = (url) => url.pathname.endsWith('/curriculum.json');
const isPrecached = (url) => PRECACHE_PATHS.has(url.pathname)
    || (url.pathname === '/index.html' && PRECACHE_PATHS.has('/'));

function handle(request) {
    if (request.mode === 'navigate') return appShell(request);

    const url = new URL(request.url);
    if (isCurriculum(url)) return networkFirst(request, CACHES.app);
    if (isLesson(url)) return staleWhileRevalidate(request, CACHES.lessons);
    if (isFont(url)) return cacheFirst(request, CACHES.fonts);
    if (isImage(url) || isPrecached(url)) return cacheFirst(request, CACHES.app);

    // Unknown GETs: prefer cache, fall back to network, but don't pollute caches.
    return caches.match(request, { ignoreSearch: true }).then((c) => c || fetch(request));
}

// --- Lifecycle --------------------------------------------------------------

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHES.app).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => !CURRENT_CACHES.includes(n)).map((n) => caches.delete(n)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(handle(event.request));
});
